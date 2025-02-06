import { PasswordService } from '../../../src/api/Member/services/PasswordService';

describe('PasswordService', () => {
  let passwordService: PasswordService;

  beforeEach(() => {
    passwordService = new PasswordService();
  });

  describe('validatePassword', () => {
    it('should accept valid passwords', () => {
      const validPasswords = [
        'SecurePass123!',
        'MyP@ssw0rd2023',
        'C0mpl3x!P@ssw0rd'
      ];

      validPasswords.forEach(password => {
        const result = passwordService.validatePassword(password);
        expect(result.isValid).toBe(true);
        expect(result.errors).toBeUndefined();
      });
    });

    it('should reject passwords that are too short', () => {
      const result = passwordService.validatePassword('Short1!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must be at least 10 characters long');
    });

    it('should reject passwords without uppercase letters', () => {
      const result = passwordService.validatePassword('password123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject passwords without lowercase letters', () => {
      const result = passwordService.validatePassword('PASSWORD123!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject passwords without numbers', () => {
      const result = passwordService.validatePassword('Password!!');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject passwords without special characters', () => {
      const result = passwordService.validatePassword('Password123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one special character');
    });
  });

  describe('hashPassword', () => {
    it('should generate different hashes for the same password', async () => {
      const password = 'SecurePass123!';
      const result1 = await passwordService.hashPassword(password);
      const result2 = await passwordService.hashPassword(password);

      expect(result1.hash).not.toBe(result2.hash);
      expect(result1.salt).not.toBe(result2.salt);
    });

    it('should generate hash and salt of appropriate length', async () => {
      const password = 'SecurePass123!';
      const result = await passwordService.hashPassword(password);

      expect(result.hash).toBeDefined();
      expect(result.hash.length).toBeGreaterThan(50); // bcrypt hashes are typically longer than 50 chars
      expect(result.salt).toBeDefined();
      expect(result.salt.length).toBeGreaterThan(20); // bcrypt salts are typically longer than 20 chars
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password against its hash', async () => {
      const password = 'SecurePass123!';
      const { hash } = await passwordService.hashPassword(password);
      
      const isValid = await passwordService.verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'SecurePass123!';
      const wrongPassword = 'WrongPass123!';
      const { hash } = await passwordService.hashPassword(password);
      
      const isValid = await passwordService.verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });
  });

  describe('updatePassword', () => {
    it('should update password when current password is correct', async () => {
      const currentPassword = 'CurrentPass123!';
      const newPassword = 'NewSecurePass123!';
      const { hash } = await passwordService.hashPassword(currentPassword);

      const result = await passwordService.updatePassword(
        currentPassword,
        newPassword,
        hash
      );

      expect(result.hash).toBeDefined();
      expect(result.salt).toBeDefined();
      
      // Verify new password works
      const isValid = await passwordService.verifyPassword(newPassword, result.hash);
      expect(isValid).toBe(true);
    });

    it('should reject update when current password is incorrect', async () => {
      const currentPassword = 'CurrentPass123!';
      const wrongPassword = 'WrongPass123!';
      const newPassword = 'NewSecurePass123!';
      const { hash } = await passwordService.hashPassword(currentPassword);

      await expect(
        passwordService.updatePassword(wrongPassword, newPassword, hash)
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should reject update when new password is invalid', async () => {
      const currentPassword = 'CurrentPass123!';
      const invalidNewPassword = 'weak';
      const { hash } = await passwordService.hashPassword(currentPassword);

      await expect(
        passwordService.updatePassword(currentPassword, invalidNewPassword, hash)
      ).rejects.toThrow(/Password must be at least 10 characters long/);
    });
  });
});
