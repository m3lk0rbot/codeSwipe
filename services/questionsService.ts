
import { db } from './firebase';
import { collection, doc, getDoc, setDoc, serverTimestamp, query, limit, getDocs, orderBy, where } from 'firebase/firestore';
import type { Challenge } from '../types';

async function sha256(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Question history tracking for DB mode
const QUESTION_HISTORY_KEY = 'codeswipe_question_history';
const MAX_HISTORY_SIZE = 50;
const HISTORY_RESET_HOURS = 24;

interface QuestionHistory {
  shownQuestionIds: string[];
  lastReset: number;
}

function getQuestionHistory(): QuestionHistory {
  try {
    const stored = localStorage.getItem(QUESTION_HISTORY_KEY);
    if (!stored) {
      return { shownQuestionIds: [], lastReset: Date.now() };
    }
    
    const history: QuestionHistory = JSON.parse(stored);
    
    // Check if history should be reset (after 24 hours)
    const hoursSinceReset = (Date.now() - history.lastReset) / (1000 * 60 * 60);
    if (hoursSinceReset >= HISTORY_RESET_HOURS) {
      console.log('🔄 Resetting question history (24 hours elapsed)');
      return { shownQuestionIds: [], lastReset: Date.now() };
    }
    
    // Check if history exceeds max size
    if (history.shownQuestionIds.length >= MAX_HISTORY_SIZE) {
      console.log('🔄 Resetting question history (50 questions reached)');
      return { shownQuestionIds: [], lastReset: Date.now() };
    }
    
    return history;
  } catch (error) {
    console.warn('Failed to read question history from localStorage:', error);
    return { shownQuestionIds: [], lastReset: Date.now() };
  }
}

function saveQuestionHistory(history: QuestionHistory): void {
  try {
    localStorage.setItem(QUESTION_HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.warn('Failed to save question history to localStorage:', error);
  }
}

export function addQuestionToHistory(questionId: string): void {
  const history = getQuestionHistory();
  
  // Add question ID if not already in history
  if (!history.shownQuestionIds.includes(questionId)) {
    history.shownQuestionIds.push(questionId);
    saveQuestionHistory(history);
    console.log(`📝 Added question to history. Total: ${history.shownQuestionIds.length}`);
  }
}

export function isQuestionInHistory(questionId: string): boolean {
  const history = getQuestionHistory();
  return history.shownQuestionIds.includes(questionId);
}

export function resetQuestionHistoryManual(): void {
  const history: QuestionHistory = { shownQuestionIds: [], lastReset: Date.now() };
  saveQuestionHistory(history);
  console.log('🔄 Question history manually reset');
}

export async function ensureQuestionSaved(challenge: Challenge): Promise<string> {
  const questions = collection(db, 'Questions');
  
  // First, check if a question with the same title and language already exists
  const titleLanguageQuery = query(
    questions,
    where('title', '==', challenge.title),
    where('language', '==', challenge.language),
    limit(1)
  );
  
  try {
    const existingSnapshot = await getDocs(titleLanguageQuery);
    
    if (!existingSnapshot.empty) {
      // Question already exists, return its ID
      const existingDoc = existingSnapshot.docs[0];
      console.log(`✅ Question "${challenge.title}" already exists with ID: ${existingDoc.id}`);
      return existingDoc.id;
    }
  } catch (error) {
    console.warn('Error checking for existing question, proceeding with hash-based approach:', error);
  }
  
  // If no existing question found, create a new one with content hash
  const canonical = {
    title: challenge.title,
    language: challenge.language,
    difficulty: challenge.difficulty,
    description: challenge.description,
    starterCode: challenge.starterCode,
    testCases: challenge.testCases,
    solution: challenge.solution || '', // Store solution for validation
    solutionHash: await sha256(challenge.solution || ''),
  };
  const contentHash = await sha256(JSON.stringify(canonical));
  const qRef = doc(questions, contentHash);
  const snap = await getDoc(qRef);
  
  if (!snap.exists()) {
    console.log(`💾 Saving new question "${challenge.title}" with ID: ${contentHash}`);
    await setDoc(qRef, {
      question_id: contentHash,
      ...canonical,
      source: 'ai-or-mock',
      created_at: serverTimestamp(),
    });
  } else {
    console.log(`✅ Question with hash ${contentHash} already exists`);
  }
  
  return contentHash;
}

export async function fetchRandomQuestions(count: number = 10, userId?: string): Promise<Challenge[]> {
  try {
    const questions = collection(db, 'Questions');
    const q = query(questions, orderBy('created_at', 'desc'), limit(count * 3)); // Get more to filter out solved ones
    const querySnapshot = await getDocs(q);
    
    const allQuestions: Challenge[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      allQuestions.push({
        id: doc.id,
        title: data.title,
        language: data.language,
        difficulty: data.difficulty,
        description: data.description,
        starterCode: data.starterCode,
        testCases: data.testCases || [],
        solution: data.solution || '', // Include solution for validation
      });
    });

    // Filter out solved questions if userId is provided
    let filteredQuestions = allQuestions;
    if (userId) {
      try {
        // Get user's solved question IDs
        const achievementsQuery = query(
          collection(db, 'Achievements'),
          where('user_id', '==', userId)
        );
        const achievementsSnapshot = await getDocs(achievementsQuery);
        const solvedQuestionIds = new Set<string>();
        
        achievementsSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.question_id) {
            solvedQuestionIds.add(data.question_id);
          }
        });

        // Filter out solved questions
        filteredQuestions = allQuestions.filter(question => !solvedQuestionIds.has(question.id));
        
        console.log(`Filtered out ${solvedQuestionIds.size} solved questions from ${allQuestions.length} total questions`);
      } catch (error) {
        console.warn('Error filtering solved questions, showing all questions:', error);
        filteredQuestions = allQuestions;
      }
    }

    // If we don't have enough unsolved questions, fall back to including some solved ones
    if (filteredQuestions.length < count) {
      console.log(`Not enough unsolved questions (${filteredQuestions.length}), including solved ones`);
      filteredQuestions = allQuestions;
    }

    // Shuffle and return requested count
    const shuffled = filteredQuestions.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  } catch (error) {
    console.error('Error fetching random questions:', error);
    // Return fallback questions if database fails
    return getFallbackQuestions(count);
  }
}

