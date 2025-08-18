// Jest setup file
// This file runs before each test file

// Configure Jest globals
global.console = {
  ...console,
  // Uncomment to ignore a specific log level
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Set test timeout
jest.setTimeout(30000);

// Mock environment variables if needed
process.env.NODE_ENV = "test";
