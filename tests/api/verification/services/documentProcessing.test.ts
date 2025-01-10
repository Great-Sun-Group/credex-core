import { mapFields, validateFields } from '../../../../src/api/verification/services/documentFieldMapping';
import { verifyDocument } from '../../../../src/api/verification/services/documentAuthenticity';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Document Processing', () => {
  describe('Field Mapping', () => {
    test('maps drivers license fields correctly', () => {
      const extractedData = {
        'License No': 'DL123456',
        'Name': 'John Doe',
        'DOB': '1990-01-01',
        'Expiry': '2025-01-01'
      };

      const mapped = mapFields('DRIVERS_LICENSE', extractedData);
      
      expect(mapped).toEqual({
        licenseNumber: 'DL123456',
        fullName: 'John Doe',
        dateOfBirth: '1990-01-01',
        expiryDate: '2025-01-01'
      });
    });

    test('validates required fields', () => {
      const mappedData = {
        licenseNumber: 'DL123456',
        fullName: 'John Doe',
        // Missing dateOfBirth
        expiryDate: '2025-01-01'
      };

      const result = validateFields('DRIVERS_LICENSE', mappedData);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('dateOfBirth');
    });
  });

  describe('Document Authenticity', () => {
    test('verifies valid document', async () => {
      const validId = readFileSync(join(__dirname, '../../../fixtures/verification/valid-id.jpg'));
      const result = await verifyDocument(validId);

      expect(result.isAuthentic).toBe(true);
      expect(result.securityFeatures.confidence).toBeGreaterThanOrEqual(90);
    });

    test('rejects tampered document', async () => {
      const tamperedId = readFileSync(join(__dirname, '../../../fixtures/verification/tampered-id.jpg'));
      const result = await verifyDocument(tamperedId);

      expect(result.isAuthentic).toBe(false);
      expect(result.securityFeatures.confidence).toBeLessThan(90);
    });
  });
}); 