// New smart question fetching function with hybrid approach
// Track recently served questions to avoid repetition
let recentlyServedQuestions = new Set<string>();
const MAX_RECENT_QUESTIONS = 10;

function addToRecentQuestions(questionId: string) {
  recentlyServedQuestions.add(questionId);
  if (recentlyServedQuestions.size > MAX_RECENT_QUESTIONS) {
    const firstItem = recentlyServedQuestions.values().next().value;
    if (firstItem) {
      recentlyServedQuestions.delete(firstItem);
    }
  }
}

// Reset function for testing (can be called from console)
export function resetQuestionHistory() {
  recentlyServedQuestions.clear();
  console.log('🔄 Question history cleared');
}

export async function fetchSmartQuestions(
  count: number = 10, 
  userId?: string, 
  userSettings?: { level?: string; languages?: string[]; topics?: string[] }
): Promise<Challenge[]> {
  try {
    console.log('🎯 Fetching smart questions with hybrid approach...');
    
    // Calculate distribution: 70% DB, 30% fresh (adjust based on available questions)
    const dbQuestionCount = Math.max(1, Math.floor(count * 0.7)); // Ensure at least 1
    const freshQuestionCount = count - dbQuestionCount;
    
    console.log(`📊 Target: ${dbQuestionCount} from DB + ${freshQuestionCount} fresh questions`);

    // Step 1: Get unsolved questions from database matching user preferences
    const unsolvedQuestions = await fetchUnsolvedQuestions(dbQuestionCount * 3, userId, userSettings); // Get more for filtering
    
    // Step 2: Filter out recently served questions
    const filteredQuestions = unsolvedQuestions.filter(q => !recentlyServedQuestions.has(q.id));
    
    console.log(`✅ Found ${unsolvedQuestions.length} unsolved questions, ${filteredQuestions.length} after filtering recent ones`);

    // Step 3: Randomly select from filtered questions
    const selectedQuestions = filteredQuestions
      .sort(() => 0.5 - Math.random())
      .slice(0, dbQuestionCount);

    // Step 4: Track selected questions
    selectedQuestions.forEach(q => addToRecentQuestions(q.id));

    // Step 5: If we don't have enough DB questions, adjust the ratio
    const actualDbCount = selectedQuestions.length;
    const actualFreshCount = Math.max(0, count - actualDbCount);
    
    console.log(`🔄 Adjusted: ${actualDbCount} from DB + ${actualFreshCount} fresh questions`);

    // Step 6: For now, fill remaining with random questions (later integrate with Gemini)
    const additionalQuestions = actualFreshCount > 0 
      ? await fetchRandomQuestions(actualFreshCount, userId)
      : [];

    // Step 7: Combine and shuffle
    const allQuestions = [...selectedQuestions, ...additionalQuestions];
    const shuffled = allQuestions.sort(() => 0.5 - Math.random());
    
    console.log(`🎉 Returning ${shuffled.length} smart questions`);
    return shuffled.slice(0, count);

  } catch (error) {
    console.error('❌ Error in smart question fetching, falling back to random:', error);
    return fetchRandomQuestions(count, userId);
  }
}

