// Load env vars
require('dotenv').config();

const path = require('path');

const catalogMarkupService = require('./src/services/catalogMarkup.service');

async function testMarkup() {
    try {
        const visualPdfPath = path.resolve(__dirname, 'Catalogo Nanai Inverno&Outono 2026 - Pg Dupla Baixa.pdf');
        const pricePdfPath = path.resolve(__dirname, 'NNI26_CA ANTECIPADO.pdf');

        console.log('Testing with Visual PDF:', visualPdfPath);
        console.log('Testing with Price PDF:', pricePdfPath);

        const result = await catalogMarkupService.generateMarkupPdf(
            visualPdfPath,
            35, // 35% Markup
            [pricePdfPath]
        );

        console.log('Test completed. Output:', result);

    } catch (error) {
        console.error('Test Failed:', error);
    }
}

testMarkup();
