// Backend/API test setup
import { beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';

// Test database setup
const TEST_DB_PATH = path.join(__dirname, '../../test.db');

beforeAll(async () => {
  // Set environment to test
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = `file:${TEST_DB_PATH}`;
  
  // Clean up any existing test database
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
});

beforeEach(async () => {
  // Clear any existing database before each test
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
});

afterEach(async () => {
  // Clean up after each test
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
});

afterAll(async () => {
  // Final cleanup
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
});
