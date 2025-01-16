import { 
  KMS, 
  GenerateDataKeyCommand, 
  DecryptCommand,
  GenerateDataKeyCommandInput,
  DecryptCommandInput
} from '@aws-sdk/client-kms';
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import { EncryptedData } from '../types/security';

const kms = new KMS({ 
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

export const encryptData = async (data: string): Promise<EncryptedData> => {
  try {
    // Get data key from KMS
    const generateKeyInput: GenerateDataKeyCommandInput = {
      KeyId: process.env.KMS_KEY_ID!,
      KeySpec: 'AES_256'
    };
    const { Plaintext, CiphertextBlob } = await kms.send(
      new GenerateDataKeyCommand(generateKeyInput)
    );

    // Generate IV
    const iv = randomBytes(16);
    
    // Create cipher
    const cipher = createCipheriv(
      ENCRYPTION_ALGORITHM,
      Plaintext as Uint8Array,
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
      key: Buffer.from(CiphertextBlob!).toString('base64')
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
    const decryptInput: DecryptCommandInput = {
      CiphertextBlob: encryptedKey
    };
    const { Plaintext: decryptedKey } = await kms.send(
      new DecryptCommand(decryptInput)
    );

    // Create decipher
    const decipher = createDecipheriv(
      ENCRYPTION_ALGORITHM,
      decryptedKey as Uint8Array,
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
