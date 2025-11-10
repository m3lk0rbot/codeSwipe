/**
 * Memory monitoring and cleanup utilities for performance optimization
 */

class MemoryMonitor {
  constructor(options = {}) {
    this.maxMemoryThreshold = options.maxMemoryThreshold || 100 * 1024 * 1024; // 100MB default
    this.gcThreshold = options.gcThreshold || 0.8; // Trigger GC at 80% of threshold
    this.monitoringInterval = options.monitoringInterval || 30000; // 30 seconds
    this.isMonitoring = false;
    this.memoryStats = {
      peak: 0,
      current: 0,
      gcCount: 0,
      lastGC: null
    };
  }

  /**
   * Get current memory usage statistics
   */
  getMemoryUsage() {
    const usage = process.memoryUsage();
    this.memoryStats.current = usage.heapUsed;
    
    if (usage.heapUsed > this.memoryStats.peak) {
      this.memoryStats.peak = usage.heapUsed;
    }

    return {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss,
      heapUsedMB: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100,
      heapTotalMB: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100,
      memoryUtilization: Math.round((usage.heapUsed / usage.heapTotal) * 100)
    };
  }

  /**
   * Check if memory usage is approaching threshold
   */
  isMemoryPressure() {
    const usage = this.getMemoryUsage();
    return usage.heapUsed > (this.maxMemoryThreshold * this.gcThreshold);
  }

  /**
   * Force garbage collection if available
   */
  forceGC() {
    if (global.gc) {
      try {
        global.gc();
        this.memoryStats.gcCount++;
        this.memoryStats.lastGC = new Date();
        console.log('Manual garbage collection triggered');
        return true;
      } catch (error) {
        console.warn('Failed to trigger garbage collection:', error.message);
        return false;
      }
    }
    return false;
  }

  /**
   * Start memory monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitoringTimer = setInterval(() => {
      const usage = this.getMemoryUsage();
      
      if (this.isMemoryPressure()) {
        console.warn(`Memory pressure detected: ${usage.heapUsedMB}MB used (${usage.memoryUtilization}%)`);
        this.forceGC();
      }
      
      // Log memory stats periodically in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`Memory: ${usage.heapUsedMB}MB used, ${usage.memoryUtilization}% utilization`);
      }
    }, this.monitoringInterval);
    
    console.log('Memory monitoring started');
  }

  /**
   * Stop memory monitoring
   */
  stopMonitoring() {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }
    this.isMonitoring = false;
    console.log('Memory monitoring stopped');
  }

  /**
   * Get memory statistics summary
   */
  getStats() {
    return {
      ...this.memoryStats,
      current: this.getMemoryUsage(),
      isMonitoring: this.isMonitoring,
      thresholds: {
        max: this.maxMemoryThreshold,
        gcTrigger: this.maxMemoryThreshold * this.gcThreshold
      }
    };
  }

  /**
   * Clean up large objects and trigger GC if needed
   */
  cleanup(largeObjects = []) {
    // Clear references to large objects
    largeObjects.forEach(obj => {
      if (obj && typeof obj === 'object') {
        Object.keys(obj).forEach(key => {
          delete obj[key];
        });
      }
    });

    // Force GC if memory pressure is high
    if (this.isMemoryPressure()) {
      this.forceGC();
    }
  }
}

/**
 * Streaming JSON parser for large responses
 */
class StreamingJSONParser {
  constructor(options = {}) {
    this.maxChunkSize = options.maxChunkSize || 64 * 1024; // 64KB chunks
    this.maxTotalSize = options.maxTotalSize || 10 * 1024 * 1024; // 10MB max
  }

  /**
   * Parse JSON from a large string in chunks to reduce memory pressure
   */
  parseInChunks(jsonString) {
    if (!jsonString || typeof jsonString !== 'string') {
      throw new Error('Invalid input for streaming parser');
    }

    // If string is small enough, use regular parsing
    if (jsonString.length <= this.maxChunkSize) {
      return JSON.parse(jsonString);
    }

    // Check total size limit
    if (jsonString.length > this.maxTotalSize) {
      throw new Error(`Response too large: ${jsonString.length} bytes exceeds limit of ${this.maxTotalSize} bytes`);
    }

    // For very large responses, try to find and extract the JSON object
    // without loading the entire string into memory at once
    return this.extractJSONFromLargeString(jsonString);
  }

  /**
   * Extract JSON object from large string using streaming approach
   */
  extractJSONFromLargeString(text) {
    let braceCount = 0;
    let inString = false;
    let escaped = false;
    let jsonStart = -1;
    let jsonEnd = -1;

    // Process in chunks to avoid memory pressure
    const chunkSize = this.maxChunkSize;
    let processedLength = 0;

    while (processedLength < text.length) {
      const chunk = text.slice(processedLength, processedLength + chunkSize);
      
      for (let i = 0; i < chunk.length; i++) {
        const char = chunk[i];
        const absoluteIndex = processedLength + i;

        if (escaped) {
          escaped = false;
          continue;
        }

        if (char === '\\' && inString) {
          escaped = true;
          continue;
        }

        if (char === '"' && !escaped) {
          inString = !inString;
          continue;
        }

        if (!inString) {
          if (char === '{') {
            if (jsonStart === -1) {
              jsonStart = absoluteIndex;
            }
            braceCount++;
          } else if (char === '}') {
            braceCount--;
            if (braceCount === 0 && jsonStart !== -1) {
              jsonEnd = absoluteIndex;
              break;
            }
          }
        }
      }

      if (jsonEnd !== -1) break;
      processedLength += chunkSize;
    }

    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error('No valid JSON object found in response');
    }

    const jsonString = text.slice(jsonStart, jsonEnd + 1);
    return JSON.parse(jsonString);
  }
}

/**
 * Optimized string operations for sanitization
 */
class OptimizedStringOps {
  constructor() {
    // Pre-compile regex patterns for better performance
    this.patterns = {
      smartQuotes: /[""]/g,
      smartApostrophes: /['']/g,
      markdownBlocks: /```[\s\S]*?```/g,
      lineBreaks: /\r?\n/g,
      multipleSpaces: /\s+/g,
      trailingCommas: /,(\s*[}\]])/g
    };
  }

  /**
   * Optimized sanitization using pre-compiled patterns and minimal string operations
   */
  sanitizeEfficiently(text) {
    if (!text || typeof text !== 'string') return text;

    // Use a single pass with multiple replacements to minimize string operations
    return text
      .replace(this.patterns.markdownBlocks, '') // Remove markdown blocks first
      .replace(this.patterns.smartQuotes, '"')   // Fix smart quotes
      .replace(this.patterns.smartApostrophes, "'") // Fix smart apostrophes
      .replace(this.patterns.trailingCommas, '$1') // Remove trailing commas
      .replace(this.patterns.lineBreaks, '\\n')    // Escape line breaks
      .trim();
  }

  /**
   * Memory-efficient string cleaning for large responses
   */
  cleanLargeString(text, maxSize = 1024 * 1024) {
    if (!text) return text;
    
    // If string is too large, truncate it first
    if (text.length > maxSize) {
      console.warn(`Response truncated from ${text.length} to ${maxSize} characters`);
      text = text.slice(0, maxSize);
    }

    return this.sanitizeEfficiently(text);
  }
}

// Export singleton instances
export const memoryMonitor = new MemoryMonitor();
export const streamingParser = new StreamingJSONParser();
export const stringOps = new OptimizedStringOps();

export { MemoryMonitor, StreamingJSONParser, OptimizedStringOps };