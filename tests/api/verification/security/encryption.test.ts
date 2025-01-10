import { encryptData, decryptData } from '../../../../src/api/verification/utils/encryption';
import { EncryptedData } from '../../../../src/api/verification/types/security';

jest.mock('aws-sdk', () => ({
  KMS: jest.fn(() => ({
    generateDataKey: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Plaintext: Buffer.from('test-key'),
        CiphertextBlob: Buffer.from('encrypted-key')
      })
    }),
    decrypt: jest.fn().mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Plaintext: Buffer.from('test-key')
      })
    })
  }))
}));

describe('Encryption Utils', () => {
  const testData = 'sensitive-data';

  test('encrypts data successfully', async () => {
    const result = await encryptData(testData);
    
    expect(result).toHaveProperty('encrypted');
    expect(result).toHaveProperty('iv');
    expect(result).toHaveProperty('tag');
    expect(result).toHaveProperty('key');
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