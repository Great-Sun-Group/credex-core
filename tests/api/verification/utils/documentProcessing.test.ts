import { inferDocumentType } from '../../../../src/api/verification/utils/documentProcessing';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Document Processing Utils', () => {
  describe('inferDocumentType', () => {
    test('detects drivers license', async () => {
      const buffer = readFileSync(join(__dirname, '../../../fixtures/verification/drivers-license.jpg'));
      const type = await inferDocumentType(buffer);
      expect(type).toBe('DRIVERS_LICENSE');
    });

    test('detects passport', async () => {
      const buffer = readFileSync(join(__dirname, '../../../fixtures/verification/passport.jpg'));
      const type = await inferDocumentType(buffer);
      expect(type).toBe('PASSPORT');
    });

    test('defaults to national ID for unclear documents', async () => {
      const buffer = readFileSync(join(__dirname, '../../../fixtures/verification/blurry-id.jpg'));
      const type = await inferDocumentType(buffer);
      expect(type).toBe('NATIONAL_ID');
    });
  });
}); 