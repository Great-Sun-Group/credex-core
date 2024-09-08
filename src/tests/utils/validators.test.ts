import { validateUUID, validateMemberHandle, validateAccountName, validateAccountHandle } from '../../utils/validators';

describe('Validators', () => {
  describe('validateUUID', () => {
    it('should return true for valid UUIDs', () => {
      expect(validateUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(validateUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should return false for invalid UUIDs', () => {
      expect(validateUUID('not-a-uuid')).toBe(false);
      expect(validateUUID('123e4567-e89b-12d3-a456-42661417400')).toBe(false);
      expect(validateUUID('123e4567-e89b-12d3-a456-4266141740000')).toBe(false);
    });
  });

  describe('validateMemberHandle', () => {
    it('should return true for valid member handles', () => {
      expect(validateMemberHandle('john_doe')).toBe(true);
      expect(validateMemberHandle('user123')).toBe(true);
      expect(validateMemberHandle('a.b.c')).toBe(true);
    });

    it('should return false for invalid member handles', () => {
      expect(validateMemberHandle('jo')).toBe(false);
      expect(validateMemberHandle('user_name_too_long_123456789012345678901234567890')).toBe(false);
      expect(validateMemberHandle('Invalid-Handle')).toBe(false);
      expect(validateMemberHandle('user@name')).toBe(false);
    });
  });

  describe('validateAccountName', () => {
    it('should return true for valid account names', () => {
      expect(validateAccountName('John Doe')).toBe(true);
      expect(validateAccountName('Company Name 123')).toBe(true);
      expect(validateAccountName('A'.repeat(50))).toBe(true);
    });

    it('should return false for invalid account names', () => {
      expect(validateAccountName('Jo')).toBe(false);
      expect(validateAccountName('A'.repeat(51))).toBe(false);
      expect(validateAccountName('')).toBe(false);
    });
  });

  describe('validateAccountHandle', () => {
    it('should return true for valid account handles', () => {
      expect(validateAccountHandle('johndoe')).toBe(true);
      expect(validateAccountHandle('company_123')).toBe(true);
      expect(validateAccountHandle('a.b.c')).toBe(true);
    });

    it('should return false for invalid account handles', () => {
      expect(validateAccountHandle('jo')).toBe(false);
      expect(validateAccountHandle('handle_too_long_123456789012345678901234567890')).toBe(false);
      expect(validateAccountHandle('Invalid-Handle')).toBe(false);
      expect(validateAccountHandle('handle@invalid')).toBe(false);
    });
  });
});