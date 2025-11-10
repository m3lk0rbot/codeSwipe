/**
 * JSON Sanitization Utilities
 * Handles common JSON formatting issues from AI responses
 */

/**
 * Removes markdown code blocks from responses
 * @param {string} text - Raw text that may contain markdown
 * @returns {string} Text with markdown code blocks removed
 */
export function removeMarkdownBlocks(text) {
  if (!text || typeof text !== 'string') return '';
  
  // Remove triple backtick code blocks (```json ... ```)
  let cleaned = text.replace(/```(?:json|javascript|js)?\s*\n?([\s\S]*?)\n?```/gi, '$1');
  
  // Remove single backtick inline code (`...`)
  cleaned = cleaned.replace(/`([^`]*)`/g, '$1');
  
  // Remove any remaining markdown formatting
  cleaned = cleaned.replace(/^\s*#+\s*/gm, ''); // Headers
  cleaned = cleaned.replace(/^\s*[-*+]\s*/gm, ''); // List items
  
  return cleaned.trim();
}

/**
 * Normalizes smart quotes and other problematic characters
 * @param {string} text - Text with potential smart quotes
 * @returns {string} Text with normalized quotes
 */
export function fixQuotes(text) {
  if (!text || typeof text !== 'string') return '';
  
  return text
    // Smart double quotes to regular double quotes
    .replace(/[""]/g, '"')
    // Smart single quotes to regular single quotes
    .replace(/['']/g, "'")
    // En/em dashes to regular hyphens
    .replace(/[–—]/g, '-')
    // Ellipsis to three dots
    .replace(/…/g, '...')
    // Non-breaking spaces to regular spaces
    .replace(/\u00A0/g, ' ')
    // Zero-width characters
    .replace(/[\u200B-\u200D\uFEFF]/g, '');
}

/**
 * Normalizes line breaks and handles escaped characters
 * @param {string} text - Text with potential line break issues
 * @returns {string} Text with normalized line breaks
 */
export function normalizeLineBreaks(text) {
  if (!text || typeof text !== 'string') return '';
  
  return text
    // Normalize different line ending types
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Fix escaped newlines in JSON strings
    .replace(/\\n/g, '\\n')
    // Remove excessive whitespace but preserve JSON structure
    .replace(/\n\s*\n/g, '\n')
    // Trim leading/trailing whitespace
    .trim();
}

/**
 * Fixes common character encoding issues
 * @param {string} text - Text with potential encoding issues
 * @returns {string} Text with fixed encoding
 */
export function fixCharacterEncoding(text) {
  if (!text || typeof text !== 'string') return '';
  
  return text
    // Fix common UTF-8 encoding issues
    .replace(/Ã¢â‚¬â„¢/g, "'") // Encoded apostrophe
    .replace(/Ã¢â‚¬Å"/g, '"') // Encoded opening quote
    .replace(/Ã¢â‚¬\u009d/g, '"') // Encoded closing quote
    .replace(/Ã¢â‚¬â€œ/g, '—') // Encoded em dash
    // Fix other common encoding artifacts
    .replace(/â€™/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€\u009d/g, '"')
    .replace(/â€"/g, '—');
}

/**
 * Main sanitization function that applies all cleaning operations
 * @param {string} rawText - Raw text from AI response
 * @returns {string} Sanitized text ready for JSON parsing
 */
export function sanitize(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';
  
  let cleaned = rawText;
  
  // Apply sanitization steps in order
  cleaned = removeMarkdownBlocks(cleaned);
  cleaned = fixCharacterEncoding(cleaned);
  cleaned = fixQuotes(cleaned);
  cleaned = normalizeLineBreaks(cleaned);
  
  return cleaned;
}