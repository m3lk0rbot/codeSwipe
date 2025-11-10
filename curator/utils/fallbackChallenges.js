/**
 * Fallback Challenge System
 * Provides predefined challenges when AI generation fails
 */

import { fallbackCache, performanceBenchmark } from './cacheManager.js';

/**
 * Predefined challenge templates organized by language and difficulty
 */
const FALLBACK_CHALLENGES = {
  JavaScript: {
    Beginner: [
      {
        title: "Sum Two Numbers",
        description: "Write a function that takes two numbers and returns their sum.",
        starterCode: "function sum(a, b) {\n  // Your code here\n}",
        solution: "function sum(a, b) {\n  return a + b;\n}",
        testCases: [
          { input: { a: 2, b: 3 }, expected: "5" },
          { input: { a: -1, b: 1 }, expected: "0" },
          { input: { a: 0, b: 0 }, expected: "0" }
        ]
      },
      {
        title: "Check Even Number",
        description: "Write a function that returns true if a number is even, false otherwise.",
        starterCode: "function isEven(num) {\n  // Your code here\n}",
        solution: "function isEven(num) {\n  return num % 2 === 0;\n}",
        testCases: [
          { input: { num: 4 }, expected: "true" },
          { input: { num: 7 }, expected: "false" },
          { input: { num: 0 }, expected: "true" }
        ]
      },
      {
        title: "String Length",
        description: "Write a function that returns the length of a string.",
        starterCode: "function getLength(str) {\n  // Your code here\n}",
        solution: "function getLength(str) {\n  return str.length;\n}",
        testCases: [
          { input: { str: "hello" }, expected: "5" },
          { input: { str: "" }, expected: "0" },
          { input: { str: "JavaScript" }, expected: "10" }
        ]
      }
    ],
    Intermediate: [
      {
        title: "Array Sum",
        description: "Write a function that calculates the sum of all numbers in an array.",
        starterCode: "function arraySum(numbers) {\n  // Your code here\n}",
        solution: "function arraySum(numbers) {\n  return numbers.reduce((sum, num) => sum + num, 0);\n}",
        testCases: [
          { input: { numbers: [1, 2, 3, 4] }, expected: "10" },
          { input: { numbers: [-1, 1, -2, 2] }, expected: "0" },
          { input: { numbers: [] }, expected: "0" }
        ]
      },
      {
        title: "Find Maximum",
        description: "Write a function that finds the maximum number in an array.",
        starterCode: "function findMax(numbers) {\n  // Your code here\n}",
        solution: "function findMax(numbers) {\n  return Math.max(...numbers);\n}",
        testCases: [
          { input: { numbers: [1, 5, 3, 9, 2] }, expected: "9" },
          { input: { numbers: [-1, -5, -2] }, expected: "-1" },
          { input: { numbers: [42] }, expected: "42" }
        ]
      },
      {
        title: "Reverse String",
        description: "Write a function that reverses a string.",
        starterCode: "function reverseString(str) {\n  // Your code here\n}",
        solution: "function reverseString(str) {\n  return str.split('').reverse().join('');\n}",
        testCases: [
          { input: { str: "hello" }, expected: "olleh" },
          { input: { str: "JavaScript" }, expected: "tpircSavaJ" },
          { input: { str: "a" }, expected: "a" }
        ]
      }
    ],
    Advanced: [
      {
        title: "Binary Search",
        description: "Implement binary search to find the index of a target value in a sorted array.",
        starterCode: "function binarySearch(arr, target) {\n  // Your code here\n}",
        solution: "function binarySearch(arr, target) {\n  let left = 0, right = arr.length - 1;\n  while (left <= right) {\n    const mid = Math.floor((left + right) / 2);\n    if (arr[mid] === target) return mid;\n    if (arr[mid] < target) left = mid + 1;\n    else right = mid - 1;\n  }\n  return -1;\n}",
        testCases: [
          { input: { arr: [1, 3, 5, 7, 9], target: 5 }, expected: "2" },
          { input: { arr: [1, 3, 5, 7, 9], target: 1 }, expected: "0" },
          { input: { arr: [1, 3, 5, 7, 9], target: 10 }, expected: "-1" }
        ]
      },
      {
        title: "Fibonacci Sequence",
        description: "Write a function that returns the nth number in the Fibonacci sequence.",
        starterCode: "function fibonacci(n) {\n  // Your code here\n}",
        solution: "function fibonacci(n) {\n  if (n <= 1) return n;\n  let a = 0, b = 1;\n  for (let i = 2; i <= n; i++) {\n    [a, b] = [b, a + b];\n  }\n  return b;\n}",
        testCases: [
          { input: { n: 0 }, expected: "0" },
          { input: { n: 5 }, expected: "5" },
          { input: { n: 10 }, expected: "55" }
        ]
      }
    ]
  },
  Python: {
    Beginner: [
      {
        title: "Add Two Numbers",
        description: "Write a function that takes two numbers and returns their sum.",
        starterCode: "def add_numbers(a, b):\n    # Your code here\n    pass",
        solution: "def add_numbers(a, b):\n    return a + b",
        testCases: [
          { input: { a: 2, b: 3 }, expected: "5" },
          { input: { a: -1, b: 1 }, expected: "0" },
          { input: { a: 0, b: 0 }, expected: "0" }
        ]
      },
      {
        title: "Check Odd Number",
        description: "Write a function that returns True if a number is odd, False otherwise.",
        starterCode: "def is_odd(num):\n    # Your code here\n    pass",
        solution: "def is_odd(num):\n    return num % 2 == 1",
        testCases: [
          { input: { num: 3 }, expected: "True" },
          { input: { num: 4 }, expected: "False" },
          { input: { num: 1 }, expected: "True" }
        ]
      }
    ],
    Intermediate: [
      {
        title: "List Average",
        description: "Write a function that calculates the average of numbers in a list.",
        starterCode: "def calculate_average(numbers):\n    # Your code here\n    pass",
        solution: "def calculate_average(numbers):\n    if not numbers:\n        return 0\n    return sum(numbers) / len(numbers)",
        testCases: [
          { input: { numbers: [1, 2, 3, 4] }, expected: "2.5" },
          { input: { numbers: [10, 20, 30] }, expected: "20.0" },
          { input: { numbers: [] }, expected: "0" }
        ]
      },
      {
        title: "Count Vowels",
        description: "Write a function that counts the number of vowels in a string.",
        starterCode: "def count_vowels(text):\n    # Your code here\n    pass",
        solution: "def count_vowels(text):\n    vowels = 'aeiouAEIOU'\n    return sum(1 for char in text if char in vowels)",
        testCases: [
          { input: { text: "hello" }, expected: "2" },
          { input: { text: "Python" }, expected: "1" },
          { input: { text: "xyz" }, expected: "0" }
        ]
      }
    ],
    Advanced: [
      {
        title: "Quick Sort",
        description: "Implement the quicksort algorithm to sort a list of numbers.",
        starterCode: "def quicksort(arr):\n    # Your code here\n    pass",
        solution: "def quicksort(arr):\n    if len(arr) <= 1:\n        return arr\n    pivot = arr[len(arr) // 2]\n    left = [x for x in arr if x < pivot]\n    middle = [x for x in arr if x == pivot]\n    right = [x for x in arr if x > pivot]\n    return quicksort(left) + middle + quicksort(right)",
        testCases: [
          { input: { arr: [3, 1, 4, 1, 5] }, expected: "[1, 1, 3, 4, 5]" },
          { input: { arr: [5, 4, 3, 2, 1] }, expected: "[1, 2, 3, 4, 5]" },
          { input: { arr: [] }, expected: "[]" }
        ]
      }
    ]
  },
  Java: {
    Beginner: [
      {
        title: "Simple Calculator",
        description: "Write a method that adds two integers and returns the result.",
        starterCode: "public class Calculator {\n    public static int add(int a, int b) {\n        // Your code here\n        return 0;\n    }\n}",
        solution: "public class Calculator {\n    public static int add(int a, int b) {\n        return a + b;\n    }\n}",
        testCases: [
          { input: { a: 5, b: 3 }, expected: "8" },
          { input: { a: -2, b: 7 }, expected: "5" },
          { input: { a: 0, b: 0 }, expected: "0" }
        ]
      }
    ],
    Intermediate: [
      {
        title: "Array Maximum",
        description: "Write a method that finds the maximum value in an integer array.",
        starterCode: "public class ArrayUtils {\n    public static int findMax(int[] numbers) {\n        // Your code here\n        return 0;\n    }\n}",
        solution: "public class ArrayUtils {\n    public static int findMax(int[] numbers) {\n        if (numbers.length == 0) return Integer.MIN_VALUE;\n        int max = numbers[0];\n        for (int i = 1; i < numbers.length; i++) {\n            if (numbers[i] > max) max = numbers[i];\n        }\n        return max;\n    }\n}",
        testCases: [
          { input: { numbers: [1, 5, 3, 9, 2] }, expected: "9" },
          { input: { numbers: [-1, -5, -2] }, expected: "-1" },
          { input: { numbers: [42] }, expected: "42" }
        ]
      }
    ]
  }
};

