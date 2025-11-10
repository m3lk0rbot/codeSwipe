/**
 * Retry Handler with Exponential Backoff
 * Implements intelligent retry logic with circuit breaker pattern
 */

/**
 * Default retry configuration
 */
const DEFAULT_CONFIG = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 5000,
  backoffMultiplier: 1.5,
  jitter: true,
  circuitBreakerThreshold: 5,
  circuitBreakerTimeout: 30000
};

/**
 * Error types that determine retry strategy
 */
export const ErrorTypes = {
  NETWORK: 'network',
  PARSING: 'parsing',
  API_LIMIT: 'api_limit',
  VALIDATION: 'validation',
  UNKNOWN: 'unknown'
};

/**
 * Circuit breaker states
 */
const CircuitState = {
  CLOSED: 'closed',
  OPEN: 'open',
  HALF_OPEN: 'half_open'
};

/**
 * Global circuit breaker state
 */
let circuitBreaker = {
  state: CircuitState.CLOSED,
  failureCount: 0,
  lastFailureTime: null,
  successCount: 0
};

/**
 * Classify error type based on error message and properties
 */
function classifyError(error) {
  const message = error.message?.toLowerCase() || '';
  
  if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
    return ErrorTypes.NETWORK;
  }
  
  if (message.includes('json') || message.includes('parse') || message.includes('syntax')) {
    return ErrorTypes.PARSING;
  }
  
  if (message.includes('quota') || message.includes('limit') || message.includes('rate')) {
    return ErrorTypes.API_LIMIT;
  }
  
  if (message.includes('validation') || message.includes('schema') || message.includes('required')) {
    return ErrorTypes.VALIDATION;
  }
  
  return ErrorTypes.UNKNOWN;
}

/**
 * Determine if error should be retried based on type
 */
function shouldRetry(error, attempt, maxAttempts) {
  if (attempt >= maxAttempts) {
    return false;
  }
  
  const errorType = classifyError(error);
  
  switch (errorType) {
    case ErrorTypes.NETWORK:
      return true; // Always retry network errors
    case ErrorTypes.PARSING:
      return attempt < 2; // Retry parsing errors once
    case ErrorTypes.API_LIMIT:
      return true; // Retry API limits with backoff
    case ErrorTypes.VALIDATION:
      return false; // Don't retry validation errors
    case ErrorTypes.UNKNOWN:
      return attempt < 2; // Retry unknown errors once
    default:
      return false;
  }
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt, config = DEFAULT_CONFIG) {
  const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay);
  
  if (config.jitter) {
    // Add random jitter (±25%)
    const jitterRange = cappedDelay * 0.25;
    const jitter = (Math.random() - 0.5) * 2 * jitterRange;
    return Math.max(0, cappedDelay + jitter);
  }
  
  return cappedDelay;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check circuit breaker state
 */
function checkCircuitBreaker(config = DEFAULT_CONFIG) {
  const now = Date.now();
  
  switch (circuitBreaker.state) {
    case CircuitState.OPEN:
      if (now - circuitBreaker.lastFailureTime > config.circuitBreakerTimeout) {
        circuitBreaker.state = CircuitState.HALF_OPEN;
        circuitBreaker.successCount = 0;
        return true; // Allow one attempt
      }
      return false; // Circuit is open, reject immediately
      
    case CircuitState.HALF_OPEN:
      return true; // Allow attempts in half-open state
      
    case CircuitState.CLOSED:
    default:
      return true; // Normal operation
  }
}

/**
 * Update circuit breaker on success
 */
function recordSuccess() {
  if (circuitBreaker.state === CircuitState.HALF_OPEN) {
    circuitBreaker.successCount++;
    if (circuitBreaker.successCount >= 2) {
      // Reset circuit breaker after successful attempts
      circuitBreaker.state = CircuitState.CLOSED;
      circuitBreaker.failureCount = 0;
      circuitBreaker.lastFailureTime = null;
    }
  } else if (circuitBreaker.state === CircuitState.CLOSED) {
    // Reset failure count on success
    circuitBreaker.failureCount = Math.max(0, circuitBreaker.failureCount - 1);
  }
}

/**
 * Update circuit breaker on failure
 */
function recordFailure(config = DEFAULT_CONFIG) {
  circuitBreaker.failureCount++;
  circuitBreaker.lastFailureTime = Date.now();
  
  if (circuitBreaker.failureCount >= config.circuitBreakerThreshold) {
    circuitBreaker.state = CircuitState.OPEN;
  }
}

/**
 * Main retry function with exponential backoff
 */
export async function retryWithBackoff(asyncFunction, config = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError;
  
  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      // Check circuit breaker
      if (!checkCircuitBreaker(finalConfig)) {
        throw new Error('Circuit breaker is open - too many recent failures');
      }
      
      // Execute the function
      const result = await asyncFunction(attempt);
      
      // Record success
      recordSuccess();
      
      return result;
      
    } catch (error) {
      lastError = error;
      
      // Record failure
      recordFailure(finalConfig);
      
      // Check if we should retry
      if (!shouldRetry(error, attempt, finalConfig.maxAttempts)) {
        break;
      }
      
      // Calculate and apply delay before next attempt
      if (attempt < finalConfig.maxAttempts) {
        const delay = calculateDelay(attempt, finalConfig);
        console.log(`Retry attempt ${attempt} failed: ${error.message}. Retrying in ${Math.round(delay)}ms...`);
        await sleep(delay);
      }
    }
  }
  
  // All attempts failed
  throw new Error(`All ${finalConfig.maxAttempts} retry attempts failed. Last error: ${lastError.message}`);
}

/**
 * Get current circuit breaker status
 */
export function getCircuitBreakerStatus() {
  return {
    state: circuitBreaker.state,
    failureCount: circuitBreaker.failureCount,
    lastFailureTime: circuitBreaker.lastFailureTime,
    successCount: circuitBreaker.successCount
  };
}

/**
 * Reset circuit breaker (for testing or manual intervention)
 */
export function resetCircuitBreaker() {
  circuitBreaker = {
    state: CircuitState.CLOSED,
    failureCount: 0,
    lastFailureTime: null,
    successCount: 0
  };
}

/**
 * Create a retry wrapper for a specific function
 */
export function createRetryWrapper(asyncFunction, config = {}) {
  return async (...args) => {
    return retryWithBackoff(
      (attempt) => asyncFunction(...args, { attempt }),
      config
    );
  };
}