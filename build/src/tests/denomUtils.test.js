"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const denomUtils_1 = require("../utils/denomUtils");
describe('denomFormatter', () => {
    test('formats USD correctly', () => {
        expect((0, denomUtils_1.denomFormatter)(1234.56, 'USD')).toBe('1,234.56');
    });
    test('formats CXX correctly', () => {
        expect((0, denomUtils_1.denomFormatter)(1234.567, 'CXX')).toBe('1,234.567');
    });
    test('formats XAU correctly', () => {
        expect((0, denomUtils_1.denomFormatter)(1234.5678, 'XAU')).toBe('1,234.5678');
    });
    test('handles negative numbers', () => {
        expect((0, denomUtils_1.denomFormatter)(-1234.56, 'USD')).toBe('-1,234.56');
    });
    test('handles zero', () => {
        expect((0, denomUtils_1.denomFormatter)(0, 'USD')).toBe('0.00');
    });
});
//# sourceMappingURL=denomUtils.test.js.map