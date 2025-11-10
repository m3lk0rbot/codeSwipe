

/**
 * Enhanced Gemini Service
 * Integrates retry logic, fallback mechanisms, and progressive parsing
 */

import { GoogleGenAI, Type } from '@google/genai';
import { processResponse } from './jsonParsingPipeline.js';
import { retryWithBackoff, createRetryWrapper } from './retryHandler.js';
import { getFallbackChallenge, formatFallbackChallenge } from './fallbackChallenges.js';
import { logApiError, logParsingError, logSuccess } from './errorLogger.js';
import { memoryMonitor } from './memoryMonitor.js';

/**
 * Enhanced Gemini service configuration
 */
const DEFAULT_CONFIG = {
  maxRetries: 3,
  apiTimeout: 30000,
  retryBaseDelay: 1000,
  retryMaxDelay: 5000,
  retryBackoffMultiplier: 1.5,
  enableFallback: true,
  enableRetry: true,
  enableProgressiveParsing: true,
  enableErrorLogging: true,
  fallbackThreshold: 2, // Use fallback after this many failures
  maxResponseSize: 1024 * 1024, // 1MB
  models: [
    'gemini-2.5-pro',
    'gemini-2.5-flash',
  ]
};

/**
 * Enhanced Gemini service class
 */
export class EnhancedGeminiService {
  constructor(apiKey, config = {}) {
    this.apiKey = apiKey;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
    this.consecutiveFailures = 0;
  }

  /**
   * Generate prompt for challenge creation
   */
  generatePrompt(filters = {}) {
    const defaultFilters = { language: "JavaScript", difficulty: "Intermediate" };
    
    // Map 'level' to 'difficulty' if present (frontend sends 'level', Gemini expects 'difficulty')
    if (filters.level && !filters.difficulty) {
      console.log('🔄 Mapping level to difficulty:', filters.level);
      filters.difficulty = filters.level;
      delete filters.level;
    }
    
    const finalFilters = { ...defaultFilters, ...filters };
    console.log('📝 Final filters for Gemini prompt:', finalFilters);

    return `You are a coding challenge generator for a programming practice app.
    Output ONLY a single valid JSON object with the following keys: "title", "language", "difficulty", "description", "starterCode", "solution", "testCases".
    - "title": A concise, interesting title.
    - "language": A common programming language (e.g., JavaScript, Python, Go).
    - "difficulty": One of: "Beginner", "Intermediate", "Advanced", "Expert".
    - "description": A clear, one-paragraph explanation of the task.
    - "starterCode": A minimal function or class signature for the user to start with. Do NOT include markdown fences.
    - "solution": A complete and correct code solution for the challenge. Do NOT include markdown fences.
    - "testCases": An array of at most 3 objects, each with "input" (an object of arguments) and "expected" (the expected output). Do NOT stringify this array.

    Reply with pure JSON only. No markdown, no comments, no extra text.

    Generate a challenge based on these constraints: ${JSON.stringify(finalFilters)}`;
  }

