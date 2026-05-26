/**
 * Test setup and teardown
 */

import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Global test setup
beforeAll(() => {
  console.log('Starting test suite...');
});

// Global test teardown
afterAll(() => {
  console.log('Test suite completed.');
});

// Global test timeout
jest.setTimeout(30000); // 30 seconds

// Mock console methods in tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  // Optionally mute console output during tests
  if (process.env.SILENT_TESTS === 'true') {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  }
});

afterEach(() => {
  // Restore console methods
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  
  // Clear all mocks
  jest.clearAllMocks();
});