// Helper function to get unsolved questions matching user preferences
async function fetchUnsolvedQuestions(
  count: number, 
  userId?: string, 
  userSettings?: { level?: string; languages?: string[]; topics?: string[] }
): Promise<Challenge[]> {
  try {
    if (!userId || count <= 0) {
      return fetchRandomQuestions(Math.max(1, count));
    }

    // Get user's solved question IDs first
    const achievementsQuery = query(
      collection(db, 'Achievements'),
      where('user_id', '==', userId)
    );
    const achievementsSnapshot = await getDocs(achievementsQuery);
    const solvedQuestionIds = new Set<string>();
    
    achievementsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.question_id) {
        solvedQuestionIds.add(data.question_id);
      }
    });

    // Build query for unsolved questions matching user preferences
    const questions = collection(db, 'Questions');
    const limitCount = Math.max(1, count * 3); // Get more to filter client-side
    
    // Simplified query - filter by difficulty client-side to avoid index requirements
    let q = query(questions, orderBy('created_at', 'desc'), limit(limitCount));

    const querySnapshot = await getDocs(q);
    const unsolvedQuestions: Challenge[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Skip if user already solved this question
      if (solvedQuestionIds.has(doc.id)) {
        return;
      }

      // Apply filters client-side to avoid complex indexes
      
      // Filter by difficulty if specified
      if (userSettings?.level && data.difficulty !== userSettings.level) {
        return;
      }
      
      // Filter by language if specified
      if (userSettings?.languages && userSettings.languages.length > 0) {
        if (!userSettings.languages.includes(data.language)) {
          return;
        }
      }

      unsolvedQuestions.push({
        id: doc.id,
        title: data.title,
        language: data.language,
        difficulty: data.difficulty,
        description: data.description,
        starterCode: data.starterCode,
        testCases: data.testCases || [],
        solution: data.solution || '', // Include solution for validation
      });
    });

    console.log(`🔍 Found ${unsolvedQuestions.length} unsolved questions matching preferences`);
    return unsolvedQuestions.slice(0, count);

  } catch (error) {
    console.error('Error fetching unsolved questions:', error);
    return [];
  }
}

function getFallbackQuestions(count: number): Challenge[] {
  const fallbackQuestions: Challenge[] = [
    {
      id: "fallback-1",
      title: "Two Sum",
      language: "JavaScript",
      difficulty: "Beginner",
      description: "Given an array of integers and a target sum, return indices of two numbers that add up to the target.",
      starterCode: "function twoSum(nums, target) {\n  // Your code here\n}",
      testCases: [
        { input: { nums: [2, 7, 11, 15], target: 9 }, expected: "[0, 1]" },
        { input: { nums: [3, 2, 4], target: 6 }, expected: "[1, 2]" }
      ],
      solution: ""
    },
    {
      id: "fallback-2",
      title: "Reverse String",
      language: "Python",
      difficulty: "Beginner",
      description: "Write a function that reverses a string.",
      starterCode: "def reverse_string(s):\n    # Your code here\n    pass",
      testCases: [
        { input: { s: "hello" }, expected: "olleh" },
        { input: { s: "world" }, expected: "dlrow" }
      ],
      solution: ""
    },
    {
      id: "fallback-3",
      title: "Binary Search",
      language: "Java",
      difficulty: "Intermediate",
      description: "Implement binary search algorithm to find target in sorted array.",
      starterCode: "public int binarySearch(int[] arr, int target) {\n    // Your code here\n    return -1;\n}",
      testCases: [
        { input: { arr: [1, 3, 5, 7, 9], target: 5 }, expected: "2" },
        { input: { arr: [1, 3, 5, 7, 9], target: 10 }, expected: "-1" }
      ],
      solution: ""
    },
    {
      id: "fallback-4",
      title: "Fibonacci Sequence",
      language: "Go",
      difficulty: "Intermediate",
      description: "Generate the nth Fibonacci number efficiently.",
      starterCode: "func fibonacci(n int) int {\n    // Your code here\n    return 0\n}",
      testCases: [
        { input: { n: 5 }, expected: "5" },
        { input: { n: 10 }, expected: "55" }
      ],
      solution: ""
    },
    {
      id: "fallback-5",
      title: "Valid Parentheses",
      language: "TypeScript",
      difficulty: "Intermediate",
      description: "Determine if the input string has valid parentheses.",
      starterCode: "function isValid(s: string): boolean {\n    // Your code here\n    return false;\n}",
      testCases: [
        { input: { s: "()" }, expected: "true" },
        { input: { s: "([)]" }, expected: "false" }
      ],
      solution: ""
    }
  ];

  return fallbackQuestions.slice(0, count);
}

