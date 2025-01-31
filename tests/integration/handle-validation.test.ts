import { validateHandle } from '../../src/utils/validators';
import { sanitizeHandle } from '../../src/utils/inputSanitizer';

describe('Handle Validation and Sanitization', () => {
  const testCases = [
    {
      input: 'VALID_HANDLE_123',
      expectedSanitized: 'VALID_HANDLE_123',
      shouldBeValid: true,
      description: 'Valid handle with uppercase, numbers and underscores'
    },
    {
      input: 'invalid_lowercase',
      expectedSanitized: 'INVALID_LOWERCASE',
      shouldBeValid: true,
      description: 'Lowercase input should be converted to uppercase'
    },
    {
      input: 'INVALID0ZERO',
      expectedSanitized: 'INVALID0ZERO',
      shouldBeValid: false,
      description: 'Should reject zero digit'
    },
    {
      input: 'VALID_159',
      expectedSanitized: 'VALID_159',
      shouldBeValid: true,
      description: 'Valid handle with non-zero digits'
    },
    {
      input: 'Mixed Case 123',
      expectedSanitized: 'MIXED_CASE_123',
      shouldBeValid: true,
      description: 'Mixed case with spaces should be converted to uppercase with underscores'
    },
    {
      input: 'Special@Chars#',
      expectedSanitized: 'SPECIAL@CHARS#',
      shouldBeValid: false,
      description: 'Should reject special characters'
    },
    {
      input: 'A B C',
      expectedSanitized: 'A_B_C',
      shouldBeValid: true,
      description: 'Spaces should be converted to underscores'
    },
    {
      input: 'TEST_0_ZERO',
      expectedSanitized: 'TEST_0_ZERO',
      shouldBeValid: false,
      description: 'Should reject zero even with underscores'
    },
    {
      input: 'ab',
      expectedSanitized: 'AB',
      shouldBeValid: false,
      description: 'Should reject handles shorter than 3 characters'
    },
    {
      input: 'a'.repeat(31),
      expectedSanitized: 'A'.repeat(31),
      shouldBeValid: false,
      description: 'Should reject handles longer than 30 characters'
    }
  ];

  describe('sanitizeHandle', () => {
    testCases.forEach(({ input, expectedSanitized, description }) => {
      it(`should correctly sanitize: ${description}`, () => {
        const sanitized = sanitizeHandle(input);
        expect(sanitized).toBe(expectedSanitized);
      });
    });

    it('should handle non-string input', () => {
      expect(sanitizeHandle(123 as any)).toBe('');
      expect(sanitizeHandle(null as any)).toBe('');
      expect(sanitizeHandle(undefined as any)).toBe('');
      expect(sanitizeHandle({} as any)).toBe('');
    });
  });

  describe('validateHandle', () => {
    testCases.forEach(({ input, shouldBeValid, description }) => {
      it(`should ${shouldBeValid ? 'accept' : 'reject'}: ${description}`, () => {
        const sanitized = sanitizeHandle(input);
        const validation = validateHandle(sanitized);
        expect(validation.isValid).toBe(shouldBeValid);
      });
    });

    it('should provide specific error message for zero digit', () => {
      const validation = validateHandle('TEST0HANDLE');
      expect(validation.isValid).toBe(false);
      expect(validation.message).toContain('zero (0) is not allowed');
    });

    it('should provide specific error message for lowercase letters', () => {
      const validation = validateHandle('TestHandle');
      expect(validation.isValid).toBe(false);
      expect(validation.message).toContain('lowercase letters are not allowed');
    });

    it('should provide specific error message for special characters', () => {
      const validation = validateHandle('TEST@HANDLE');
      expect(validation.isValid).toBe(false);
      expect(validation.message).toContain('Invalid handle: only uppercase letters, numbers 1-9, and underscores are allowed');
    });
  });
});
