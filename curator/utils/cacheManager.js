/**
 * Cache Manager for performance optimization
 * Implements intelligent caching for fallback challenges and response compression
 */

import crypto from 'crypto';
import { memoryMonitor } from './memoryMonitor.js';

/**
 * In-memory cache with LRU eviction and compression
 */
class InMemoryCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 100; // Maximum number of entries
    this.maxMemoryMB = options.maxMemoryMB || 50; // Maximum memory usage in MB
    this.ttl = options.ttl || 30 * 60 * 1000; // 30 minutes default TTL
    this.compressionThreshold = options.compressionThreshold || 1024; // Compress entries > 1KB
    
    this.cache = new Map();
    this.accessOrder = new Map(); // Track access order for LRU
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      compressions: 0,
      totalSize: 0
    };
  }

  /**
   * Generate cache key from object
   */
  generateKey(data) {
    const serialized = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHash('md5').update(serialized).digest('hex');
  }

  /**
   * Compress data if it exceeds threshold
   */
  compressData(data) {
    const serialized = JSON.stringify(data);
    if (serialized.length > this.compressionThreshold) {
      // Simple compression using JSON minification and string compression
      const compressed = this.simpleCompress(serialized);
      this.stats.compressions++;
      return {
        compressed: true,
        data: compressed,
        originalSize: serialized.length,
        compressedSize: compressed.length
      };
    }
    return {
      compressed: false,
      data: serialized,
      originalSize: serialized.length,
      compressedSize: serialized.length
    };
  }

  /**
   * Simple string compression (basic implementation)
   */
  simpleCompress(str) {
    // Basic compression: remove extra whitespace and common patterns
    return str
      .replace(/\s+/g, ' ')
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
      .replace(/{\s*/g, '{')
      .replace(/\s*}/g, '}')
      .replace(/\[\s*/g, '[')
      .replace(/\s*]/g, ']')
      .trim();
  }

  /**
   * Decompress data
   */
  decompressData(entry) {
    if (entry.compressed) {
      return JSON.parse(entry.data);
    }
    return JSON.parse(entry.data);
  }

  /**
   * Check if cache needs cleanup due to memory pressure
   */
  needsCleanup() {
    const memoryUsage = memoryMonitor.getMemoryUsage();
    const cacheMemoryMB = this.estimateMemoryUsage();
    
    return (
      this.cache.size > this.maxSize ||
      cacheMemoryMB > this.maxMemoryMB ||
      memoryMonitor.isMemoryPressure()
    );
  }

  /**
   * Estimate memory usage of cache
   */
  estimateMemoryUsage() {
    let totalBytes = 0;
    for (const [key, entry] of this.cache) {
      totalBytes += key.length * 2; // UTF-16 encoding
      totalBytes += entry.data.length * 2;
      totalBytes += 200; // Overhead for object structure
    }
    return totalBytes / 1024 / 1024; // Convert to MB
  }

  /**
   * Evict least recently used entries
   */
  evictLRU(targetSize = null) {
    const target = targetSize || Math.floor(this.maxSize * 0.8); // Evict to 80% capacity
    
    // Sort by access time (oldest first)
    const sortedEntries = Array.from(this.accessOrder.entries())
      .sort((a, b) => a[1] - b[1]);
    
    let evicted = 0;
    for (const [key] of sortedEntries) {
      if (this.cache.size <= target) break;
      
      this.cache.delete(key);
      this.accessOrder.delete(key);
      evicted++;
      this.stats.evictions++;
    }
    
    console.log(`Cache: Evicted ${evicted} entries, size now: ${this.cache.size}`);
  }

  /**
   * Set cache entry
   */
  set(key, value, customTTL = null) {
    const cacheKey = typeof key === 'string' ? key : this.generateKey(key);
    const ttl = customTTL || this.ttl;
    
    // Compress data if needed
    const compressed = this.compressData(value);
    
    const entry = {
      ...compressed,
      timestamp: Date.now(),
      ttl: ttl,
      accessCount: 0
    };
    
    // Check if cleanup is needed before adding
    if (this.needsCleanup()) {
      this.evictLRU();
    }
    
    this.cache.set(cacheKey, entry);
    this.accessOrder.set(cacheKey, Date.now());
    
    return cacheKey;
  }

  /**
   * Get cache entry
   */
  get(key) {
    const cacheKey = typeof key === 'string' ? key : this.generateKey(key);
    const entry = this.cache.get(cacheKey);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(cacheKey);
      this.accessOrder.delete(cacheKey);
      this.stats.misses++;
      return null;
    }
    
    // Update access tracking
    entry.accessCount++;
    this.accessOrder.set(cacheKey, Date.now());
    this.stats.hits++;
    
    // Decompress and return data
    try {
      return this.decompressData(entry);
    } catch (error) {
      console.warn('Cache decompression failed:', error.message);
      this.cache.delete(cacheKey);
      this.accessOrder.delete(cacheKey);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Check if key exists in cache
   */
  has(key) {
    const cacheKey = typeof key === 'string' ? key : this.generateKey(key);
    const entry = this.cache.get(cacheKey);
    
    if (!entry) return false;
    
    // Check TTL
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(cacheKey);
      this.accessOrder.delete(cacheKey);
      return false;
    }
    
    return true;
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
    this.accessOrder.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      compressions: 0,
      totalSize: 0
    };
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;
    
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      size: this.cache.size,
      maxSize: this.maxSize,
      memoryUsageMB: this.estimateMemoryUsage().toFixed(2),
      maxMemoryMB: this.maxMemoryMB
    };
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`Cache: Cleaned up ${cleaned} expired entries`);
    }
    
    return cleaned;
  }
}

