/* copilot-generated */

/**
 * Mock fixtures for URL Validator tests
 * Provides test data and mock implementations
 */

export const validURLs = [
  'https://github.com/cocomomojo/copilot-quality-harness',
  'http://example.com',
  'https://example.com/path?query=value',
  'http://localhost:3000/api/health',
  'https://www.example.com:8443/path/to/resource?id=123&name=test#section',
];

export const invalidURLs = [
  {
    url: 'not-a-valid-url',
    reason: 'no protocol'
  },
  {
    url: '',
    reason: 'empty string'
  },
  {
    url: 'ftp://files.example.com/file.txt',
    reason: 'unsupported protocol (ftp)'
  },
  {
    url: 'just text without protocol',
    reason: 'missing protocol'
  },
  {
    url: 'htp://example.com',
    reason: 'malformed protocol'
  },
];

/**
 * Mock response for valid URL validation
 */
export const mockValidResponse = {
  valid: true,
};

/**
 * Mock response for invalid URL validation
 */
export const mockInvalidResponse = (error) => ({
  valid: false,
  error: error || 'Invalid URL format',
});

/**
 * Mock API responses for testing
 */
export const mockAPIResponses = {
  validURL: (url) => ({
    status: 200,
    headers: { 'content-type': 'application/json' },
    body: {
      valid: true,
    },
  }),
  
  invalidURL: (url, error) => ({
    status: 200,
    headers: { 'content-type': 'application/json' },
    body: {
      valid: false,
      error: error || 'Invalid URL format',
    },
  }),
  
  emptyURL: () => ({
    status: 200,
    headers: { 'content-type': 'application/json' },
    body: {
      valid: false,
      error: 'URL cannot be empty',
    },
  }),
  
  nullURL: () => ({
    status: 200,
    headers: { 'content-type': 'application/json' },
    body: {
      valid: false,
      error: 'URL cannot be empty',
    },
  }),
};

/**
 * Test data seeds for reproducibility
 */
export const seeds = {
  baseSeed: 54321,
  emailSeed: 67890,
  passwordSeed: 54321,
};

/**
 * Configuration for mock environment
 */
export const mockConfig = {
  externalHttpCalls: false,
  apiBaseUrl: 'http://localhost:3000',
  urlMaxLength: 2048,
  allowedProtocols: ['http', 'https'],
  validationTimeoutMs: 10,
  apiResponseTimeoutMs: 100,
};
