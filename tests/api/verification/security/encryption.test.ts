import { encryptData, decryptData } from '../../../../src/api/verification/utils/encryption';
import { EncryptedData } from '../../../../src/api/verification/types/security';

jest.mock('aws-sdk');

describe('Encryption Utils', () => {
  const testData = 'sensitive-data';
  // Create a 32-byte test key for AES-256
  const TEST_KEY = Buffer.from('0123456789abcdef0123456789abcdef');
  const TEST_ENCRYPTED_KEY = Buffer.from('encrypted-key-0123456789abcdef0123456789abcdef');

  beforeAll(() => {
    const AWS = require('aws-sdk');
    AWS.KMS = jest.fn(() => ({
      generateDataKey: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Plaintext: TEST_KEY,
          CiphertextBlob: TEST_ENCRYPTED_KEY
        })
      }),
      decrypt: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Plaintext: TEST_KEY
        })
      })
    }));
  });

  test('encrypts data successfully', async () => {
    const result = await encryptData(testData);
    
    expect(result).toHaveProperty('encrypted');
    expect(result).toHaveProperty('iv');
    expect(result).toHaveProperty('tag');
    expect(result).toHaveProperty('key');
    expect(typeof result.encrypted).toBe('string');
    expect(typeof result.iv).toBe('string');
    expect(typeof result.tag).toBe('string');
    expect(typeof result.key).toBe('string');
  });

  test('decrypts data correctly', async () => {
    const encrypted = await encryptData(testData);
    const decrypted = await decryptData(encrypted);
    
    expect(decrypted).toBe(testData);
  });

  test('handles encryption errors', async () => {
    const AWS = require('aws-sdk');
    AWS.KMS.mockImplementationOnce(() => ({
      generateDataKey: jest.fn().mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('KMS error'))
      })
    }));

    await expect(encryptData(testData)).rejects.toThrow('Failed to encrypt data');
  });

  test('handles decryption errors', async () => {
    const invalidData: EncryptedData = {
      encrypted: 'invalid',
      iv: 'invalid',
      tag: 'invalid',
      key: 'invalid'
    };

    await expect(decryptData(invalidData)).rejects.toThrow('Failed to decrypt data');
  });
});
