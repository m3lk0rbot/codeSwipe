/**
 * JSON Parsing Utilities - Main Export
 * Provides easy access to all JSON parsing and error handling utilities
 */

// Main pipeline
export { 
  processResponse, 
  processResponseWithRetry, 
  getSystemHealth, 
  testPipeline 
} from './jsonParsingPipeline.js';

// Enhanced Gemini Service
export { 
  EnhancedGeminiService,
  createEnhancedGeminiService,
  generateQuestionWithGemini
} from './enhancedGeminiService.js';

// Retry handling
export { 
  retryWithBackoff, 
  createRetryWrapper, 
  getCircuitBreakerStatus, 
  resetCircuitBreaker, 
  ErrorTypes 
} from './retryHandler.js';

// Fallback challenges
export { 
  getFallbackChallenge, 
  formatFallbackChallenge, 
  validateFallbackChallenge, 
  getAvailableLanguages, 
  getAvailableDifficulties, 
  getFallbackStats, 
  addFallbackChallenge 
} from './fallbackChallenges.js';

// Individual utilities
export { 
  sanitize, 
  removeMarkdownBlocks, 
  fixQuotes, 
  normalizeLineBreaks, 
  fixCharacterEncoding 
} from './jsonSanitizer.js';

export { 
  parse, 
  directParse, 
  extractFirstObject, 
  repairCommonIssues 
} from './progressiveParser.js';

export { 
  validateResponse, 
  validate, 
  isComplete, 
  hasValidStructure, 
  hasRequiredFields, 
  normalizeTypes, 
  applyDefaults 
} from './responseValidator.js';

export { 
  logParsingError, 
  logApiError, 
  logValidationError, 
  logSuccess, 
  getErrorStats, 
  shouldAlert, 
  getRecentErrors, 
  monitorErrorRates, 
  ErrorTypes 
} from './errorLogger.js';