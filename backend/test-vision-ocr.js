/**
 * Test: GPT-4o Vision OCR on Image-Based PDF
 * 
 * This script tests the fallback to Vision API when standard text extraction fails.
 * It uses the CARNAVAL_CIRCO_26.pdf which we know has no extractable text.
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const catalogMarkupService = require('./src/services/catalogMarkup.service');

const PDF_PATH = path.join(__dirname, 'CARNAVAL_CIRCO_26.pdf');
const MARKUP = -20; // -20% discount

async function runTest() {
    console.log('='.repeat(60));
    console.log('TEST: Vision OCR Fallback');
    console.log('='.repeat(60));
    console.log('PDF:', path.basename(PDF_PATH));
    console.log('Markup:', MARKUP + '%');
    console.log('-'.repeat(60));

    try {
        const startTime = Date.now();

        // Ensure we pass empty array as price list to trigger Single PDF mode
        const result = await catalogMarkupService.generateMarkupPdf(
            PDF_PATH,
            MARKUP,
            []
        );

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log('-'.repeat(60));
        console.log('\nRESULTS:');
        console.log('  Output:', result.outputPath);
        console.log('  Prices Updated:', result.pricesUpdated);
        console.log('  Time:', elapsed, 'seconds');

        if (result.pricesUpdated > 0) {
            console.log('\n✅ SUCCESS! Vision OCR successfully found prices.');
        } else {
            console.log('\n⚠️  FAILURE: No prices found even with Vision.');
        }

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error);
    }
}

runTest();
