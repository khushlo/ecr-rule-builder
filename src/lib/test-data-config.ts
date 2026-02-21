/**
 * Test Data Configuration
 * Environment variables for controlling test data usage
 */

// Environment configuration
export const TEST_DATA_CONFIG = {
  // Enable test data in development or when explicitly requested
  enabled: process.env.NODE_ENV === 'development' || process.env.USE_TEST_DATA === 'true',
  
  // Allow override for specific environments
  forceEnabled: process.env.FORCE_TEST_DATA === 'true',
  
  // Disable test data explicitly (overrides other settings)
  forceDisabled: process.env.DISABLE_TEST_DATA === 'true',
  
  // Test data directory
  dataDir: process.env.TEST_DATA_DIR || 'src/test-data',
  
  // Mock API base URL
  mockApiUrl: process.env.MOCK_API_URL || 'http://localhost:3000/api/mock-fhir',
  
  // Cache settings
  enableCache: process.env.TEST_DATA_CACHE !== 'false',
  cacheInvalidationTimeout: parseInt(process.env.TEST_DATA_CACHE_TIMEOUT || '300000'), // 5 minutes
  
  // Logging
  enableLogging: process.env.TEST_DATA_LOGGING === 'true'
}

/**
 * Check if test data should be used
 */
export function shouldUseTestData(): boolean {
  if (TEST_DATA_CONFIG.forceDisabled) {
    return false
  }
  
  if (TEST_DATA_CONFIG.forceEnabled) {
    return true
  }
  
  return TEST_DATA_CONFIG.enabled
}

/**
 * Get test data config with environment overrides
 */
export function getTestDataConfig() {
  return {
    ...TEST_DATA_CONFIG,
    enabled: shouldUseTestData()
  }
}