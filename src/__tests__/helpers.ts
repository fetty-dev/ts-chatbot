/**
 * Test helper utilities for consistent testing
 */

/**
 * Wait for a specified number of milliseconds
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate random string for testing
 */
export function randomString(length: number = 10): string {
  return Math.random().toString(36).substring(2, length + 2);
}

/**
 * Create test environment variables
 */
export function setupTestEnv(): void {
  process.env.TOKEN = 'test_discord_token';
  process.env.ANTHROPIC_API_KEY = 'test_anthropic_key';
  process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
  process.env.OWNER_ID = '987654321098765432';
  process.env.CHANNEL_ID = '111222333444555666';
}

/**
 * Clean up test environment
 */
export function cleanupTestEnv(): void {
  delete process.env.TOKEN;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.MONGODB_URI;
  delete process.env.OWNER_ID;
  delete process.env.CHANNEL_ID;
}

/**
 * Assert that a value is within a percentage range
 */
export function expectWithinPercentage(actual: number, expected: number, percentageTolerance: number): void {
  const tolerance = expected * (percentageTolerance / 100);
  const min = expected - tolerance;
  const max = expected + tolerance;
  
  expect(actual).toBeGreaterThanOrEqual(min);
  expect(actual).toBeLessThanOrEqual(max);
}

/**
 * Performance testing utilities
 */
export class PerformanceTimer {
  private startTime: number = 0;

  start(): void {
    this.startTime = performance.now();
  }

  end(): number {
    return performance.now() - this.startTime;
  }
}