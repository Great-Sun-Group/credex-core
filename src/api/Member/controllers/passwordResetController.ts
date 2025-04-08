import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ledgerSpaceDriver } from '../../../../config/neo4j';
import { ApiActionType } from '../../../types/apiResponse';
import { passwordService } from '../services/PasswordService';
import logger from '../../../utils/logger';

export const RESET_TOKEN_EXPIRY = 10 * 60; // 10 minutes in seconds

export async function generateResetToken(memberID: string): Promise<string> {
  const session = ledgerSpaceDriver.session();
  try {
    const resetToken = uuidv4();
    const expiry = Math.floor(Date.now() / 1000) + RESET_TOKEN_EXPIRY;

    await session.run(
      `MATCH (m:Member {memberID: $memberID})
       SET m.resetToken = $resetToken,
           m.resetTokenExpiry = $expiry`,
      { memberID, resetToken, expiry }
    );

    return resetToken;
  } catch (error) {
    logger.error('Failed to generate reset token', { error, memberID });
    throw error;
  } finally {
    await session.close();
  }
}

export async function resetPassword(req: Request, res: Response) {
  const { resetToken, newPassword } = req.body;
  const session = ledgerSpaceDriver.session();

  try {
    // Find member by reset token and check expiry
    const result = await session.run(
      `MATCH (m:Member {resetToken: $resetToken})
       WHERE m.resetTokenExpiry > $now
       RETURN m.memberID as memberID`,
      { 
        resetToken,
        now: Math.floor(Date.now() / 1000)
      }
    );

    if (result.records.length === 0) {
      return res.status(400).json({
        message: 'Invalid or expired reset token',
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_VALIDATION,
            timestamp: new Date().toISOString(),
            details: {
              code: 'TOKEN_EXPIRED',
              reason: 'Reset token is invalid or has expired'
            }
          }
        }
      });
    }

    const memberID = result.records[0].get('memberID');

    // Hash new password
    const { hash: newPasswordHash } = await passwordService.hashPassword(newPassword);

    // Update password and clear reset token
    await session.run(
      `MATCH (m:Member {memberID: $memberID})
       SET m.passwordHash = $newPasswordHash,
           m.resetToken = null,
           m.resetTokenExpiry = null,
           m.passwordUpdatedAt = datetime()`,
      { memberID, newPasswordHash }
    );

    logger.info('Password reset successful', { memberID });

    res.json({
      message: 'Password reset successful',
      data: {
        action: {
          id: memberID,
          type: ApiActionType.MEMBER_PASSWORD_RESET,
          timestamp: new Date().toISOString(),
          actor: memberID,
          details: {
            memberID
          }
        }
      }
    });
  } catch (error) {
    logger.error('Failed to reset password', { error });

    // Check if it's a password validation error
    if (error instanceof Error && error.message.includes('Password must')) {
      return res.status(400).json({
        message: 'Invalid password format',
        data: {
          action: {
            id: null,
            type: ApiActionType.ERROR_VALIDATION,
            timestamp: new Date().toISOString(),
            details: {
              code: 'INVALID_PASSWORD',
              reason: error.message
            }
          }
        }
      });
    }

    res.status(500).json({
      message: 'Internal server error',
      data: {
        action: {
          id: null,
          type: ApiActionType.ERROR_INTERNAL,
          timestamp: new Date().toISOString(),
          details: {
            code: 'INTERNAL_ERROR',
            reason: 'Failed to reset password'
          }
        }
      }
    });
  } finally {
    await session.close();
  }
}
