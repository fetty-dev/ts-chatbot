import {
  validateEnvironment,
  validateUserInput,
  sanitizeUserInput,
  estimateTokens,
  validateUserId,
  ValidationError
} from '../validation';
import { setupTestEnv, cleanupTestEnv } from '../../__tests__/helpers';

describe('Validation Utilities', () => {
  describe('validateEnvironment', () => {
    beforeEach(() => {
      cleanupTestEnv(); // Start clean
    });

    afterEach(() => {
      cleanupTestEnv();
    });

    test('passes with all required environment variables', () => {
      setupTestEnv();
      
      expect(() => validateEnvironment()).not.toThrow();
    });

    test('throws ValidationError for missing TOKEN', () => {
      setupTestEnv();
      delete process.env.TOKEN;
      
      expect(() => validateEnvironment()).toThrow(ValidationError);
      expect(() => validateEnvironment()).toThrow('Missing required environment variable: TOKEN');
    });

    test('throws ValidationError for missing ANTHROPIC_API_KEY', () => {
      setupTestEnv();
      delete process.env.ANTHROPIC_API_KEY;
      
      expect(() => validateEnvironment()).toThrow(ValidationError);
      expect(() => validateEnvironment()).toThrow('Missing required environment variable: ANTHROPIC_API_KEY');
    });

    test('throws ValidationError for missing MONGODB_URI', () => {
      setupTestEnv();
      delete process.env.MONGODB_URI;
      
      expect(() => validateEnvironment()).toThrow(ValidationError);
      expect(() => validateEnvironment()).toThrow('Missing required environment variable: MONGODB_URI');
    });

    test('throws ValidationError for empty environment variables', () => {
      setupTestEnv();
      process.env.TOKEN = '';
      
      expect(() => validateEnvironment()).toThrow(ValidationError);
    });
  });

  describe('validateUserInput', () => {
    test('accepts valid input within limits', () => {
      const validInput = 'This is a normal message';
      
      expect(() => validateUserInput(validInput)).not.toThrow();
    });

    test('rejects empty input', () => {
      expect(() => validateUserInput('')).toThrow(ValidationError);
      expect(() => validateUserInput('   ')).toThrow(ValidationError);
    });

    test('rejects input exceeding maximum length', () => {
      const longInput = 'a'.repeat(3000); // Assuming 2000 char limit
      
      expect(() => validateUserInput(longInput)).toThrow(ValidationError);
      expect(() => validateUserInput(longInput)).toThrow('Input exceeds maximum length');
    });

    test('handles unicode characters correctly', () => {
      const unicodeInput = 'Hello 世界 🌍 café naïve résumé';
      
      expect(() => validateUserInput(unicodeInput)).not.toThrow();
    });
  });

  describe('sanitizeUserInput', () => {
    test('removes control characters', () => {
      const input = 'Hello\x00\x01\x1F\x7F World';
      const sanitized = sanitizeUserInput(input);
      
      expect(sanitized).toBe('Hello World');
    });

    test('trims whitespace', () => {
      const input = '   Hello World   ';
      const sanitized = sanitizeUserInput(input);
      
      expect(sanitized).toBe('Hello World');
    });

    test('preserves normal text and punctuation', () => {
      const input = 'Hello, World! How are you? 123 @#$%';
      const sanitized = sanitizeUserInput(input);
      
      expect(sanitized).toBe(input.trim());
    });

    test('handles empty input', () => {
      expect(sanitizeUserInput('')).toBe('');
      expect(sanitizeUserInput('   ')).toBe('');
    });

    test('removes newlines and tabs (control characters)', () => {
      const input = 'Hello\nWorld\tTest';
      const sanitized = sanitizeUserInput(input);
      
      expect(sanitized).toBe('HelloWorldTest');
    });

    test('preserves unicode characters', () => {
      const input = '  Hello 世界 🌍  ';
      const sanitized = sanitizeUserInput(input);
      
      expect(sanitized).toBe('Hello 世界 🌍');
    });
  });

  describe('estimateTokens', () => {
    test('estimates tokens for normal text', () => {
      const text = 'This is a test message';
      const tokens = estimateTokens(text);
      
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(text.length); // Should be less than character count
    });

    test('handles empty text', () => {
      expect(estimateTokens('')).toBe(0);
    });

    test('scales with text length', () => {
      const shortText = 'Short';
      const longText = 'This is a much longer text that should result in more tokens';
      
      const shortTokens = estimateTokens(shortText);
      const longTokens = estimateTokens(longText);
      
      expect(longTokens).toBeGreaterThan(shortTokens);
    });

    test('uses reasonable token-to-character ratio', () => {
      const text = 'word '.repeat(100); // 500 characters
      const tokens = estimateTokens(text);
      
      // Should be roughly 125 tokens (4 chars per token)
      expect(tokens).toBeGreaterThan(100);
      expect(tokens).toBeLessThan(200);
    });

    test('handles unicode text', () => {
      const unicodeText = '世界 🌍'.repeat(10);
      const tokens = estimateTokens(unicodeText);
      
      expect(tokens).toBeGreaterThan(0);
    });
  });

  describe('validateUserId', () => {
    test('accepts valid Discord snowflake IDs', () => {
      const validIds = [
        '123456789012345678', // 18 digits
        '12345678901234567', // 17 digits
        '1234567890123456789' // 19 digits
      ];
      
      validIds.forEach(id => {
        expect(validateUserId(id)).toBe(true);
      });
    });

    test('rejects invalid user IDs', () => {
      const invalidIds = [
        '', // empty
        '123', // too short
        '12345678901234567890', // too long
        'not_a_number', // non-numeric
        '123456789012345678a', // contains letters
        '123 456 789 012 345 678' // contains spaces
      ];
      
      invalidIds.forEach(id => {
        expect(validateUserId(id)).toBe(false);
      });
    });

    test('handles edge cases', () => {
      expect(validateUserId('0')).toBe(false); // Too short
      expect(validateUserId('00000000000000000')).toBe(true); // Valid length with zeros
    });
  });

  describe('ValidationError', () => {
    test('creates proper ValidationError instances', () => {
      const error = new ValidationError('Test error message');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Test error message');
      expect(error.name).toBe('ValidationError');
    });

    test('is catchable as ValidationError', () => {
      try {
        throw new ValidationError('Test');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
      }
    });
  });
});