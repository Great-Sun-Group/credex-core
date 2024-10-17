import { validateUUID, validateMemberHandle, validateAccountName, validateAccountHandle } from '../src/utils/validators';

describe('Validators', () => {
  describe('validateUUID', () => {
    it('should return true for valid UUIDs', () => {
      expect(validateUUID('123e4567-e89b-12d3-a456-426614174000').isValid).toBe(true);
      expect(validateUUID('550e8400-e29b-41d4-a716-446655440000').isValid).toBe(true);
    });

    it('should return false for invalid UUIDs', () => {
      expect(validateUUID('not-a-uuid').isValid).toBe(false);
      expect(validateUUID('123e4567-e89b-12d3-a456-42661417400').isValid).toBe(false);
      expect(validateUUID('123e4567-e89b-12d3-a456-4266141740000').isValid).toBe(false);
    });
  });

  describe('validateMemberHandle', () => {
    it('should return true for valid member handles', () => {
      expect(validateMemberHandle('john_doe').isValid).toBe(true);
      expect(validateMemberHandle('user123').isValid).toBe(true);
      expect(validateMemberHandle('a.b.c').isValid).toBe(true);
    });

    it('should return false for invalid member handles', () => {
      expect(validateMemberHandle('jo').isValid).toBe(false);
      expect(validateMemberHandle('user_name_too_long_123456789012345678901234567890').isValid).toBe(false);
      expect(validateMemberHandle('Invalid-Handle').isValid).toBe(false);
      expect(validateMemberHandle('user@name').isValid).toBe(false);
    });
  });

  describe('validateAccountName', () => {
    it('should return true for valid account names', () => {
      expect(validateAccountName('John Doe').isValid).toBe(true);
      expect(validateAccountName('Company Name 123').isValid).toBe(true);
      expect(validateAccountName('A'.repeat(50)).isValid).toBe(true);
    });

    it('should return false for invalid account names', () => {
      expect(validateAccountName('Jo').isValid).toBe(false);
      expect(validateAccountName('A'.repeat(51)).isValid).toBe(false);
      expect(validateAccountName('').isValid).toBe(false);
    });
  });

  describe('validateAccountHandle', () => {
    it('should return true for valid account handles', () => {
      expect(validateAccountHandle('johndoe').isValid).toBe(true);
      expect(validateAccountHandle('company_123').isValid).toBe(true);
      expect(validateAccountHandle('a.b.c').isValid).toBe(true);
    });

    it('should return false for invalid account handles', () => {
      expect(validateAccountHandle('jo').isValid).toBe(false);
      expect(validateAccountHandle('handle_too_long_123456789012345678901234567890').isValid).toBe(false);
      expect(validateAccountHandle('Invalid-Handle').isValid).toBe(false);
      expect(validateAccountHandle('handle@invalid').isValid).toBe(false);
    });
  });
});
