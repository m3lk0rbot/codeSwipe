/**
 * Response Validation and Schema Checking
 * Validates API responses and ensures proper challenge structure
 */

/**
 * Validates if a response appears complete and has basic structure
 * @param {string} response - Raw response text
 * @returns {Object} Validation result with status and issues
 */
export function validateResponse(response) {
  const result = {
    isValid: true,
    issues: [],
    confidence: 1.0
  };
  
  if (!response || typeof response !== 'string') {
    result.isValid = false;
    result.issues.push('Response is empty or not a string');
    result.confidence = 0;
    return result;
  }
  
  // Check for minimum length
  if (response.length < 50) {
    result.isValid = false;
    result.issues.push('Response too short to contain valid challenge');
    result.confidence = 0;
    return result;
  }
  
  // Check for basic JSON structure indicators
  if (!response.includes('{') || !response.includes('}')) {
    result.isValid = false;
    result.issues.push('Response lacks basic JSON structure');
    result.confidence = 0.1;
    return result;
  }
  
  // Check for completeness indicators
  const hasOpenBrace = response.includes('{');
  const hasCloseBrace = response.includes('}');
  const braceBalance = (response.match(/\{/g) || []).length - (response.match(/\}/g) || []).length;
  
  if (braceBalance > 0) {
    result.issues.push('Response appears truncated (unmatched opening braces)');
    result.confidence = Math.max(0.3, result.confidence - 0.4);
  }
  
  if (braceBalance < 0) {
    result.issues.push('Response has extra closing braces');
    result.confidence = Math.max(0.5, result.confidence - 0.2);
  }
  
  // Check for common truncation patterns
  const truncationPatterns = [
    /\.\.\.$/, // Ends with ellipsis
    /[^"}]\s*$/, // Ends abruptly without proper closure
    /"[^"]*$/, // Ends with unterminated string
  ];
  
  for (const pattern of truncationPatterns) {
    if (pattern.test(response.trim())) {
      result.issues.push('Response appears to be truncated');
      result.confidence = Math.max(0.2, result.confidence - 0.3);
      break;
    }
  }
  
  // If confidence is too low, mark as invalid
  if (result.confidence < 0.5) {
    result.isValid = false;
  }
  
  return result;
}

/**
 * Checks if response is complete (not truncated)
 * @param {string} response - Response text to check
 * @returns {boolean} True if response appears complete
 */
export function isComplete(response) {
  const validation = validateResponse(response);
  return validation.isValid && validation.confidence > 0.7;
}

/**
 * Checks if response has valid JSON structure
 * @param {string} response - Response text to check
 * @returns {boolean} True if response has valid structure
 */
export function hasValidStructure(response) {
  if (!response || typeof response !== 'string') return false;
  
  // Must contain at least one complete JSON object structure
  const hasObject = response.includes('{') && response.includes('}');
  const hasQuotes = response.includes('"');
  
  return hasObject && hasQuotes;
}

/**
 * Validates challenge data against expected schema
 * @param {any} data - Parsed challenge data
 * @returns {Object} Validation result
 */
export function validate(data) {
  const result = {
    isValid: true,
    issues: [],
    confidence: 1.0
  };
  
  if (!data || typeof data !== 'object') {
    result.isValid = false;
    result.issues.push('Data is not an object');
    result.confidence = 0;
    return result;
  }
  
  // Check required fields
  const requiredFields = [
    'title',
    'language', 
    'difficulty',
    'description',
    'starterCode',
    'solution',
    'testCases'
  ];
  
  const missingFields = requiredFields.filter(field => !(field in data));
  if (missingFields.length > 0) {
    result.issues.push(`Missing required fields: ${missingFields.join(', ')}`);
    result.confidence -= 0.1 * missingFields.length;
  }
  
  // Validate field types and content
  if (data.title && typeof data.title !== 'string') {
    result.issues.push('Title must be a string');
    result.confidence -= 0.1;
  }
  
  if (data.language && typeof data.language !== 'string') {
    result.issues.push('Language must be a string');
    result.confidence -= 0.1;
  }
  
  if (data.difficulty && !['Beginner', 'Intermediate', 'Advanced', 'Expert'].includes(data.difficulty)) {
    result.issues.push('Difficulty must be one of: Beginner, Intermediate, Advanced, Expert');
    result.confidence -= 0.1;
  }
  
  if (data.description && typeof data.description !== 'string') {
    result.issues.push('Description must be a string');
    result.confidence -= 0.1;
  }
  
  if (data.starterCode && typeof data.starterCode !== 'string') {
    result.issues.push('StarterCode must be a string');
    result.confidence -= 0.1;
  }
  
  if (data.solution && typeof data.solution !== 'string') {
    result.issues.push('Solution must be a string');
    result.confidence -= 0.1;
  }
  
  if (data.testCases && !Array.isArray(data.testCases)) {
    result.issues.push('TestCases must be an array');
    result.confidence -= 0.2;
  } else if (data.testCases) {
    // Validate test case structure
    data.testCases.forEach((testCase, index) => {
      if (!testCase || typeof testCase !== 'object') {
        result.issues.push(`Test case ${index} must be an object`);
        result.confidence -= 0.05;
      } else {
        if (!('input' in testCase)) {
          result.issues.push(`Test case ${index} missing input field`);
          result.confidence -= 0.05;
        }
        if (!('expected' in testCase)) {
          result.issues.push(`Test case ${index} missing expected field`);
          result.confidence -= 0.05;
        }
      }
    });
  }
  
  // Check for minimum content quality
  if (data.title && data.title.length < 3) {
    result.issues.push('Title too short');
    result.confidence -= 0.05;
  }
  
  if (data.description && data.description.length < 20) {
    result.issues.push('Description too short');
    result.confidence -= 0.05;
  }
  
  if (data.starterCode && data.starterCode.length < 10) {
    result.issues.push('Starter code too short');
    result.confidence -= 0.05;
  }
  
  if (data.solution && data.solution.length < 20) {
    result.issues.push('Solution too short');
    result.confidence -= 0.05;
  }
  
  // If confidence is too low, mark as invalid
  if (result.confidence < 0.6) {
    result.isValid = false;
  }
  
  return result;
}

