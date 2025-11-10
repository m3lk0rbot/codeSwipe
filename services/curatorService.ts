import type { Challenge, TestCase } from '../types';
import { fetchSmartQuestions } from './questionsService';

// Curator service URL - use local in development, Cloud Run in production
const CURATOR_URL = (import.meta as any).env?.DEV
  ? 'http://localhost:8080'
  : 'https://codeswipe-curator-305149132359.europe-west1.run.app';

// Answer Generation Types
export interface AnswerGenerationRequest {
  title: string;
  description: string;
  language: string;
  difficulty: string;
  starterCode: string;
  testCases: TestCase[];
}

export interface AnswerGenerationResponse {
  solution: string;
  explanation?: string;
  confidence?: number;
}

export async function fetchQuestionFromCurator(filters?: {
  level?: string;
  languages?: string[];
  topics?: string[];
}): Promise<Challenge> {
  console.log('🌐 Sending request to curator with filters:', filters);
  const res = await fetch(`${CURATOR_URL}/api/getQuestion`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ filters: filters || {} }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => 'Unknown error');
    throw new Error(`Curator API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  console.log('📦 Received challenge from curator - Difficulty:', data.difficulty);
  return {
    id: data.questionId,
    title: data.title,
    language: data.language,
    difficulty: data.difficulty,
    description: data.description,
    starterCode: data.starterCode,
    testCases: data.testCases,
    solution: data.solution || '', // Solution provided by Curator
  };
}

// Session-based question counter and pattern logic
let sessionQuestionCount = 0;

function getQuestionCounter(): number {
  return sessionQuestionCount;
}

function incrementQuestionCounter(): void {
  sessionQuestionCount++;
}

function shouldFetchFromAI(questionNumber: number): boolean {
  // Alternating pattern: AI → DB → AI → DB → AI → DB → DB → AI
  // Pattern repeats every 8 questions with slight variations
  const patterns = [
    [true, false, true, false, true, false, false, true],   // Base pattern
    [true, false, false, true, false, true, false, true],  // Variation 1
    [false, true, false, true, true, false, true, false],  // Variation 2
  ];
  
  // Choose pattern based on session (adds variety across sessions)
  const patternIndex = Math.floor(Date.now() / (1000 * 60 * 30)) % patterns.length; // Change every 30 minutes
  const pattern = patterns[patternIndex];
  const positionInPattern = questionNumber % pattern.length;
  
  console.log(`🔄 Using pattern ${patternIndex + 1}, position ${positionInPattern + 1}/${pattern.length}`);
  
  return pattern[positionInPattern];
}

// Smart question fetching with alternating pattern
export async function fetchSmartQuestionFromCurator(
  userId?: string,
  filters?: {
    level?: string;
    languages?: string[];
    topics?: string[];
  }
): Promise<Challenge> {
  try {
    console.log('🎯 Using alternating question fetching strategy...');
    
    // Get or initialize question counter for this session
    const questionCount = getQuestionCounter();
    const shouldUseAI = shouldFetchFromAI(questionCount);
    
    console.log(`📊 Question #${questionCount + 1} - Source: ${shouldUseAI ? 'AI (Gemini)' : 'Database'}`);
    
    if (shouldUseAI) {
      // Use AI for fresh content
      console.log('🤖 Generating fresh question via Gemini API...');
      incrementQuestionCounter();
      return await fetchQuestionFromCurator(filters);
    } else {
      // Try database first
      console.log('💾 Fetching question from database...');
      const smartQuestions = await fetchSmartQuestions(1, userId, filters);
      
      if (smartQuestions.length > 0) {
        console.log('✅ Returning question from database');
        incrementQuestionCounter();
        return smartQuestions[0];
      } else {
        // Fallback to AI if no DB questions available
        console.log('🔄 No DB questions available, falling back to Gemini...');
        incrementQuestionCounter();
        return await fetchQuestionFromCurator(filters);
      }
    }
    
  } catch (error) {
    console.error('❌ Smart question fetching failed, falling back to Gemini:', error);
    return await fetchQuestionFromCurator(filters);
  }
}


/**
 * Generate a solution for a given challenge using AI
 * @param challenge - The challenge to generate a solution for
 * @returns Promise<string> - The generated solution code
 * @throws Error if generation fails or times out
 */
export async function generateAnswer(challenge: Challenge): Promise<string> {
  console.log('🤖 Generating answer for challenge:', challenge.title);
  
  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    const requestBody: AnswerGenerationRequest = {
      title: challenge.title,
      description: challenge.description,
      language: challenge.language,
      difficulty: challenge.difficulty,
      starterCode: challenge.starterCode,
      testCases: challenge.testCases,
    };

    const response = await fetch(`${CURATOR_URL}/api/generateAnswer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`Answer generation failed: ${response.status} - ${errorText}`);
    }

    const data: AnswerGenerationResponse = await response.json();
    
    if (!data.solution) {
      throw new Error('No solution returned from server');
    }

    console.log('✅ Answer generated successfully');
    return data.solution;

  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      console.error('❌ Answer generation timed out after 30 seconds');
      throw new Error('Answer generation timed out. Please try again.');
    }
    
    console.error('❌ Answer generation failed:', error);
    throw error;
  }
}