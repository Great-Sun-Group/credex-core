import { KMS } from 'aws-sdk';
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { EncryptedData } from '../types/security';

const kms = new KMS({ region: process.env.AWS_REGION });
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

export const encryptData = async (data: string): Promise<EncryptedData> => {
  try {
    // Get data key from KMS
    const { Plaintext, CiphertextBlob } = await kms.generateDataKey({
      KeyId: process.env.KMS_KEY_ID!,
      KeySpec: 'AES_256'
    }).promise();

    // Generate IV
    const iv = randomBytes(16);
    
    // Create cipher
    const cipher = createCipheriv(
      ENCRYPTION_ALGORITHM,
      Buffer.from(Plaintext as Buffer),
      iv
    );
    
    // Encrypt data
    const encrypted = Buffer.concat([
      cipher.update(data, 'utf8'),
      cipher.final()
    ]);

    const tag = cipher.getAuthTag();

    return {
      encrypted: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      key: CiphertextBlob!.toString('base64')
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
};

export const decryptData = async (encryptedData: EncryptedData): Promise<string> => {
  try {
    const encrypted = Buffer.from(encryptedData.encrypted, 'base64');
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const tag = Buffer.from(encryptedData.tag, 'base64');
    const encryptedKey = Buffer.from(encryptedData.key, 'base64');

    // Decrypt data key
    const { Plaintext: decryptedKey } = await kms.decrypt({
      CiphertextBlob: encryptedKey
    }).promise();

    // Create decipher
    const decipher = createDecipheriv(
      ENCRYPTION_ALGORITHM,
      Buffer.from(decryptedKey as Buffer),
      iv
    );
    decipher.setAuthTag(tag);

    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]).toString('utf8');
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}; 