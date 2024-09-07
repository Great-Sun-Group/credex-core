import { denomFormatter } from '../utils/denomUtils';

console.log('Testing denomFormatter function:');

console.log('USD test:', denomFormatter(1234.56, 'USD') === '1,234.56' ? 'PASS' : 'FAIL');
console.log('CXX test:', denomFormatter(1234.567, 'CXX') === '1,234.567' ? 'PASS' : 'FAIL');
console.log('XAU test:', denomFormatter(1234.5678, 'XAU') === '1,234.5678' ? 'PASS' : 'FAIL');
console.log('Negative number test:', denomFormatter(-1234.56, 'USD') === '-1,234.56' ? 'PASS' : 'FAIL');
console.log('Zero test:', denomFormatter(0, 'USD') === '0.00' ? 'PASS' : 'FAIL');

console.log('\nActual outputs:');
console.log('USD:', denomFormatter(1234.56, 'USD'));
console.log('CXX:', denomFormatter(1234.567, 'CXX'));
console.log('XAU:', denomFormatter(1234.5678, 'XAU'));
console.log('Negative:', denomFormatter(-1234.56, 'USD'));
console.log('Zero:', denomFormatter(0, 'USD'));