/**
 * Get available languages
 */
export function getAvailableLanguages() {
  return Object.keys(FALLBACK_CHALLENGES);
}

/**
 * Get available difficulties for a language
 */
export function getAvailableDifficulties(language) {
  const challenges = FALLBACK_CHALLENGES[language];
  return challenges ? Object.keys(challenges) : [];
}

// Track recently used challenges to avoid immediate repetition
let recentChallenges = [];
const MAX_RECENT_CHALLENGES = 5;

/**
 * Get fallback challenge based on filters with caching
 */
export function getFallbackChallenge(filters = {}) {
  const operationId = `fallback-${Date.now()}-${Math.random()}`;
  performanceBenchmark.start(operationId);
  
  const { language = 'JavaScript', difficulty = 'Intermediate' } = filters;
  
  // Create cache key based on normalized filters
  const normalizedLanguage = Object.keys(FALLBACK_CHALLENGES).find(
    lang => lang.toLowerCase() === language.toLowerCase()
  ) || 'JavaScript';
  
  const availableDifficulties = getAvailableDifficulties(normalizedLanguage);
  const normalizedDifficulty = availableDifficulties.find(
    diff => diff.toLowerCase() === difficulty.toLowerCase()
  ) || availableDifficulties[0] || 'Beginner';
  
  const cacheKey = `${normalizedLanguage}-${normalizedDifficulty}`;
  
  // Check cache first
  const cachedChallenge = fallbackCache.get(cacheKey);
  if (cachedChallenge) {
    performanceBenchmark.end(operationId, { 
      source: 'cache',
      language: normalizedLanguage,
      difficulty: normalizedDifficulty
    });
    return {
      ...cachedChallenge,
      metadata: {
        ...cachedChallenge.metadata,
        source: 'fallback_cached',
        cacheHit: true
      }
    };
  }
  
  const challenges = FALLBACK_CHALLENGES[normalizedLanguage][normalizedDifficulty];
  
  if (!challenges || challenges.length === 0) {
    // Fallback to JavaScript Beginner if nothing found
    const fallbackChallenges = FALLBACK_CHALLENGES.JavaScript.Beginner;
    const selectedChallenge = fallbackChallenges[Math.floor(Math.random() * fallbackChallenges.length)];
    const result = {
      ...selectedChallenge,
      language: 'JavaScript',
      difficulty: 'Beginner',
      metadata: {
        source: 'fallback',
        originalFilters: filters,
        fallbackReason: 'No challenges available for requested language/difficulty'
      }
    };
    
    performanceBenchmark.end(operationId, { 
      source: 'fallback_default',
      language: 'JavaScript',
      difficulty: 'Beginner'
    });
    
    return result;
  }
  
  // Filter out recently used challenges if we have enough options
  let availableChallenges = challenges;
  if (challenges.length > MAX_RECENT_CHALLENGES) {
    availableChallenges = challenges.filter(challenge => 
      !recentChallenges.some(recent => recent.title === challenge.title)
    );
    
    // If all challenges were recently used, reset the recent list
    if (availableChallenges.length === 0) {
      recentChallenges = [];
      availableChallenges = challenges;
    }
  }
  
  // Select random challenge from available options
  const selectedChallenge = availableChallenges[Math.floor(Math.random() * availableChallenges.length)];
  
  // Add to recent challenges list
  recentChallenges.push({ title: selectedChallenge.title, timestamp: Date.now() });
  if (recentChallenges.length > MAX_RECENT_CHALLENGES) {
    recentChallenges.shift(); // Remove oldest
  }
  
  const result = {
    ...selectedChallenge,
    language: normalizedLanguage,
    difficulty: normalizedDifficulty,
    metadata: {
      source: 'fallback',
      originalFilters: filters,
      fallbackReason: 'AI generation failed',
      cacheHit: false
    }
  };
  
  // Cache the result for future use (shorter TTL for fallbacks)
  fallbackCache.set(cacheKey, result, 10 * 60 * 1000); // 10 minutes
  
  performanceBenchmark.end(operationId, { 
    source: 'generated',
    language: normalizedLanguage,
    difficulty: normalizedDifficulty
  });
  
  return result;
}

