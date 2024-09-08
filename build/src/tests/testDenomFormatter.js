"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const denomUtils_1 = require("../utils/denomUtils");
console.log('Testing denomFormatter function:');
console.log('USD test:', (0, denomUtils_1.denomFormatter)(1234.56, 'USD') === '1,234.56' ? 'PASS' : 'FAIL');
console.log('CXX test:', (0, denomUtils_1.denomFormatter)(1234.567, 'CXX') === '1,234.567' ? 'PASS' : 'FAIL');
console.log('XAU test:', (0, denomUtils_1.denomFormatter)(1234.5678, 'XAU') === '1,234.5678' ? 'PASS' : 'FAIL');
console.log('Negative number test:', (0, denomUtils_1.denomFormatter)(-1234.56, 'USD') === '-1,234.56' ? 'PASS' : 'FAIL');
console.log('Zero test:', (0, denomUtils_1.denomFormatter)(0, 'USD') === '0.00' ? 'PASS' : 'FAIL');
console.log('\nActual outputs:');
console.log('USD:', (0, denomUtils_1.denomFormatter)(1234.56, 'USD'));
console.log('CXX:', (0, denomUtils_1.denomFormatter)(1234.567, 'CXX'));
console.log('XAU:', (0, denomUtils_1.denomFormatter)(1234.5678, 'XAU'));
console.log('Negative:', (0, denomUtils_1.denomFormatter)(-1234.56, 'USD'));
console.log('Zero:', (0, denomUtils_1.denomFormatter)(0, 'USD'));
//# sourceMappingURL=testDenomFormatter.js.map