/**
 * Configuration management for the curator service
 * Handles environment variables and feature flags
 */

// Default configuration values
const DEFAULT_CONFIG = {
  // Retry configuration
  maxRetries: 3,
  retryBaseDelay: 1000,
  retryMaxDelay: 5000,
  retryBackoffMultiplier: 1.5,
  
  // Timeout configuration
  apiTimeout: 30000, // 30 seconds
  requestTimeout: 60000, // 1 minute total request timeout
  
  // Feature flags
  enableFallback: true,
  enableRetry: true,
  enableProgressiveParsing: true,
  enableErrorLogging: true,
  
  // Fallback configuration
  fallbackThreshold: 2, // Number of failures before using fallback
  fallbackCacheSize: 50, // Number of fallback challenges to keep in memory
  
  // Logging configuration
  logLevel: 'info', // error, warn, info, debug
  enableStructuredLogging: true,
  
  // Performance configuration
  maxResponseSize: 1024 * 1024, // 1MB max response size
  enableResponseCaching: false,
  
  // Health check configuration
  healthCheckInterval: 60000, // 1 minute
  enableHealthMetrics: true
};

/**
 * Parse boolean environment variable
 */
function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'boolean') return value;
  const str = String(value).toLowerCase().trim();
  return str === 'true' || str === '1' || str === 'yes' || str === 'on';
}

/**
 * Parse integer environment variable
 */
function parseInteger(value, defaultValue = 0) {
  if (value === undefined || value === null) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Parse float environment variable
 */
function parseFloat(value, defaultValue = 0.0) {
  if (value === undefined || value === null) return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Validate log level
 */
function validateLogLevel(level) {
  const validLevels = ['error', 'warn', 'info', 'debug'];
  return validLevels.includes(level) ? level : 'info';
}

/**
 * Load configuration from environment variables
 */
function loadConfig() {
  const config = { ...DEFAULT_CONFIG };
  
  // Retry configuration
  config.maxRetries = parseInteger(process.env.CURATOR_MAX_RETRIES, config.maxRetries);
  config.retryBaseDelay = parseInteger(process.env.CURATOR_RETRY_BASE_DELAY, config.retryBaseDelay);
  config.retryMaxDelay = parseInteger(process.env.CURATOR_RETRY_MAX_DELAY, config.retryMaxDelay);
  config.retryBackoffMultiplier = parseFloat(process.env.CURATOR_RETRY_BACKOFF_MULTIPLIER, config.retryBackoffMultiplier);
  
  // Timeout configuration
  config.apiTimeout = parseInteger(process.env.CURATOR_API_TIMEOUT, config.apiTimeout);
  config.requestTimeout = parseInteger(process.env.CURATOR_REQUEST_TIMEOUT, config.requestTimeout);
  
  // Feature flags
  config.enableFallback = parseBoolean(process.env.CURATOR_ENABLE_FALLBACK, config.enableFallback);
  config.enableRetry = parseBoolean(process.env.CURATOR_ENABLE_RETRY, config.enableRetry);
  config.enableProgressiveParsing = parseBoolean(process.env.CURATOR_ENABLE_PROGRESSIVE_PARSING, config.enableProgressiveParsing);
  config.enableErrorLogging = parseBoolean(process.env.CURATOR_ENABLE_ERROR_LOGGING, config.enableErrorLogging);
  
  // Fallback configuration
  config.fallbackThreshold = parseInteger(process.env.CURATOR_FALLBACK_THRESHOLD, config.fallbackThreshold);
  config.fallbackCacheSize = parseInteger(process.env.CURATOR_FALLBACK_CACHE_SIZE, config.fallbackCacheSize);
  
  // Logging configuration
  config.logLevel = validateLogLevel(process.env.CURATOR_LOG_LEVEL || process.env.LOG_LEVEL);
  config.enableStructuredLogging = parseBoolean(process.env.CURATOR_ENABLE_STRUCTURED_LOGGING, config.enableStructuredLogging);
  
  // Performance configuration
  config.maxResponseSize = parseInteger(process.env.CURATOR_MAX_RESPONSE_SIZE, config.maxResponseSize);
  config.enableResponseCaching = parseBoolean(process.env.CURATOR_ENABLE_RESPONSE_CACHING, config.enableResponseCaching);
  
  // Health check configuration
  config.healthCheckInterval = parseInteger(process.env.CURATOR_HEALTH_CHECK_INTERVAL, config.healthCheckInterval);
  config.enableHealthMetrics = parseBoolean(process.env.CURATOR_ENABLE_HEALTH_METRICS, config.enableHealthMetrics);
  
  // Environment-specific overrides
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (nodeEnv === 'development') {
    config.logLevel = 'debug';
    config.enableStructuredLogging = false;
  } else if (nodeEnv === 'production') {
    config.logLevel = process.env.CURATOR_LOG_LEVEL || 'info';
    config.enableStructuredLogging = true;
  }
  
  return config;
}

/**
 * Get current configuration
 */
let currentConfig = null;

export function getConfig() {
  if (!currentConfig) {
    currentConfig = loadConfig();
  }
  return currentConfig;
}

/**
 * Reload configuration (useful for testing or runtime updates)
 */
export function reloadConfig() {
  currentConfig = loadConfig();
  return currentConfig;
}

/**
 * Get a specific configuration value
 */
export function getConfigValue(key, defaultValue = undefined) {
  const config = getConfig();
  return config[key] !== undefined ? config[key] : defaultValue;
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(featureName) {
  const config = getConfig();
  const key = `enable${featureName.charAt(0).toUpperCase()}${featureName.slice(1)}`;
  return config[key] === true;
}

/**
 * Get configuration summary for health checks
 */
export function getConfigSummary() {
  const config = getConfig();
  return {
    environment: process.env.NODE_ENV || 'development',
    logLevel: config.logLevel,
    features: {
      fallback: config.enableFallback,
      retry: config.enableRetry,
      progressiveParsing: config.enableProgressiveParsing,
      errorLogging: config.enableErrorLogging,
      healthMetrics: config.enableHealthMetrics
    },
    limits: {
      maxRetries: config.maxRetries,
      apiTimeout: config.apiTimeout,
      maxResponseSize: config.maxResponseSize,
      fallbackThreshold: config.fallbackThreshold
    }
  };
}

export default {
  getConfig,
  reloadConfig,
  getConfigValue,
  isFeatureEnabled,
  getConfigSummary
};