  /**
   * Generate content schema for Gemini API
   */
  getContentSchema() {
    return {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        language: { type: Type.STRING },
        difficulty: { type: Type.STRING },
        description: { type: Type.STRING },
        starterCode: { type: Type.STRING },
        solution: { type: Type.STRING },
        testCases: { 
          type: Type.ARRAY, 
          items: { 
            type: Type.OBJECT,
            properties: {
              input: { 
                type: Type.OBJECT,
                properties: {
                  // Define some common parameter names that might be used
                  a: { type: Type.NUMBER },
                  b: { type: Type.NUMBER },
                  nums: { type: Type.ARRAY },
                  target: { type: Type.NUMBER },
                  str: { type: Type.STRING },
                  n: { type: Type.NUMBER }
                },
                additionalProperties: true
              },
              expected: { type: Type.STRING }
            },
            required: ['input', 'expected']
          }
        },
      },
      required: ['title', 'language', 'difficulty', 'description', 'starterCode', 'solution', 'testCases']
    };
  }

  /**
   * Call Gemini API with a specific model
   */
  async callGeminiModel(modelName, prompt, context = {}) {
    if (!this.ai) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    try {
      console.log(`Attempting to call model: ${modelName}`);
      
      const response = await this.ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: this.getContentSchema()
        }
      });

      const text = response?.text || '';
      if (!text || typeof text !== 'string') {
        throw new Error('No text in Gemini response');
      }

      console.log(`Successfully called model: ${modelName}`);
      return {
        success: true,
        text,
        model: modelName
      };

    } catch (error) {
      console.warn(`Model ${modelName} failed:`, error.message);
      throw new Error(`Model ${modelName} failed: ${error.message}`);
    }
  }

  /**
   * Try multiple models with retry logic
   */
  async generateWithModels(filters, context = {}) {
    const prompt = this.generatePrompt(filters);
    let lastError;

    for (const modelName of this.config.models) {
      try {
        // Create retry wrapper for this specific model (if retry is enabled)
        if (this.config.enableRetry) {
          const retryWrapper = createRetryWrapper(
            async () => this.callGeminiModel(modelName, prompt, context),
            {
              maxAttempts: 2, // Fewer retries per model to try more models
              baseDelay: this.config.retryBaseDelay,
              maxDelay: this.config.retryMaxDelay,
              backoffMultiplier: this.config.retryBackoffMultiplier
            }
          );
          const result = await retryWrapper();
          return result;
        } else {
          // Direct call without retry
          const result = await this.callGeminiModel(modelName, prompt, context);
          return result;
        }



      } catch (error) {
        lastError = error;
        console.warn(`All retry attempts failed for model ${modelName}: ${error.message}`);
        continue; // Try next model
      }
    }

    // All models failed
    throw lastError || new Error('All models failed');
  }

  /**
   * Process API response using enhanced parsing pipeline
   */
  async processApiResponse(apiResponse, context = {}) {
    const processingContext = {
      ...context,
      modelUsed: apiResponse.model,
      responseLength: apiResponse.text.length
    };

    // Check response size limit
    if (this.config.maxResponseSize && apiResponse.text.length > this.config.maxResponseSize) {
      throw new Error(`Response too large: ${apiResponse.text.length} bytes (limit: ${this.config.maxResponseSize})`);
    }

    // Use the enhanced parsing pipeline if enabled
    if (this.config.enableProgressiveParsing) {
      const parseResult = processResponse(apiResponse.text, processingContext);
      
      if (!parseResult.success) {
        throw new Error(`Parsing failed: ${parseResult.error}`);
      }

      return parseResult.data;
    } else {
      // Simple JSON parsing fallback
      try {
        return JSON.parse(apiResponse.text);
      } catch (error) {
        throw new Error(`Simple JSON parsing failed: ${error.message}`);
      }
    }
  }

  /**
   * Main method to generate question with full error handling and fallback
   */
  async generateQuestionWithGemini(filters = {}) {
    const startMemory = memoryMonitor.getMemoryUsage();
    const context = {
      filters,
      timestamp: new Date().toISOString(),
      attempt: 1,
      initialMemoryMB: startMemory.heapUsedMB
    };

    try {
      // Check memory pressure before starting
      if (memoryMonitor.isMemoryPressure()) {
        console.warn('Memory pressure detected before AI generation');
        memoryMonitor.forceGC();
      }

      // Check if we should use fallback immediately
      if (this.consecutiveFailures >= this.config.fallbackThreshold && this.config.enableFallback) {
        console.log(`Using fallback due to ${this.consecutiveFailures} consecutive failures`);
        return this.getFallbackWithMetadata(filters, 'consecutive_failures');
      }

      // Try to generate with AI
      const apiResponse = await this.generateWithModels(filters, context);
      const parsedData = await this.processApiResponse(apiResponse, context);

      // Normalize the data structure
      const normalizedData = this.normalizeQuestionData(parsedData);

      // Reset consecutive failures on success
      this.consecutiveFailures = 0;

      // Log success with memory stats if logging is enabled
      if (this.config.enableErrorLogging) {
        const endMemory = memoryMonitor.getMemoryUsage();
        logSuccess({
          ...context,
          modelUsed: apiResponse.model,
          parsingMethod: 'ai_generation',
          memoryDeltaMB: Math.round((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024 * 100) / 100
        });
      }

      return normalizedData;

    } catch (error) {
      this.consecutiveFailures++;
      
      // Log error if logging is enabled
      if (this.config.enableErrorLogging) {
        logApiError(error, {
          ...context,
          consecutiveFailures: this.consecutiveFailures
        });
      }

      // Use fallback if enabled
      if (this.config.enableFallback) {
        console.log(`AI generation failed, using fallback: ${error.message}`);
        return this.getFallbackWithMetadata(filters, error.message);
      }

      // Re-throw if fallback is disabled
      throw new Error(`Gemini API failed: ${error.message}`);
    }
  }

  /**
   * Get fallback challenge with metadata
   */
  getFallbackWithMetadata(filters, reason) {
    try {
      const fallbackChallenge = getFallbackChallenge(filters);
      const formattedChallenge = formatFallbackChallenge(fallbackChallenge);
      
      return {
        ...formattedChallenge,
        metadata: {
          ...formattedChallenge.metadata,
          fallbackReason: reason,
          consecutiveFailures: this.consecutiveFailures
        }
      };
    } catch (fallbackError) {
      // Log error if logging is enabled
      if (this.config.enableErrorLogging) {
        logParsingError(fallbackError, {
          filters,
          fallbackReason: reason,
          stage: 'fallback_generation'
        });
      }
      
      // Return a minimal emergency fallback
      return this.getEmergencyFallback(filters);
    }
  }

  /**
   * Emergency fallback when even the fallback system fails
   */
  getEmergencyFallback(filters) {
    return {
      title: "Simple Addition",
      language: filters.language || "JavaScript",
      difficulty: filters.difficulty || "Beginner",
      description: "Write a function that adds two numbers together.",
      starterCode: "function add(a, b) {\n  // Your code here\n}",
      solution: "function add(a, b) {\n  return a + b;\n}",
      testCases: [
        { input: { a: 2, b: 3 }, expected: "5" },
        { input: { a: 0, b: 0 }, expected: "0" },
        { input: { a: -1, b: 1 }, expected: "0" }
      ],
      metadata: {
        source: 'emergency_fallback',
        timestamp: new Date(),
        generationAttempts: 0,
        parsingMethod: 'emergency',
        fallbackReason: 'Fallback system failed'
      }
    };
  }

  /**
   * Normalize question data to ensure consistent structure
   */
  normalizeQuestionData(data) {
    // Ensure testCases is properly formatted
    if (typeof data.testCases === 'string') {
      try {
        data.testCases = JSON.parse(data.testCases);
      } catch (e) {
        console.warn('Failed to parse testCases string, using empty array');
        data.testCases = [];
      }
    }

    if (Array.isArray(data.testCases)) {
      data.testCases = data.testCases.map(tc => ({
        input: tc.input || {},
        expected: String(tc.expected ?? '')
      }));
    } else {
      console.warn('testCases is not an array, defaulting to empty array');
      data.testCases = [];
    }

    // Add metadata if not present
    if (!data.metadata) {
      data.metadata = {
        source: 'ai',
        timestamp: new Date(),
        generationAttempts: 1,
        parsingMethod: 'enhanced_pipeline'
      };
    }

    return data;
  }

  /**
   * Get service health and statistics
   */
  getServiceHealth() {
    const memoryStats = memoryMonitor.getStats();
    
    return {
      status: this.consecutiveFailures >= this.config.fallbackThreshold ? 'degraded' : 'healthy',
      consecutiveFailures: this.consecutiveFailures,
      memoryStats: memoryStats,
      configuration: {
        fallbackEnabled: this.config.enableFallback,
        retryEnabled: this.config.enableRetry,
        progressiveParsingEnabled: this.config.enableProgressiveParsing,
        errorLoggingEnabled: this.config.enableErrorLogging,
        fallbackThreshold: this.config.fallbackThreshold,
        maxRetries: this.config.maxRetries,
        apiTimeout: this.config.apiTimeout,
        maxResponseSize: this.config.maxResponseSize
      },
      availableModels: this.config.models,
      apiKeyConfigured: !!this.apiKey
    };
  }

  /**
   * Reset service state (useful for testing)
   */
  reset() {
    this.consecutiveFailures = 0;
  }
}

/**
 * Create and export a default instance
 */
export function createEnhancedGeminiService(apiKey, config = {}) {
  return new EnhancedGeminiService(apiKey, config);
}

/**
 * Legacy wrapper function for backward compatibility
 */
export async function generateQuestionWithGemini(filters = {}, apiKey = null, config = {}) {
  const service = new EnhancedGeminiService(apiKey, config);
  return service.generateQuestionWithGemini(filters);
}
