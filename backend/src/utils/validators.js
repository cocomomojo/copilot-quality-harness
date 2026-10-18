/* copilot-generated */

/**
 * Validates if a URL string is in correct format (http/https)
 * 
 * @param {string|null} url - The URL string to validate
 * @returns {{valid: boolean, error?: string}} Validation result object
 * 
 * Performance: < 10ms for validation
 * Security: Checks protocol, length limit, and format
 */
export function isValidURL(url) {
  // Check for empty or null input
  if (url === null || url === undefined || url === '') {
    return { valid: false, error: 'URL cannot be empty' };
  }

  // Check if URL is a string
  if (typeof url !== 'string') {
    return { valid: false, error: 'URL must be a string' };
  }

  // Check length limit (2048 characters per RFC 3986)
  if (url.length > 2048) {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Check if URL starts with allowed protocols
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Try to parse as URL
  try {
    // This will throw if URL is malformed
    new URL(url);
    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid URL format' };
  }
}