export async function fetchDatabaseOnlyQuestions(
  userId: string,
  userSettings?: { level?: string; languages?: string[]; topics?: string[] }
): Promise<Challenge> {
  try {
    console.log('🗄️ Fetching question from database only (no API calls)');
    console.log('📋 User settings:', userSettings);

    // Get question history to prevent immediate repetition
    const history = getQuestionHistory();
    console.log(`📚 Question history: ${history.shownQuestionIds.length} questions shown`);

    // Get user's solved question IDs
    const achievementsQuery = query(
      collection(db, 'Achievements'),
      where('user_id', '==', userId)
    );
    const achievementsSnapshot = await getDocs(achievementsQuery);
    const solvedQuestionIds = new Set<string>();
    
    achievementsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.question_id) {
        solvedQuestionIds.add(data.question_id);
      }
    });

    console.log(`🔍 User has solved ${solvedQuestionIds.size} questions`);

    // Fetch questions from database
    const questions = collection(db, 'Questions');
    const q = query(questions, orderBy('created_at', 'desc'), limit(200)); // Get a large pool
    const querySnapshot = await getDocs(q);

    const availableQuestions: Challenge[] = [];
    const availableQuestionsWithHistory: Challenge[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Skip if user already solved this question
      if (solvedQuestionIds.has(doc.id)) {
        return;
      }

      // Apply filters based on user settings
      
      // Filter by difficulty level
      if (userSettings?.level && data.difficulty !== userSettings.level) {
        return;
      }
      
      // Filter by language
      if (userSettings?.languages && userSettings.languages.length > 0) {
        if (!userSettings.languages.includes(data.language)) {
          return;
        }
      }

      // Note: Topics filtering would require topics field in Questions collection
      // For now, we skip topic filtering as it's not in the current schema

      const question: Challenge = {
        id: doc.id,
        title: data.title,
        language: data.language,
        difficulty: data.difficulty,
        description: data.description,
        starterCode: data.starterCode,
        testCases: data.testCases || [],
        solution: data.solution || '', // Include solution for validation
      };

      // Separate questions into those not in history and those in history
      if (!history.shownQuestionIds.includes(doc.id)) {
        availableQuestions.push(question);
      } else {
        availableQuestionsWithHistory.push(question);
      }
    });

    console.log(`✅ Found ${availableQuestions.length} new questions, ${availableQuestionsWithHistory.length} previously shown`);

    // Prefer questions not in history, but fall back to previously shown if needed
    let questionsToChooseFrom = availableQuestions.length > 0 ? availableQuestions : availableQuestionsWithHistory;

    if (questionsToChooseFrom.length === 0) {
      throw new Error('No questions available matching your settings. Try adjusting your preferences or switch to AI mode.');
    }

    // If we're using previously shown questions, reset history
    if (availableQuestions.length === 0 && availableQuestionsWithHistory.length > 0) {
      console.log('🔄 All matching questions have been shown. Resetting history.');
      resetQuestionHistoryManual();
    }

    // Randomly select one question
    const randomIndex = Math.floor(Math.random() * questionsToChooseFrom.length);
    const selectedQuestion = questionsToChooseFrom[randomIndex];

    // Add to history
    addQuestionToHistory(selectedQuestion.id);

    console.log(`🎯 Selected question: ${selectedQuestion.title} (${selectedQuestion.difficulty})`);

    return selectedQuestion;

  } catch (error) {
    console.error('❌ Error fetching database-only question:', error);
    throw error;
  }
}

export async function fetchUniqueLanguages(): Promise<string[]> {
  try {
    const questions = collection(db, 'Questions');
    // Limit to recent questions to get a good sample of languages
    const q = query(questions, orderBy('created_at', 'desc'), limit(100));
    const querySnapshot = await getDocs(q);
    
    const languagesSet = new Set<string>();
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.language && typeof data.language === 'string') {
        languagesSet.add(data.language);
      }
    });

    const uniqueLanguages = Array.from(languagesSet).sort();
    
    if (uniqueLanguages.length > 0) {
      console.log('✅ Fetched unique languages from database:', uniqueLanguages);
      return uniqueLanguages;
    } else {
      console.log('⚠️ No languages found in database, using fallback categories');
      return [];
    }
  } catch (error) {
    console.error('❌ Error fetching unique languages:', error);
    // Return empty array on error - let caller handle fallback
    return [];
  }
}

export async function getQuestionSolution(questionId: string): Promise<string | null> {
  try {
    const questionRef = doc(db, 'Questions', questionId);
    const questionSnap = await getDoc(questionRef);

    if (questionSnap.exists()) {
      const data = questionSnap.data();
      return data.solution || null;
    } else {
      console.warn(`Solution not found for question ID: ${questionId}`);
      return null;
    }
  } catch (error) {
    console.error('Error fetching question solution:', error);
    throw new Error('Failed to fetch solution from database.');
  }
}
