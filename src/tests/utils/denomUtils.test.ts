import { denomFormatter } from '../../utils/denomUtils';

describe('denomFormatter', () => {
  test('formats USD correctly', () => {
    expect(denomFormatter(1234.56, 'USD')).toBe('1,234.56');
  });

  test('formats CXX correctly', () => {
    expect(denomFormatter(1234.567, 'CXX')).toBe('1,234.567');
  });

  test('formats XAU correctly', () => {
    expect(denomFormatter(1234.5678, 'XAU')).toBe('1,234.5678');
  });

  test('handles negative numbers', () => {
    expect(denomFormatter(-1234.56, 'USD')).toBe('-1,234.56');
  });

  test('handles zero', () => {
    expect(denomFormatter(0, 'USD')).toBe('0.00');
  });
});