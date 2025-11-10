/**
 * JSON Parsing Pipeline
 * Main orchestrator that combines all parsing utilities into a cohesive system
 */

import { sanitize } from './jsonSanitizer.js';
import { parse } from './progressiveParser.js';
import { validateResponse, validate, normalizeTypes, applyDefaults } from './responseValidator.js';
import { logParsingError, logValidationError, logSuccess, monitorErrorRates } from './errorLogger.js';
import { memoryMonitor, streamingParser, stringOps } from './memoryMonitor.js';

/**
 * Main JSON parsing pipeline that processes AI responses with memory optimization
 * @param {string} rawResponse - Raw response from AI API
 * @param {Object} context - Additional context for logging and debugging
 * @returns {Object} Processing result with parsed data or error information
 */
export function processResponse(rawResponse, context = {}) {
  const startTime = Date.now();
  const initialMemory = memoryMonitor.getMemoryUsage();
  const processingContext = {
    ...context,
    processingTime: 0,
    responseLength: rawResponse ? rawResponse.length : 0,
    initialMemoryMB: initialMemory.heapUsedMB
  };
  
  // Track large objects for cleanup
  const largeObjects = [];
  
  try {
    // Step 0: Memory pressure check
    if (memoryMonitor.isMemoryPressure()) {
      console.warn('Memory pressure detected before processing, triggering cleanup');
      memoryMonitor.forceGC();
    }
    
    // Step 1: Validate raw response
    const responseValidation = validateResponse(rawResponse);
    if (!responseValidation.isValid) {
      logValidationError('Raw response validation failed', {
        ...processingContext,
        validationIssues: responseValidation.issues,
        confidence: responseValidation.confidence
      });
      
      return {
        success: false,
        data: null,
        error: 'Invalid response format',
        details: {
          stage: 'response-validation',
          issues: responseValidation.issues,
          confidence: responseValidation.confidence
        }
      };
    }
    
    // Step 2: Memory-optimized sanitization
    let sanitizedText;
    if (rawResponse.length > 1024 * 1024) { // 1MB threshold
      console.log(`Large response detected (${Math.round(rawResponse.length / 1024)}KB), using optimized sanitization`);
      sanitizedText = stringOps.cleanLargeString(rawResponse);
    } else {
      sanitizedText = sanitize(rawResponse);
    }
    
    largeObjects.push(rawResponse); // Mark for cleanup
    
    if (!sanitizedText) {
      memoryMonitor.cleanup(largeObjects);
      logParsingError(new Error('Sanitization resulted in empty text'), {
        ...processingContext,
        parsingMethod: 'sanitization'
      });
      
      return {
        success: false,
        data: null,
        error: 'Sanitization failed',
        details: {
          stage: 'sanitization',
          originalLength: rawResponse.length
        }
      };
    }
    
    // Step 3: Memory-optimized parsing
    let parseResult;
    if (sanitizedText.length > 64 * 1024) { // 64KB threshold for streaming
      console.log(`Large sanitized response (${Math.round(sanitizedText.length / 1024)}KB), using streaming parser`);
      try {
        const streamingResult = streamingParser.parseInChunks(sanitizedText);
        parseResult = {
          success: true,
          data: streamingResult,
          method: 'streaming'
        };
      } catch (streamingError) {
        console.warn('Streaming parser failed, falling back to progressive parser:', streamingError.message);
        parseResult = parse(sanitizedText);
      }
    } else {
      parseResult = parse(sanitizedText);
    }
    
    largeObjects.push(sanitizedText); // Mark for cleanup
    
    if (!parseResult.success) {
      memoryMonitor.cleanup(largeObjects);
      logParsingError(new Error(parseResult.error || 'All parsing strategies failed'), {
        ...processingContext,
        parsingMethod: parseResult.method,
        rawResponse: sanitizedText.length > 1000 ? sanitizedText.substring(0, 1000) + '...' : sanitizedText
      });
      
      return {
        success: false,
        data: null,
        error: 'JSON parsing failed',
        details: {
          stage: 'parsing',
          method: parseResult.method,
          parseError: parseResult.error
        }
      };
    }
    
    // Step 4: Schema validation
    const schemaValidation = validate(parseResult.data);
    if (!schemaValidation.isValid) {
      logValidationError('Schema validation failed', {
        ...processingContext,
        validationIssues: schemaValidation.issues,
        confidence: schemaValidation.confidence,
        data: parseResult.data
      });
      
      // Try to recover with normalization and defaults
      let recoveredData = normalizeTypes(parseResult.data);
      recoveredData = applyDefaults(recoveredData);
      
      const recoveryValidation = validate(recoveredData);
      if (!recoveryValidation.isValid) {
        return {
          success: false,
          data: null,
          error: 'Schema validation failed',
          details: {
            stage: 'schema-validation',
            issues: schemaValidation.issues,
            confidence: schemaValidation.confidence,
            recoveryAttempted: true,
            recoveryIssues: recoveryValidation.issues
          }
        };
      }
      
      // Recovery successful
      parseResult.data = recoveredData;
    } else {
      // Apply normalization and defaults even for valid data
      parseResult.data = normalizeTypes(parseResult.data);
      parseResult.data = applyDefaults(parseResult.data);
    }
    
    // Step 5: Final validation after normalization
    const finalValidation = validate(parseResult.data);
    if (!finalValidation.isValid) {
      logValidationError('Final validation failed after normalization', {
        ...processingContext,
        validationIssues: finalValidation.issues,
        confidence: finalValidation.confidence
      });
      
      return {
        success: false,
        data: null,
        error: 'Final validation failed',
        details: {
          stage: 'final-validation',
          issues: finalValidation.issues,
          confidence: finalValidation.confidence
        }
      };
    }
    
    // Success! Clean up and return
    processingContext.processingTime = Date.now() - startTime;
    const finalMemory = memoryMonitor.getMemoryUsage();
    
    // Clean up large objects
    memoryMonitor.cleanup(largeObjects);
    
    logSuccess({
      ...processingContext,
      parsingMethod: parseResult.method,
      memoryUsedMB: finalMemory.heapUsedMB,
      memoryDeltaMB: Math.round((finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024 * 100) / 100
    });
    
    return {
      success: true,
      data: parseResult.data,
      error: null,
      details: {
        parsingMethod: parseResult.method,
        processingTime: processingContext.processingTime,
        responseLength: processingContext.responseLength,
        validationConfidence: finalValidation.confidence,
        memoryStats: {
          initialMB: initialMemory.heapUsedMB,
          finalMB: finalMemory.heapUsedMB,
          deltaMB: Math.round((finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024 * 100) / 100
        }
      }
    };
    
  } catch (error) {
    processingContext.processingTime = Date.now() - startTime;
    
    // Clean up on error
    memoryMonitor.cleanup(largeObjects);
    
    logParsingError(error, {
      ...processingContext,
      parsingMethod: 'pipeline-error'
    });
    
    return {
      success: false,
      data: null,
      error: error.message || 'Unexpected error in parsing pipeline',
      details: {
        stage: 'pipeline-error',
        processingTime: processingContext.processingTime,
        stack: error.stack
      }
    };
  }
}

/**
 * Processes response with retry logic
 * @param {string} rawResponse - Raw response from AI API
 * @param {Object} context - Additional context
 * @param {number} maxRetries - Maximum number of processing retries
 * @returns {Object} Processing result
 */
export function processResponseWithRetry(rawResponse, context = {}, maxRetries = 2) {
  let lastResult = null;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    const attemptContext = {
      ...context,
      attempt
    };
    
    const result = processResponse(rawResponse, attemptContext);
    
    if (result.success) {
      return result;
    }
    
    lastResult = result;
    
    // If this was the last attempt, break
    if (attempt > maxRetries) {
      break;
    }
    
    // For certain types of errors, don't retry
    if (result.details?.stage === 'response-validation' && 
        result.details?.confidence === 0) {
      break;
    }
  }
  
  return lastResult;
}

/**
 * Gets current error statistics and monitoring data
 * @returns {Object} Error statistics and system health
 */
export function getSystemHealth() {
  const stats = monitorErrorRates();
  const memoryStats = memoryMonitor.getStats();
  
  return {
    errorStats: stats,
    memoryStats: memoryStats,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage()
  };
}

/**
 * Utility function to test the parsing pipeline with sample data
 * @param {string} testResponse - Test response to process
 * @returns {Object} Test result
 */
export function testPipeline(testResponse) {
  return processResponse(testResponse, {
    modelUsed: 'test',
    filters: { test: true }
  });
}