/**
 * Performance benchmarking utilities
 */
class PerformanceBenchmark {
  constructor() {
    this.benchmarks = new Map();
    this.stats = {
      totalOperations: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0
    };
  }

  /**
   * Start timing an operation
   */
  start(operationId) {
    this.benchmarks.set(operationId, {
      startTime: process.hrtime.bigint(),
      startMemory: process.memoryUsage().heapUsed
    });
  }

  /**
   * End timing an operation and return results
   */
  end(operationId, metadata = {}) {
    const benchmark = this.benchmarks.get(operationId);
    if (!benchmark) {
      console.warn(`No benchmark found for operation: ${operationId}`);
      return null;
    }

    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage().heapUsed;
    
    const durationNs = endTime - benchmark.startTime;
    const durationMs = Number(durationNs) / 1000000; // Convert to milliseconds
    const memoryDelta = endMemory - benchmark.startMemory;

    const result = {
      operationId,
      durationMs: Math.round(durationMs * 100) / 100,
      memoryDeltaBytes: memoryDelta,
      memoryDeltaMB: Math.round(memoryDelta / 1024 / 1024 * 100) / 100,
      timestamp: new Date().toISOString(),
      ...metadata
    };

    // Update global stats
    this.stats.totalOperations++;
    this.stats.averageResponseTime = (
      (this.stats.averageResponseTime * (this.stats.totalOperations - 1) + durationMs) / 
      this.stats.totalOperations
    );
    this.stats.minResponseTime = Math.min(this.stats.minResponseTime, durationMs);
    this.stats.maxResponseTime = Math.max(this.stats.maxResponseTime, durationMs);

    this.benchmarks.delete(operationId);
    return result;
  }

  /**
   * Get performance statistics
   */
  getStats() {
    return {
      ...this.stats,
      averageResponseTime: Math.round(this.stats.averageResponseTime * 100) / 100,
      minResponseTime: this.stats.minResponseTime === Infinity ? 0 : this.stats.minResponseTime,
      activeOperations: this.benchmarks.size
    };
  }

  /**
   * Reset statistics
   */
  reset() {
    this.benchmarks.clear();
    this.stats = {
      totalOperations: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0
    };
  }
}

/**
 * Rate limiting utility
 */
class RateLimiter {
  constructor(options = {}) {
    this.maxRequests = options.maxRequests || 100; // requests per window
    this.windowMs = options.windowMs || 60 * 1000; // 1 minute window
    this.requests = new Map(); // IP -> request timestamps
  }

  /**
   * Check if request is allowed
   */
  isAllowed(identifier) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Get existing requests for this identifier
    let requestTimes = this.requests.get(identifier) || [];
    
    // Remove old requests outside the window
    requestTimes = requestTimes.filter(time => time > windowStart);
    
    // Check if under limit
    if (requestTimes.length >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: requestTimes[0] + this.windowMs
      };
    }
    
    // Add current request
    requestTimes.push(now);
    this.requests.set(identifier, requestTimes);
    
    return {
      allowed: true,
      remaining: this.maxRequests - requestTimes.length,
      resetTime: now + this.windowMs
    };
  }

  /**
   * Get rate limit status
   */
  getStatus(identifier) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    let requestTimes = this.requests.get(identifier) || [];
    requestTimes = requestTimes.filter(time => time > windowStart);
    
    return {
      requests: requestTimes.length,
      maxRequests: this.maxRequests,
      remaining: this.maxRequests - requestTimes.length,
      windowMs: this.windowMs
    };
  }

  /**
   * Clean up old entries
   */
  cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    let cleaned = 0;
    
    for (const [identifier, requestTimes] of this.requests) {
      const validRequests = requestTimes.filter(time => time > windowStart);
      
      if (validRequests.length === 0) {
        this.requests.delete(identifier);
        cleaned++;
      } else if (validRequests.length !== requestTimes.length) {
        this.requests.set(identifier, validRequests);
      }
    }
    
    return cleaned;
  }
}

// Export singleton instances
export const fallbackCache = new InMemoryCache({
  maxSize: 50,
  maxMemoryMB: 20,
  ttl: 60 * 60 * 1000 // 1 hour for fallback challenges
});

export const responseCache = new InMemoryCache({
  maxSize: 100,
  maxMemoryMB: 30,
  ttl: 30 * 60 * 1000 // 30 minutes for API responses
});

export const performanceBenchmark = new PerformanceBenchmark();

export const rateLimiter = new RateLimiter({
  maxRequests: 60, // 60 requests per minute
  windowMs: 60 * 1000
});

// Start periodic cleanup
setInterval(() => {
  fallbackCache.cleanup();
  responseCache.cleanup();
  rateLimiter.cleanup();
}, 5 * 60 * 1000); // Every 5 minutes

export { InMemoryCache, PerformanceBenchmark, RateLimiter };