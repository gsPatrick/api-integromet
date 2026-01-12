const service = require('./src/services/catalogMarkup.service');
const path = require('path');

// Output directory correction for standalone run (service assumes ../../public relative to src/services)
// Since we run from backend root, relative path from service inside src/services works fine if service uses __dirname.
// Service uses: path.join(__dirname, '../../public/uploads/catalogs/markup')
// From src/services, ../.. is backend root. So public is backend/public. Correct.

const visualPdf = path.join(__dirname, 'Catalogo Milon Inverno 2026 - Pg Dupla Baixa (1).pdf');
const pricePdf = path.join(__dirname, 'MI26_CA ANTECIPADO (1).pdf');

console.log('--- TEST DUAL PDF MARKUP ---');
console.log('Visual:', visualPdf);
console.log('Price:', pricePdf);

(async () => {
    try {
        console.log('Running generateMarkupPdf...');
        const result = await service.generateMarkupPdf(visualPdf, 10, pricePdf);
        console.log('\n✅ SUCCESS!');
        console.log('Output File:', result.outputPath);
        console.log('Prices Injected:', result.pricesUpdated);
    } catch (e) {
        console.error('\n❌ ERROR:', e);
    }
})();