/**
 * Checks if challenge data has all required fields
 * @param {any} data - Challenge data to check
 * @returns {boolean} True if all required fields are present
 */
export function hasRequiredFields(data) {
  if (!data || typeof data !== 'object') return false;
  
  const requiredFields = [
    'title',
    'language',
    'difficulty', 
    'description',
    'starterCode',
    'solution',
    'testCases'
  ];
  
  return requiredFields.every(field => field in data);
}

/**
 * Normalizes data types to expected formats
 * @param {any} data - Challenge data to normalize
 * @returns {Object} Normalized challenge data
 */
export function normalizeTypes(data) {
  if (!data || typeof data !== 'object') return {};
  
  const normalized = { ...data };
  
  // Ensure strings are strings
  if (normalized.title && typeof normalized.title !== 'string') {
    normalized.title = String(normalized.title);
  }
  
  if (normalized.language && typeof normalized.language !== 'string') {
    normalized.language = String(normalized.language);
  }
  
  if (normalized.difficulty && typeof normalized.difficulty !== 'string') {
    normalized.difficulty = String(normalized.difficulty);
  }
  
  if (normalized.description && typeof normalized.description !== 'string') {
    normalized.description = String(normalized.description);
  }
  
  if (normalized.starterCode && typeof normalized.starterCode !== 'string') {
    normalized.starterCode = String(normalized.starterCode);
  }
  
  if (normalized.solution && typeof normalized.solution !== 'string') {
    normalized.solution = String(normalized.solution);
  }
  
  // Ensure testCases is an array
  if (normalized.testCases && !Array.isArray(normalized.testCases)) {
    if (typeof normalized.testCases === 'string') {
      try {
        normalized.testCases = JSON.parse(normalized.testCases);
      } catch {
        normalized.testCases = [];
      }
    } else {
      normalized.testCases = [];
    }
  }
  
  // Normalize test cases
  if (Array.isArray(normalized.testCases)) {
    normalized.testCases = normalized.testCases.map(testCase => {
      if (!testCase || typeof testCase !== 'object') {
        return { input: {}, expected: '' };
      }
      
      return {
        input: testCase.input || {},
        expected: testCase.expected !== undefined ? String(testCase.expected) : ''
      };
    });
  }
  
  return normalized;
}

/**
 * Applies default values for missing fields
 * @param {Object} data - Challenge data
 * @returns {Object} Challenge data with defaults applied
 */
export function applyDefaults(data) {
  const withDefaults = { ...data };
  
  if (!withDefaults.title) {
    withDefaults.title = 'Coding Challenge';
  }
  
  if (!withDefaults.language) {
    withDefaults.language = 'JavaScript';
  }
  
  if (!withDefaults.difficulty) {
    withDefaults.difficulty = 'Intermediate';
  }
  
  if (!withDefaults.description) {
    withDefaults.description = 'Complete the coding challenge.';
  }
  
  if (!withDefaults.starterCode) {
    withDefaults.starterCode = '// Write your solution here';
  }
  
  if (!withDefaults.solution) {
    withDefaults.solution = '// Solution not provided';
  }
  
  if (!withDefaults.testCases || !Array.isArray(withDefaults.testCases)) {
    withDefaults.testCases = [];
  }
  
  return withDefaults;
}