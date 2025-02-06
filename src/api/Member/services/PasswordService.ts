import bcrypt from 'bcrypt';
import { z } from 'zod';
import logger from '../../../utils/logger';

// Password validation schema
const passwordSchema = z.string()
  .min(10, 'Password must be at least 10 characters long')
  .max(128, 'Password must not exceed 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export interface PasswordValidationResult {
  isValid: boolean;
  errors?: string[];
}

export interface PasswordHashResult {
  hash: string;
  salt: string;
}

export class PasswordService {
  private readonly SALT_ROUNDS = 12;

  /**
   * Validates a password against the defined complexity requirements
   * @param password - The password to validate
   * @returns PasswordValidationResult indicating if password is valid and any validation errors
   */
  validatePassword(password: string): PasswordValidationResult {
    try {
      passwordSchema.parse(password);
      return { isValid: true };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          isValid: false,
          errors: error.errors.map(err => err.message)
        };
      }
      return {
        isValid: false,
        errors: ['Invalid password format']
      };
    }
  }

  /**
   * Hashes a password using bcrypt
   * @param password - The plain text password to hash
   * @returns Promise<PasswordHashResult> containing the hash and salt
   */
  async hashPassword(password: string): Promise<PasswordHashResult> {
    // Validate password before hashing
    const validation = this.validatePassword(password);
    if (!validation.isValid) {
      throw new Error(validation.errors?.join(', ') || 'Invalid password format');
    }

    try {
      const salt = await bcrypt.genSalt(this.SALT_ROUNDS);
      const hash = await bcrypt.hash(password, salt);
      return { hash, salt };
    } catch (error) {
      logger.error('Error hashing password', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Failed to hash password');
    }
  }

  /**
   * Verifies a password against its hash
   * @param password - The plain text password to verify
   * @param hash - The stored hash to compare against
   * @returns Promise<boolean> indicating if the password matches
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('Error verifying password', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new Error('Failed to verify password');
    }
  }

  /**
   * Updates a password, generating a new hash and salt
   * @param currentPassword - The current password for verification
   * @param newPassword - The new password to set
   * @param storedHash - The stored hash of the current password
   * @returns Promise<PasswordHashResult> containing the new hash and salt if successful
   * @throws Error if current password verification fails
   */
  async updatePassword(
    currentPassword: string,
    newPassword: string,
    storedHash: string
  ): Promise<PasswordHashResult> {
    // First verify the current password
    const isValid = await this.verifyPassword(currentPassword, storedHash);
    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Validate and hash the new password
    return this.hashPassword(newPassword);
  }
}

// Export a singleton instance
export const passwordService = new PasswordService();
