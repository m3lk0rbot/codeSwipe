

import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { GoogleGenAI, Type } from '@google/genai';
import { Firestore } from '@google-cloud/firestore';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();
import { createEnhancedGeminiService } from './utils/enhancedGeminiService.js';
import { getConfig, getConfigSummary, isFeatureEnabled } from './utils/config.js';
import { memoryMonitor } from './utils/memoryMonitor.js';
import { fallbackCache, responseCache, performanceBenchmark, rateLimiter } from './utils/cacheManager.js';

const app = express();

// Enable compression for all responses
app.use(compression({
  level: 6, // Compression level (1-9, 6 is default)
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    // Don't compress if the request includes a cache-control: no-transform directive
    if (req.headers['cache-control'] && req.headers['cache-control'].includes('no-transform')) {
      return false;
    }
    // Use compression filter function
    return compression.filter(req, res);
  }
}));

app.use(express.json());

// Use environment variable for CORS origins, with a fallback for local development
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:5173').split(',').map(s => s.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Log the origin for debugging purposes. You can check this in your Cloud Run logs.
    console.log(`[CORS] Request from origin: ${origin}`);

    if (!origin || allowedOrigins.includes(origin)) {
      console.log(`[CORS] Allowing origin: ${origin}`);
      callback(null, true);
    } else {
      console.error(`[CORS] Blocking origin: ${origin}. Allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'], // Explicitly allow methods used by the app
  allowedHeaders: ['Content-Type'], // Explicitly allow the header sent by the app
  credentials: true
}));

const PORT = process.env.PORT || 8080;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize Firestore with project ID from environment or default
// Use Application Default Credentials (auto-provided by Cloud Run)
let db;
try {
  db = new Firestore({
    projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || 'codeswipe-9ea2d',
  });
  console.log('Firestore initialized successfully');
  console.log(`Firestore project: ${db.projectId}`);
} catch (e) {
  console.error('Firestore initialization error (will fail on first request):', e.message);
  console.log('💡 To fix Firestore authentication:');
  console.log('   1. Set GOOGLE_APPLICATION_CREDENTIALS environment variable');
  console.log('   2. Or run: gcloud auth application-default login');
  console.log('   3. Or create a service account key file');
  // Don't block startup - will fail on first request instead
}

// Initialize Enhanced Gemini Service with configuration
let enhancedGeminiService;
if (GEMINI_API_KEY) {
  const config = getConfig();
  enhancedGeminiService = createEnhancedGeminiService(GEMINI_API_KEY, {
    enableFallback: config.enableFallback,
    fallbackThreshold: config.fallbackThreshold,
    maxRetries: config.maxRetries,
    apiTimeout: config.apiTimeout,
    enableRetry: config.enableRetry,
    enableProgressiveParsing: config.enableProgressiveParsing,
    enableErrorLogging: config.enableErrorLogging,
    retryBaseDelay: config.retryBaseDelay,
    retryMaxDelay: config.retryMaxDelay,
    retryBackoffMultiplier: config.retryBackoffMultiplier,
    maxResponseSize: config.maxResponseSize
  });
  console.log('✅ Gemini API service initialized');
} else {
  console.log('⚠️  GEMINI_API_KEY not configured, using fallback challenges');
  console.log('💡 To enable AI-generated challenges:');
  console.log('   1. Get an API key from https://makersuite.google.com/app/apikey');
  console.log('   2. Set GEMINI_API_KEY environment variable');
}

// Log startup info
const config = getConfig();
console.log('Starting curator service...');
console.log(`PORT: ${PORT}`);
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`GEMINI_API_KEY configured: ${!!GEMINI_API_KEY}`);
console.log(`Log level: ${config.logLevel}`);
console.log(`Features enabled:`, {
  fallback: config.enableFallback,
  retry: config.enableRetry,
  progressiveParsing: config.enableProgressiveParsing,
  errorLogging: config.enableErrorLogging
});
if (db) {
  console.log(`Firestore project: ${db.projectId}`);
}

// Start memory monitoring
memoryMonitor.startMonitoring();
console.log('Memory monitoring started');

function sha256String(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

// Extract first balanced JSON object from a string (handles quotes/escapes)
function extractFirstJsonObject(text) {
  const start = text.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let prev = '';
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (ch === '"' && prev !== '\\') inStr = false;
    } else {
      if (ch === '"') inStr = true;
      else if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) return text.slice(start, i + 1);
      }
    }
    prev = ch;
  }
  return null;
}

async function generateQuestionWithGemini(filters) {
  if (!enhancedGeminiService) {
    console.log('GEMINI_API_KEY not configured, using fallback challenges');
    // Import fallback functions
    const { getFallbackChallenge, formatFallbackChallenge } = await import('./utils/fallbackChallenges.js');
    const fallbackChallenge = getFallbackChallenge(filters);
    return formatFallbackChallenge(fallbackChallenge);
  }
  
  try {
    const result = await enhancedGeminiService.generateQuestionWithGemini(filters);
    console.log('Successfully generated question using Enhanced Gemini Service');
    return result;
  } catch (error) {
    console.error('Enhanced Gemini Service error:', error);
    throw new Error(`Enhanced Gemini Service failed: ${error.message || error}`);
  }
}

// Legacy function for backward compatibility - keeping the old implementation as backup
async function generateQuestionWithGeminiLegacy(filters) {
  try {
    const prompt = `You are a coding challenge generator for a programming practice app.
    Output ONLY a single valid JSON object with the following keys: "title", "language", "difficulty", "description", "starterCode", "solution", "testCases".
    - "title": A concise, interesting title.
    - "language": A common programming language (e.g., JavaScript, Python, Go).
    - "difficulty": One of: "Beginner", "Intermediate", "Advanced", "Expert".
    - "description": A clear, one-paragraph explanation of the task.
    - "starterCode": A minimal function or class signature for the user to start with. Do NOT include markdown fences.
    - "solution": A complete and correct code solution for the challenge. Do NOT include markdown fences.
    - "testCases": An array of at most 3 objects, each with "input" (an object of arguments) and "expected" (the expected output). Do NOT stringify this array.

    Reply with pure JSON only. No markdown, no comments, no extra text.

    Generate a challenge based on these constraints: ${JSON.stringify(filters || { language: "JavaScript", difficulty: "Intermediate" })}`;

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    const modelsToTry = [
      'gemini-2.5-pro',
      'gemini-2.5-flash',
    ];
    let lastError;
    let response;
    
    for (const modelName of modelsToTry) {
      try {
        console.log(`Trying model: ${modelName}`);


        response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
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
                        // Allow any properties in input
                        additionalProperties: true
                      },
                      // Keep expected as string or allow any type
                      expected: { type: Type.STRING }
                    },
                    required: ['input', 'expected']
                  }
                },
              },
              required: ['title', 'language', 'difficulty', 'description', 'starterCode', 'solution', 'testCases']
            }
          }
        });


        console.log(`Successfully called model: ${modelName}`);
        break; // Success, exit loop
      } catch (error) {
        console.warn(`Model ${modelName} failed:`, error.message);
        lastError = error;
        if (modelsToTry.indexOf(modelName) === modelsToTry.length - 1) {
          // Last model, throw error
          throw error;
        }
        continue; // Try next model
      }
    }

    if (!response) {
      throw lastError || new Error('All models failed');
    }

    const text = response?.text || '';
    if (!text || typeof text !== 'string') {
      throw new Error('No text in Gemini response');
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      const extracted = extractFirstJsonObject(text);
      if (!extracted) throw new Error('Gemini returned non-JSON content');
      const sanitized = extracted
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/\r?\n/g, '\\n');
      json = JSON.parse(sanitized);
    }

    // Normalize testCases to an array of { input, expected }
    if (typeof json.testCases === 'string') {
      const raw = json.testCases.trim();
      let parsed;
      // First, try direct JSON.parse
      try {
        parsed = JSON.parse(raw);
      } catch (_) {
        // Try to extract the first bracketed array and parse that
        const arrMatch = raw.match(/\[[\s\S]*\]/);
        if (arrMatch) {
          try {
            parsed = JSON.parse(arrMatch[0]);
          } catch (_) {
            // As a last resort, replace single quotes with double quotes and try again
            try {
              parsed = JSON.parse(
                arrMatch[0]
                  .replace(/\'([^']*)\'/g, '"$1"')
                  .replace(/[“”]/g, '"')
                  .replace(/[‘’]/g, "'")
              );
            } catch (e) {
              console.error('Failed to coerce testCases string:', e);
            }
          }
        }
      }
      if (Array.isArray(parsed)) {
        json.testCases = parsed;
      } else {
        console.warn('testCases could not be parsed; defaulting to empty array');
        json.testCases = [];
      }
    }

    // Coerce nested fields per item
    if (Array.isArray(json.testCases)) {
      json.testCases = json.testCases.map(tc => {
        // Ensure structure is correct
        if (!tc || typeof tc !== 'object') {
          console.warn('Invalid test case:', tc);
          return { input: {}, expected: '' };
        }
        
        return {
          input: tc.input || {},
          expected: String(tc.expected ?? '')
        };
      });
    } else {
      console.warn('testCases is not an array, defaulting to empty array');
      json.testCases = [];
    }

    console.log('Successfully generated question using Gemini API');
    return json;
  } catch (error) {
    console.error('Gemini API error:', error);
    if (error instanceof SyntaxError) { // JSON.parse error
        throw new Error(`Gemini returned malformed JSON: ${error.message}`);
    }
    throw new Error(`Gemini API failed: ${error.message || error}`);
  }
}

app.post('/api/getQuestion', async (req, res) => {
  const operationId = `question-${Date.now()}-${Math.random()}`;
  performanceBenchmark.start(operationId);
  
  try {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    // Rate limiting check
    const rateLimitResult = rateLimiter.isAllowed(clientIP);
    if (!rateLimitResult.allowed) {
      res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000),
        remaining: rateLimitResult.remaining
      });
      return;
    }
    
    // Add rate limit headers
    res.set({
      'X-RateLimit-Remaining': rateLimitResult.remaining,
      'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
    });
    
    const { filters = {} } = req.body || {};
    
    // Check response cache first
    const cacheKey = JSON.stringify(filters);
    const cachedResponse = responseCache.get(cacheKey);
    if (cachedResponse) {
      performanceBenchmark.end(operationId, { 
        source: 'cache',
        filters,
        cached: true
      });
      
      res.set('X-Cache', 'HIT');
      res.json(cachedResponse);
      return;
    }
    
    res.set('X-Cache', 'MISS');

    // 1) Generate with Enhanced Gemini Service (includes parsing pipeline and fallback)
    const q = await generateQuestionWithGemini(filters);

    // Validate that we have all required fields
    if (!q || !q.title || !q.language || !q.difficulty || !q.description || !q.starterCode) {
      throw new Error('Generated question is missing required fields');
    }

    const canonical = {
      title: q.title,
      language: q.language,
      difficulty: q.difficulty,
      description: q.description,
      starterCode: q.starterCode,
      testCases: Array.isArray(q.testCases) ? q.testCases : [],
      solutionHash: sha256String(q.solution || ''),
    };
    const contentHash = sha256String(JSON.stringify(canonical));

    // 2) Upsert into Firestore Questions
    if (db) {
      try {
        const ref = db.doc(`Questions/${contentHash}`);
        const snap = await ref.get();
        if (!snap.exists) {
          await ref.set({
            question_id: contentHash,
            ...canonical,
            source: q.metadata?.source || 'ai',
            generation_attempts: q.metadata?.generationAttempts || 1,
            parsing_method: q.metadata?.parsingMethod || 'unknown',
            created_at: new Date(),
          });
        }
      } catch (e) {
        console.error('Firestore error (continuing anyway):', e);
      }
    }
    
    const response = { questionId: contentHash, ...canonical, solution: q.solution };
    
    // Cache the response for future requests (only cache successful AI generations)
    if (q.metadata?.source === 'ai') {
      responseCache.set(cacheKey, response, 15 * 60 * 1000); // 15 minutes for AI responses
    }
    
    performanceBenchmark.end(operationId, { 
      source: q.metadata?.source || 'ai',
      filters,
      cached: false
    });
    
    // Return the solution as well so the frontend can use it for evaluation
    res.json(response);
  } catch (e) {
    console.error('curator error', e);
    
    performanceBenchmark.end(operationId, { 
      error: true,
      errorMessage: e.message
    });
    
    // Provide more detailed error responses
    let errorMessage = 'Failed to generate question';
    let statusCode = 500;
    
    if (e.message?.includes('GEMINI_API_KEY not configured')) {
      errorMessage = 'Service configuration error';
      statusCode = 503;
    } else if (e.message?.includes('Enhanced Gemini Service failed')) {
      errorMessage = 'AI service temporarily unavailable';
      statusCode = 503;
    } else if (e.message?.includes('missing required fields')) {
      errorMessage = 'Generated content validation failed';
      statusCode = 502;
    } else if (e.message?.includes('malformed JSON')) {
      errorMessage = 'Response parsing error';
      statusCode = 502;
    }
    
    res.status(statusCode).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? e.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
});

// AI Code Review endpoint
app.post('/api/reviewCode', async (req, res) => {
  try {
    const { userCode, solutionCode, language, testsPassed, challengeTitle } = req.body;

    if (!userCode || !solutionCode || !language) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // If Gemini is not configured, return a basic review
    if (!enhancedGeminiService) {
      return res.json({
        score: testsPassed ? 7 : 4,
        strength: testsPassed 
          ? 'Your solution passes all test cases!' 
          : 'Keep trying! Practice makes perfect.',
        improvement: testsPassed
          ? 'Consider exploring edge cases and optimizing your solution.'
          : 'Review the test failures and try to fix the issues.'
      });
    }

    // Generate AI code review using Gemini
    const prompt = `You are an expert code reviewer. Review the following code submission and provide constructive feedback.

Challenge: ${challengeTitle || 'Coding Challenge'}
Language: ${language}
Tests Passed: ${testsPassed ? 'Yes' : 'No'}

User's Code:
\`\`\`${language.toLowerCase()}
${userCode}
\`\`\`

Expected Solution:
\`\`\`${language.toLowerCase()}
${solutionCode}
\`\`\`

Provide a code review in JSON format with:
1. "score": A number from 1-10 rating the code quality
2. "strength": One specific thing the code does well (1 sentence)
3. "improvement": One specific suggestion for improvement (1 sentence)

Focus on: correctness, readability, efficiency, and best practices.
Be encouraging but honest. Keep feedback concise and actionable.

Output ONLY valid JSON with keys: score, strength, improvement`;

    try {
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              strength: { type: Type.STRING },
              improvement: { type: Type.STRING }
            },
            required: ['score', 'strength', 'improvement']
          }
        }
      });

      const text = response?.text || '';
      if (!text) {
        throw new Error('No response from Gemini');
      }

      let review;
      try {
        review = JSON.parse(text);
      } catch (e) {
        // Try to extract JSON from response
        const extracted = extractFirstJsonObject(text);
        if (!extracted) throw new Error('Invalid JSON response');
        review = JSON.parse(extracted);
      }

      // Validate and normalize score
      review.score = Math.max(1, Math.min(10, Math.round(review.score || (testsPassed ? 7 : 4))));

      res.json(review);
    } catch (error) {
      console.error('Gemini code review error:', error);
      // Return fallback review
      res.json({
        score: testsPassed ? 7 : 4,
        strength: testsPassed 
          ? 'Your solution passes all test cases!' 
          : 'Keep trying! Practice makes perfect.',
        improvement: testsPassed
          ? 'Consider exploring edge cases and optimizing your solution.'
          : 'Review the test failures and try to fix the issues.',
        error: 'AI review temporarily unavailable'
      });
    }
  } catch (error) {
    console.error('Code review endpoint error:', error);
    res.status(500).json({ 
      error: 'Failed to generate code review',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Answer Generation endpoint
app.post('/api/generateAnswer', async (req, res) => {
  try {
    const { title, description, language, difficulty, starterCode, testCases } = req.body;

    // Request validation
    if (!title || !description || !language || !difficulty) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['title', 'description', 'language', 'difficulty']
      });
    }

    // If Gemini is not configured, return error
    if (!enhancedGeminiService) {
      console.log('GEMINI_API_KEY not configured, cannot generate answer');
      return res.status(503).json({ 
        error: 'Answer generation service not available',
        message: 'AI service is not configured'
      });
    }

    // Format test cases for the prompt
    let testCasesText = '';
    if (Array.isArray(testCases) && testCases.length > 0) {
      testCasesText = testCases.map((tc, idx) => {
        const inputStr = JSON.stringify(tc.input, null, 2);
        const expectedStr = typeof tc.expected === 'string' ? tc.expected : JSON.stringify(tc.expected);
        return `Test Case ${idx + 1}:\nInput: ${inputStr}\nExpected Output: ${expectedStr}`;
      }).join('\n\n');
    }

    // Construct the prompt for Gemini AI
    const prompt = `Generate a complete, working solution for this coding challenge:

Title: ${title}
Difficulty: ${difficulty}
Language: ${language}
Description: ${description}

Starter Code:
${starterCode || 'No starter code provided'}

${testCasesText ? `Test Cases:\n${testCasesText}` : 'No test cases provided'}

Requirements:
- Write production-quality code
- Include comments explaining the logic
- Ensure the solution passes all test cases
- Follow ${language} best practices

Return ONLY a single valid JSON object with one key: "solutionCode".
The value should be a string containing the complete function code.
Do not include markdown fences, explanations, or any other text.`;

    console.log(`Generating answer for challenge: ${title} (${language}, ${difficulty})`);

    // Generate solution using Gemini AI with timeout
    const timeoutMs = 30000; // 30 seconds
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Answer generation timed out')), timeoutMs);
    });

    let solutionCode;
    try {
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      
      const modelsToTry = [
        'gemini-2.5-flash',
        'gemini-2.5-pro',
      ];
      
      let lastError;
      let response;
      
      for (const modelName of modelsToTry) {
        try {
          console.log(`Trying model: ${modelName} for answer generation`);
          
          const generatePromise = ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              temperature: 0.7,
              maxOutputTokens: 2048,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  solutionCode: { type: Type.STRING }
                },
                required: ['solutionCode']
              }
            }
          });
          
          response = await Promise.race([generatePromise, timeoutPromise]);
          console.log(`Successfully generated answer using model: ${modelName}`);
          break; // Success, exit loop
        } catch (error) {
          console.warn(`Model ${modelName} failed for answer generation:`, error.message);
          lastError = error;
          if (modelsToTry.indexOf(modelName) === modelsToTry.length - 1) {
            throw error; // Last model, throw error
          }
          continue; // Try next model
        }
      }
      
      if (!response) {
        throw lastError || new Error('All models failed');
      }

      const text = response?.text || '';
      if (!text || typeof text !== 'string') {
        throw new Error('No text in Gemini response');
      }

      // Parse the JSON response
      let solutionJson;
      try {
        solutionJson = JSON.parse(text);
      } catch (e) {
        const extracted = extractFirstJsonObject(text);
        if (!extracted) {
            console.error("Failed to extract JSON from text:", text);
            throw new Error('Gemini returned non-JSON content');
        }
        solutionJson = JSON.parse(extracted);
      }

      if (!solutionJson || typeof solutionJson.solutionCode !== 'string') {
        throw new Error('Generated solution is empty or in the wrong format');
      }

      solutionCode = solutionJson.solutionCode;

      // Clean up the response - remove markdown fences if present
      solutionCode = solutionCode.trim();
      
      const fencePattern = /^```[\w]*\n?([\s\S]*?)\n?```$/;
      const match = solutionCode.match(fencePattern);
      if (match) {
        solutionCode = match[1].trim();
      }
      
      solutionCode = solutionCode
        .replace(/^```[\w]*\n?/gm, '') // Remove opening fences
        .replace(/\n?```$/gm, '')      // Remove closing fences
        .trim();

    } catch (error) {
      if (error.message === 'Answer generation timed out') {
        console.error('Answer generation timeout');
        return res.status(504).json({ 
          error: 'Answer generation timed out',
          message: 'The request took too long to complete. Please try again.'
        });
      }
      throw error;
    }

    // Validate that we got a solution
    if (!solutionCode || solutionCode.length === 0) {
      throw new Error('Generated solution is empty');
    }

    console.log(`Successfully generated answer for: ${title}`);

    // Response formatting
    const response = {
      solution: solutionCode,
      metadata: {
        language,
        difficulty,
        generatedAt: new Date().toISOString()
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Answer generation endpoint error:', error);
    
    // Detailed error responses
    let errorMessage = 'Failed to generate answer';
    let statusCode = 500;
    
    if (error.message?.includes('Missing required fields')) {
      errorMessage = error.message;
      statusCode = 400;
    } else if (error.message?.includes('not configured')) {
      errorMessage = 'Answer generation service not available';
      statusCode = 503;
    } else if (error.message?.includes('timed out')) {
      errorMessage = 'Answer generation timed out';
      statusCode = 504;
    } else if (error.message?.includes('No text in Gemini response') || error.message?.includes('non-JSON') || error.message?.includes('wrong format')) {
      errorMessage = 'AI service returned invalid response';
      statusCode = 502;
    } else if (error.message?.includes('Generated solution is empty')) {
      errorMessage = 'AI service returned an empty solution';
      statusCode = 502;
    }
    
    res.status(statusCode).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/healthz', (_req, res) => res.send('ok'));

// Configuration endpoint for debugging (only in development)
app.get('/config', (_req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  
  res.json({
    configuration: getConfigSummary(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: PORT,
      GEMINI_API_KEY_CONFIGURED: !!GEMINI_API_KEY,
      GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT
    }
  });
});

// Enhanced health endpoint with service status
app.get('/health', (_req, res) => {
  const memoryStats = memoryMonitor.getStats();
  const performanceStats = performanceBenchmark.getStats();
  const cacheStats = {
    fallback: fallbackCache.getStats(),
    response: responseCache.getStats()
  };
  
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      firestore: !!db,
      gemini: !!enhancedGeminiService
    },
    configuration: getConfigSummary(),
    memory: memoryStats,
    performance: performanceStats,
    cache: cacheStats
  };
  
  if (enhancedGeminiService) {
    try {
      health.geminiService = enhancedGeminiService.getServiceHealth();
    } catch (error) {
      health.geminiService = {
        status: 'error',
        error: error.message
      };
    }
  }
  
  // Overall health status based on critical services
  if (!enhancedGeminiService) {
    health.status = 'degraded';
    health.message = 'Gemini service not available';
  }
  
  // Check memory pressure
  if (memoryMonitor.isMemoryPressure()) {
    health.status = 'warning';
    health.message = 'Memory pressure detected';
  }
  
  // Check performance issues
  if (performanceStats.averageResponseTime > 5000) { // 5 seconds
    health.status = 'warning';
    health.message = 'High response times detected';
  }
  
  res.json(health);
});