/**
 * Validate fallback challenge structure
 */
export function validateFallbackChallenge(challenge) {
  const requiredFields = ['title', 'description', 'starterCode', 'solution', 'testCases'];
  const errors = [];
  
  for (const field of requiredFields) {
    if (!challenge[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // Validate testCases structure
  if (challenge.testCases && Array.isArray(challenge.testCases)) {
    challenge.testCases.forEach((testCase, index) => {
      if (!testCase.input || typeof testCase.input !== 'object') {
        errors.push(`Test case ${index}: invalid input structure`);
      }
      if (testCase.expected === undefined || testCase.expected === null) {
        errors.push(`Test case ${index}: missing expected value`);
      }
    });
  } else {
    errors.push('testCases must be an array');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Format fallback challenge to match expected API response
 */
export function formatFallbackChallenge(challenge) {
  const validation = validateFallbackChallenge(challenge);
  
  if (!validation.isValid) {
    throw new Error(`Invalid fallback challenge: ${validation.errors.join(', ')}`);
  }
  
  return {
    title: challenge.title,
    language: challenge.language,
    difficulty: challenge.difficulty,
    description: challenge.description,
    starterCode: challenge.starterCode,
    solution: challenge.solution,
    testCases: challenge.testCases.map(tc => ({
      input: tc.input,
      expected: String(tc.expected)
    })),
    metadata: {
      ...challenge.metadata,
      timestamp: new Date(),
      generationAttempts: 0,
      parsingMethod: 'fallback'
    }
  };
}

/**
 * Get statistics about available fallback challenges
 */
export function getFallbackStats() {
  const stats = {
    totalChallenges: 0,
    byLanguage: {},
    byDifficulty: {}
  };
  
  for (const [language, difficulties] of Object.entries(FALLBACK_CHALLENGES)) {
    stats.byLanguage[language] = 0;
    
    for (const [difficulty, challenges] of Object.entries(difficulties)) {
      const count = challenges.length;
      stats.totalChallenges += count;
      stats.byLanguage[language] += count;
      
      if (!stats.byDifficulty[difficulty]) {
        stats.byDifficulty[difficulty] = 0;
      }
      stats.byDifficulty[difficulty] += count;
    }
  }
  
  return stats;
}

/**
 * Add custom fallback challenge (for testing or extension)
 */
export function addFallbackChallenge(language, difficulty, challenge) {
  if (!FALLBACK_CHALLENGES[language]) {
    FALLBACK_CHALLENGES[language] = {};
  }
  
  if (!FALLBACK_CHALLENGES[language][difficulty]) {
    FALLBACK_CHALLENGES[language][difficulty] = [];
  }
  
  const validation = validateFallbackChallenge(challenge);
  if (!validation.isValid) {
    throw new Error(`Invalid challenge: ${validation.errors.join(', ')}`);
  }
  
  FALLBACK_CHALLENGES[language][difficulty].push(challenge);
}