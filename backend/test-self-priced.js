/**
 * Test Markup on Self-Priced PDF (CARNAVAL_CIRCO_26.pdf)
 * 
 * This PDF already has prices - let's see if the system can apply markup to it
 * by treating IT AS BOTH the visual catalog AND the price list.
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const catalogMarkupService = require('./src/services/catalogMarkup.service');

const PDF_PATH = path.join(__dirname, 'CARNAVAL_CIRCO_26.pdf');
const MARKUP = -20; // -20% discount as user tried

async function runTest() {
    console.log('='.repeat(60));
    console.log('TEST: Self-Priced PDF Markup');
    console.log('='.repeat(60));
    console.log('PDF:', path.basename(PDF_PATH));
    console.log('Markup:', MARKUP + '%');
    console.log('-'.repeat(60));

    try {
        const startTime = Date.now();

        // Test 1: Use same PDF as both visual and price list
        console.log('\n[TEST 1] Using same PDF as visual + price list...\n');

        const result = await catalogMarkupService.generateMarkupPdf(
            PDF_PATH,
            MARKUP,
            [PDF_PATH] // Same PDF as price list
        );

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log('-'.repeat(60));
        console.log('\nRESULTS:');
        console.log('  Output:', result.outputPath);
        console.log('  Prices Updated:', result.pricesUpdated);
        console.log('  Time:', elapsed, 'seconds');

        if (result.pricesUpdated === 0) {
            console.log('\n⚠️  NO PRICES WERE UPDATED!');
            console.log('  This means either:');
            console.log('  1. AI could not extract prices from this PDF format');
            console.log('  2. The codes in visual did not match codes in price extraction');
            console.log('  3. The PDF structure is different from expected');
        } else {
            console.log('\n✅ SUCCESS!', result.pricesUpdated, 'prices updated');
        }

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error);
    }
}

runTest();
