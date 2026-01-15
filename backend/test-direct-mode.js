/**
 * Test Markup on Self-Priced PDF - MODE 2: Direct Price Modification
 * 
 * This tests the single-PDF mode where we find and modify existing prices
 * WITHOUT needing a separate price list.
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const catalogMarkupService = require('./src/services/catalogMarkup.service');

const PDF_PATH = path.join(__dirname, 'CARNAVAL_CIRCO_26.pdf');
const MARKUP = -20; // -20% discount as user tried

async function runTest() {
    console.log('='.repeat(60));
    console.log('TEST: Direct Price Modification (No Price List)');
    console.log('='.repeat(60));
    console.log('PDF:', path.basename(PDF_PATH));
    console.log('Markup:', MARKUP + '%');
    console.log('-'.repeat(60));

    try {
        const startTime = Date.now();

        // Call with EMPTY price list array - this should trigger single PDF mode
        console.log('\n[TEST] Using generateMarkupPdf with NO price list...\n');

        const result = await catalogMarkupService.generateMarkupPdf(
            PDF_PATH,
            MARKUP,
            [] // Empty array = no price list = use direct replacement
        );

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log('-'.repeat(60));
        console.log('\nRESULTS:');
        console.log('  Output:', result.outputPath);
        console.log('  Prices Updated:', result.pricesUpdated);
        console.log('  Time:', elapsed, 'seconds');

        if (result.pricesUpdated === 0) {
            console.log('\n⚠️  NO PRICES WERE UPDATED!');
            console.log('  The price regex might not be matching prices in this PDF.');
        } else {
            console.log('\n✅ SUCCESS!', result.pricesUpdated, 'prices updated directly!');
        }

    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
        console.error(error);
    }
}

runTest();
