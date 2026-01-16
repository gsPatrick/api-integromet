const textPdfParser = require('./src/services/textPdfParser.service');
const path = require('path');

async function debug() {
    const pdfPath = path.join(__dirname, 'Lookbook CP-Fantástico Planeta Precoce (5).pdf');
    console.log('Testing extraction on:', pdfPath);

    const products = await textPdfParser.extractProducts(pdfPath);
    console.log('Total extracted:', products.length);
    if (products.length > 0) {
        console.log('Sample (first 5):', products.slice(0, 5));
        console.log('Sample (last 5):', products.slice(-5));

        // Check for specific codes user might expect
        const codes = products.map(p => p.code);
        console.log('Unique Codes:', new Set(codes).size);
    } else {
        console.log('No products extracted. Check regex or PDF format.');
    }
}

debug();
