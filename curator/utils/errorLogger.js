/**
 * Error Logging and Tracking Infrastructure
 * Provides comprehensive error logging with context information
 */

/**
 * Error types for categorization
 */
export const ErrorTypes = {
  PARSING: 'parsing',
  API: 'api', 
  VALIDATION: 'validation',
  NETWORK: 'network',
  TIMEOUT: 'timeout'
};

/**
 * In-memory error tracking for metrics
 */
class ErrorTracker {
  constructor() {
    this.errors = [];
    this.maxErrors = 1000; // Keep last 1000 errors
    this.startTime = Date.now();
  }
  
  /**
   * Adds an error to the tracking system
   * @param {Object} errorLog - Error log entry
   */
  addError(errorLog) {
    this.errors.push(errorLog);
    
    // Keep only the most recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }
  }
  
  /**
   * Gets error statistics for a time period
   * @param {number} periodMs - Time period in milliseconds
   * @returns {Object} Error statistics
   */
  getStats(periodMs = 3600000) { // Default 1 hour
    const cutoff = Date.now() - periodMs;
    const recentErrors = this.errors.filter(error => error.timestamp >= cutoff);
    
    const stats = {
      total: recentErrors.length,
      byType: {},
      byMethod: {},
      successRate: 0,
      averageResponseTime: 0
    };
    
    // Count by error type
    recentErrors.forEach(error => {
      stats.byType[error.errorType] = (stats.byType[error.errorType] || 0) + 1;
      if (error.parsingMethod) {
        stats.byMethod[error.parsingMethod] = (stats.byMethod[error.parsingMethod] || 0) + 1;
      }
    });
    
    return stats;
  }
  
  /**
   * Checks if error rate exceeds threshold
   * @param {number} threshold - Maximum errors per hour
   * @param {number} periodMs - Time period to check
   * @returns {boolean} True if threshold exceeded
   */
  exceedsThreshold(threshold = 5, periodMs = 3600000) {
    const stats = this.getStats(periodMs);
    return stats.total > threshold;
  }
  
  /**
   * Gets recent errors for debugging
   * @param {number} count - Number of recent errors to return
   * @returns {Array} Recent error logs
   */
  getRecentErrors(count = 10) {
    return this.errors.slice(-count);
  }
}

// Global error tracker instance
const errorTracker = new ErrorTracker();

/**
 * Logs a parsing error with context
 * @param {Error} error - The error that occurred
 * @param {Object} context - Additional context information
 */
export function logParsingError(error, context = {}) {
  const errorLog = {
    timestamp: Date.now(),
    errorType: ErrorTypes.PARSING,
    errorMessage: error.message || String(error),
    rawResponse: context.rawResponse ? context.rawResponse.substring(0, 1000) : null, // Limit size
    responseLength: context.rawResponse ? context.rawResponse.length : null,
    parsingMethod: context.parsingMethod || 'unknown',
    attempt: context.attempt || 1,
    resolved: false,
    stack: error.stack,
    additionalContext: {
      filters: context.filters,
      modelUsed: context.modelUsed,
      processingTime: context.processingTime
    }
  };
  
  // Log to console with structured format
  console.error('JSON Parsing Error:', {
    message: errorLog.errorMessage,
    method: errorLog.parsingMethod,
    attempt: errorLog.attempt,
    responseLength: errorLog.responseLength,
    timestamp: new Date(errorLog.timestamp).toISOString()
  });
  
  // Add to error tracker
  errorTracker.addError(errorLog);
  
  return errorLog;
}

/**
 * Logs an API error with context
 * @param {Error} error - The error that occurred
 * @param {Object} context - Additional context information
 */
export function logApiError(error, context = {}) {
  const errorLog = {
    timestamp: Date.now(),
    errorType: ErrorTypes.API,
    errorMessage: error.message || String(error),
    attempt: context.attempt || 1,
    resolved: false,
    stack: error.stack,
    additionalContext: {
      modelUsed: context.modelUsed,
      filters: context.filters,
      statusCode: context.statusCode,
      requestDuration: context.requestDuration
    }
  };
  
  console.error('API Error:', {
    message: errorLog.errorMessage,
    model: context.modelUsed,
    attempt: errorLog.attempt,
    statusCode: context.statusCode,
    timestamp: new Date(errorLog.timestamp).toISOString()
  });
  
  errorTracker.addError(errorLog);
  
  return errorLog;
}

/**
 * Logs a validation error with context
 * @param {string} message - Error message
 * @param {Object} context - Additional context information
 */
export function logValidationError(message, context = {}) {
  const errorLog = {
    timestamp: Date.now(),
    errorType: ErrorTypes.VALIDATION,
    errorMessage: message,
    attempt: context.attempt || 1,
    resolved: false,
    additionalContext: {
      validationIssues: context.validationIssues,
      confidence: context.confidence,
      data: context.data ? JSON.stringify(context.data).substring(0, 500) : null
    }
  };
  
  console.error('Validation Error:', {
    message: errorLog.errorMessage,
    issues: context.validationIssues,
    confidence: context.confidence,
    timestamp: new Date(errorLog.timestamp).toISOString()
  });
  
  errorTracker.addError(errorLog);
  
  return errorLog;
}

/**
 * Logs successful parsing for metrics
 * @param {Object} context - Context information about successful parsing
 */
export function logSuccess(context = {}) {
  console.log('Parsing Success:', {
    method: context.parsingMethod || 'unknown',
    responseLength: context.responseLength,
    processingTime: context.processingTime,
    timestamp: new Date().toISOString()
  });
}

/**
 * Gets error statistics
 * @param {number} periodMs - Time period in milliseconds
 * @returns {Object} Error statistics
 */
export function getErrorStats(periodMs = 3600000) {
  return errorTracker.getStats(periodMs);
}

/**
 * Checks if error threshold is exceeded
 * @param {number} threshold - Maximum errors per period
 * @param {number} periodMs - Time period in milliseconds
 * @returns {boolean} True if threshold exceeded
 */
export function shouldAlert(threshold = 5, periodMs = 3600000) {
  return errorTracker.exceedsThreshold(threshold, periodMs);
}

/**
 * Gets recent errors for debugging
 * @param {number} count - Number of recent errors to return
 * @returns {Array} Recent error logs
 */
export function getRecentErrors(count = 10) {
  return errorTracker.getRecentErrors(count);
}

/**
 * Sends alert notification (placeholder for actual implementation)
 * @param {Object} stats - Error statistics
 */
export function sendAlert(stats) {
  console.warn('ALERT: High error rate detected:', {
    totalErrors: stats.total,
    errorsByType: stats.byType,
    timestamp: new Date().toISOString()
  });
  
  // TODO: Implement actual alerting mechanism (email, Slack, etc.)
  // This could integrate with monitoring services like DataDog, New Relic, etc.
}

/**
 * Monitors error rates and sends alerts if thresholds are exceeded
 */
export function monitorErrorRates() {
  const stats = getErrorStats();
  
  if (shouldAlert()) {
    sendAlert(stats);
  }
  
  return stats;
}