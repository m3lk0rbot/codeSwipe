/**
 * Progressive JSON Parser
 * Implements multiple parsing strategies with fallback mechanisms
 */

/**
 * Attempts direct JSON.parse with error handling
 * @param {string} text - Text to parse
 * @returns {Object|null} Parsed object or null if failed
 */
export function directParse(text) {
  if (!text || typeof text !== 'string') return null;
  
  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

/**
 * Extracts the first valid JSON object from mixed content
 * Handles nested braces and quoted strings properly
 * @param {string} text - Text containing JSON object
 * @returns {Object|null} Extracted and parsed object or null if failed
 */
export function extractFirstObject(text) {
  if (!text || typeof text !== 'string') return null;
  
  const start = text.indexOf('{');
  if (start < 0) return null;
  
  let depth = 0;
  let inString = false;
  let escapeNext = false;
  
  for (let i = start; i < text.length; i++) {
    const char = text[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (inString) {
      if (char === '"') {
        inString = false;
      }
    } else {
      if (char === '"') {
        inString = true;
      } else if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0) {
          const jsonStr = text.slice(start, i + 1);
          try {
            return JSON.parse(jsonStr);
          } catch (error) {
            return null;
          }
        }
      }
    }
  }
  
  return null;
}

/**
 * Repairs common JSON syntax issues
 * @param {string} text - Potentially malformed JSON text
 * @returns {string} Repaired JSON text
 */
export function repairCommonIssues(text) {
  if (!text || typeof text !== 'string') return '';
  
  let repaired = text;
  
  // Fix trailing commas
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
  
  // Fix missing quotes around property names
  repaired = repaired.replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
  
  // Fix single quotes to double quotes (but preserve escaped quotes)
  repaired = repaired.replace(/(?<!\\)'([^'\\]*(\\.[^'\\]*)*)'(?=\s*[,:\]}])/g, '"$1"');
  
  // Fix unescaped quotes in strings
  repaired = repaired.replace(/"([^"]*)"([^"]*)"([^"]*)"(?=\s*[,:\]}])/g, '"$1\\"$2\\"$3"');
  
  // Fix incomplete strings at end of text
  const lastQuote = repaired.lastIndexOf('"');
  const lastBrace = Math.max(repaired.lastIndexOf('}'), repaired.lastIndexOf(']'));
  if (lastQuote > lastBrace && !repaired.slice(lastQuote + 1).includes('"')) {
    repaired += '"';
  }
  
  // Fix incomplete objects/arrays
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escapeNext = false;
  
  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i];
    
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    
    if (inString) {
      if (char === '"') {
        inString = false;
      }
    } else {
      if (char === '"') {
        inString = true;
      } else if (char === '{') {
        openBraces++;
      } else if (char === '}') {
        openBraces--;
      } else if (char === '[') {
        openBrackets++;
      } else if (char === ']') {
        openBrackets--;
      }
    }
  }
  
  // Close unclosed strings
  if (inString) {
    repaired += '"';
  }
  
  // Close unclosed braces and brackets
  repaired += '}}'.repeat(Math.max(0, openBraces));
  repaired += ']]'.repeat(Math.max(0, openBrackets));
  
  return repaired;
}

/**
 * Attempts to parse JSON using multiple strategies
 * @param {string} sanitizedText - Pre-sanitized text to parse
 * @returns {Object} Parse result with success status, data, method used, and error if any
 */
export function parse(sanitizedText) {
  if (!sanitizedText || typeof sanitizedText !== 'string') {
    return {
      success: false,
      data: null,
      method: 'none',
      error: 'Invalid input text'
    };
  }
  
  // Strategy 1: Direct parsing
  const directResult = directParse(sanitizedText);
  if (directResult !== null) {
    return {
      success: true,
      data: directResult,
      method: 'direct',
      error: null
    };
  }
  
  // Strategy 2: Extract first JSON object
  const extractedResult = extractFirstObject(sanitizedText);
  if (extractedResult !== null) {
    return {
      success: true,
      data: extractedResult,
      method: 'extracted',
      error: null
    };
  }
  
  // Strategy 3: Repair common issues and try again
  const repairedText = repairCommonIssues(sanitizedText);
  const repairedResult = directParse(repairedText);
  if (repairedResult !== null) {
    return {
      success: true,
      data: repairedResult,
      method: 'repaired',
      error: null
    };
  }
  
  // Strategy 4: Try extracting from repaired text
  const extractedRepairedResult = extractFirstObject(repairedText);
  if (extractedRepairedResult !== null) {
    return {
      success: true,
      data: extractedRepairedResult,
      method: 'extracted-repaired',
      error: null
    };
  }
  
  // All strategies failed
  return {
    success: false,
    data: null,
    method: 'failed',
    error: 'All parsing strategies failed'
  };
}