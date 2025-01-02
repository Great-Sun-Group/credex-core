import { ledgerSpaceDriver } from '../../../../config/neo4j';
import * as neo4j from 'neo4j-driver';
import { FCMToken } from '../types';
import { logInfo, logError, logWarning, logDebug } from '../../../utils/logger';

export class FCMTokenRepository {
  private static instance: FCMTokenRepository;
  private driver: neo4j.Driver;

  private constructor() {
    logDebug('Initializing FCMTokenRepository');
    this.driver = ledgerSpaceDriver;
  }

  public static getInstance(): FCMTokenRepository {
    if (!FCMTokenRepository.instance) {
      logInfo('Creating new FCMTokenRepository instance');
      FCMTokenRepository.instance = new FCMTokenRepository();
    }
    return FCMTokenRepository.instance;
  }

  public async saveToken(token: FCMToken): Promise<void> {
    const requestStart = Date.now();
    logDebug('Entering saveToken', { 
      userId: token.userId,
      platform: token.platform,
      tokenLength: token.token?.length 
    });

    // Add timeout to catch hanging connections
    const timeoutPromise: Promise<void> = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Database operation timed out after 5s'));
      }, 5000);
    });

    const session = this.driver.session();
    try {
      logDebug('Starting database transaction');
      const writePromise: Promise<void> = session.executeWrite(async (tx: neo4j.ManagedTransaction) => {
        const startTime = Date.now();
        logDebug('Checking if member exists');
        const userResult = await tx.run(
          `
          MATCH (u:Member {memberID: $userId})
          RETURN u
          `,
          { userId: token.userId }
        );

        logDebug('Member check completed', {
          duration: Date.now() - startTime,
          found: userResult.records.length > 0
        });

        if (userResult.records.length === 0) {
          const error = new Error(`Member with ID ${token.userId} not found`);
          logWarning('Member not found', { userId: token.userId });
          throw error;
        }

        const deleteStart = Date.now();
        logDebug('Removing existing tokens for user/platform');
        await tx.run(
          `
          MATCH (u:Member {memberID: $userId})-[r:HAS_FCM_TOKEN]->(t:FCMToken {platform: $platform})
          DELETE r, t
          `,
          { userId: token.userId, platform: token.platform }
        );

        logDebug('Existing tokens removed', {
          duration: Date.now() - deleteStart
        });

        const createStart = Date.now();
        logDebug('Creating new token');
        await tx.run(
          `
          MATCH (u:Member {memberID: $userId})
          CREATE (t:FCMToken {
            token: $token,
            platform: $platform,
            createdAt: datetime($createdAt),
            updatedAt: datetime($updatedAt)
          })
          CREATE (u)-[:HAS_FCM_TOKEN]->(t)
          `,
          {
            userId: token.userId,
            token: token.token,
            platform: token.platform,
            createdAt: token.createdAt.toISOString(),
            updatedAt: token.updatedAt.toISOString(),
          }
        );
        logDebug('New token created', {
          duration: Date.now() - createStart
        });
      });

      await Promise.race([writePromise, timeoutPromise]);

      const totalDuration = Date.now() - requestStart;
      logInfo('Token saved successfully', { 
        userId: token.userId,
        platform: token.platform,
        duration: totalDuration
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logError('Error saving token', error as Error, {
        duration: Date.now() - requestStart,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
      });
      logDebug('Save token context', {
        userId: token.userId,
        platform: token.platform
      });
      throw error;
    } finally {
      logDebug('Closing database session');
      await session.close();
    }
  }

  public async getToken(userId: string): Promise<FCMToken | null> {
    const requestStart = Date.now();
    logDebug('Entering getToken', { userId });

    // Add timeout to catch hanging connections
    const timeoutPromise: Promise<FCMToken | null> = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Database operation timed out after 5s'));
      }, 5000);
    });

    const session = this.driver.session();
    try {
      logDebug('Starting database read transaction');
      const readPromise: Promise<FCMToken | null> = session.executeRead(async (tx: neo4j.ManagedTransaction) => {
        const queryStart = Date.now();
        const response = await tx.run(
          `
          MATCH (u:Member {memberID: $userId})-[:HAS_FCM_TOKEN]->(t:FCMToken)
          RETURN t
          ORDER BY t.updatedAt DESC
          LIMIT 1
          `,
          { userId }
        );

        const queryDuration = Date.now() - queryStart;
        logDebug('Query completed', { 
          duration: queryDuration,
          found: response.records.length > 0 
        });

        if (response.records.length === 0) {
          logDebug('No token found for user', { userId });
          return null;
        }

        logDebug('Token found for user', { 
          userId,
          duration: queryDuration 
        });

        const tokenNode = response.records[0].get('t').properties;
        return {
          token: tokenNode.token,
          userId,
          platform: tokenNode.platform,
          createdAt: new Date(tokenNode.createdAt),
          updatedAt: new Date(tokenNode.updatedAt),
        };
      });

      const result = await Promise.race([readPromise, timeoutPromise]);

      const totalDuration = Date.now() - requestStart;
      logDebug('Get token operation completed', { 
        userId,
        duration: totalDuration,
        found: result !== null
      });

      return result;
    } catch (error) {
      const totalDuration = Date.now() - requestStart;
      logError('Error retrieving token', error as Error, {
        duration: totalDuration,
        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
      });
      logDebug('Get token context', { userId });
      throw error;
    } finally {
      logDebug('Closing database session');
      await session.close();
    }
  }

  public async removeToken(userId: string, token: string): Promise<void> {
    logDebug('Entering removeToken', { userId, tokenLength: token?.length });
    const session = this.driver.session();
    try {
      logDebug('Starting database write transaction');
      await session.executeWrite(async (tx: neo4j.ManagedTransaction) => {
        await tx.run(
          `
          MATCH (u:Member {memberID: $userId})-[r:HAS_FCM_TOKEN]->(t:FCMToken {token: $token})
          DELETE r, t
          `,
          { userId, token }
        );
      });
      logInfo('Token removed successfully', { userId });
    } catch (error) {
      logError('Error removing token', error as Error);
      logDebug('Remove token context', { userId });
      throw error;
    } finally {
      logDebug('Closing database session');
      await session.close();
    }
  }

  public async removeAllUserTokens(userId: string): Promise<void> {
    logDebug('Entering removeAllUserTokens', { userId });
    const session = this.driver.session();
    try {
      logDebug('Starting database write transaction');
      await session.executeWrite(async (tx: neo4j.ManagedTransaction) => {
        await tx.run(
          `
          MATCH (u:Member {memberID: $userId})-[r:HAS_FCM_TOKEN]->(t:FCMToken)
          DELETE r, t
          `,
          { userId }
        );
      });
      logInfo('All tokens removed for user', { userId });
    } catch (error) {
      logError('Error removing all tokens', error as Error);
      logDebug('Remove all tokens context', { userId });
      throw error;
    } finally {
      logDebug('Closing database session');
      await session.close();
    }
  }

  public async cleanupInvalidTokens(): Promise<void> {
    logDebug('Entering cleanupInvalidTokens');
    const session = this.driver.session();
    try {
      logDebug('Starting database write transaction');
      await session.executeWrite(async (tx: neo4j.ManagedTransaction) => {
        await tx.run(
          `
          MATCH (t:FCMToken)
          WHERE t.invalidated = true
          DETACH DELETE t
          `
        );
      });
      logInfo('Invalid tokens cleaned up');
    } catch (error) {
      logError('Error cleaning up invalid tokens', error as Error);
      logDebug('Cleanup context', { operation: 'cleanupInvalidTokens' });
      throw error;
    } finally {
      logDebug('Closing database session');
      await session.close();
    }
  }
}

export const fcmTokenRepository = FCMTokenRepository.getInstance();