// Performance metrics endpoint
app.get('/metrics', (_req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  
  const metrics = {
    timestamp: new Date().toISOString(),
    memory: memoryMonitor.getStats(),
    performance: performanceBenchmark.getStats(),
    cache: {
      fallback: fallbackCache.getStats(),
      response: responseCache.getStats()
    },
    system: {
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memoryUsage: process.memoryUsage()
    }
  };
  
  res.json(metrics);
});

// Cache management endpoints (development only)
app.post('/cache/clear', (_req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  
  const beforeStats = {
    fallback: fallbackCache.getStats(),
    response: responseCache.getStats()
  };
  
  fallbackCache.clear();
  responseCache.clear();
  
  const afterStats = {
    fallback: fallbackCache.getStats(),
    response: responseCache.getStats()
  };
  
  res.json({
    message: 'Cache cleared successfully',
    before: beforeStats,
    after: afterStats
  });
});

app.get('/cache/stats', (_req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }
  
  res.json({
    fallback: fallbackCache.getStats(),
    response: responseCache.getStats(),
    timestamp: new Date().toISOString()
  });
});

// Test endpoint to check available models
app.get('/test-models', async (_req, res) => {
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }
  
  try {
    // Try to list models using REST API
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`;
    const listResponse = await fetch(listUrl);
    const listData = await listResponse.json();
    
    res.json({
      available: listData.models?.map(m => m.name) || [],
      raw: listData
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`curator listening on 0.0.0.0:${PORT}`);
});