/**
 * Test Script for Catalog Markup PDF Generation
 * 
 * This script tests the same function used by the API to verify
 * if prices are being correctly injected into the visual catalog.
 * 
 * Usage: node test-catalog-markup.js
 */

// Load environment variables FIRST
require('dotenv').config();

const path = require('path');
const fs = require('fs');

// Import the actual service used by the API
const catalogMarkupService = require('./src/services/catalogMarkup.service');

// Test files
const VISUAL_CATALOG = path.join(__dirname, 'Catalogo Nanai Inverno&Outono 2026 - Pg Dupla Baixa.pdf');
const PRICE_LIST = path.join(__dirname, 'NNI26_CA ANTECIPADO.pdf');
const MARKUP_PERCENTAGE = -30; // Same as you tested in the UI

async function runTest() {
    console.log('='.repeat(60));
    console.log('CATALOG MARKUP TEST');
    console.log('='.repeat(60));

    // 1. Verify files exist
    console.log('\n[1] Checking files...');
    if (!fs.existsSync(VISUAL_CATALOG)) {
        console.error('❌ Visual catalog NOT FOUND:', VISUAL_CATALOG);
        return;
    }
    console.log('✅ Visual catalog found:', path.basename(VISUAL_CATALOG));

    if (!fs.existsSync(PRICE_LIST)) {
        console.error('❌ Price list NOT FOUND:', PRICE_LIST);
        return;
    }
    console.log('✅ Price list found:', path.basename(PRICE_LIST));

    // 2. Run the markup generation
    console.log('\n[2] Generating markup PDF with', MARKUP_PERCENTAGE, '% markup...');
    console.log('-'.repeat(60));

    try {
        const startTime = Date.now();

        const result = await catalogMarkupService.generateMarkupPdf(
            VISUAL_CATALOG,
            MARKUP_PERCENTAGE,
            [PRICE_LIST]  // Array of price PDFs
        );

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

        console.log('-'.repeat(60));
        console.log('\n[3] RESULTS:');
        console.log('✅ PDF generated successfully!');
        console.log('   Output file:', result.outputPath);
        console.log('   Filename:', result.outputFilename);
        console.log('   Prices updated:', result.pricesUpdated);
        console.log('   Time elapsed:', elapsed, 'seconds');

        // Check if file exists and get size
        if (fs.existsSync(result.outputPath)) {
            const stats = fs.statSync(result.outputPath);
            console.log('   File size:', (stats.size / 1024 / 1024).toFixed(2), 'MB');
        }

        console.log('\n[4] DIAGNOSIS:');
        if (result.pricesUpdated === 0) {
            console.log('⚠️  WARNING: No prices were updated!');
            console.log('   This means the codes in the visual catalog did NOT match');
            console.log('   the codes in the price list. Check:');
            console.log('   - Are the product codes formatted the same way?');
            console.log('   - Is the AI correctly parsing the price list?');
        } else {
            console.log('✅ SUCCESS:', result.pricesUpdated, 'prices were injected into the PDF!');
            console.log('   The output file should have the new prices visible.');
        }

        console.log('\n' + '='.repeat(60));
        console.log('TEST COMPLETE');
        console.log('Output saved to:', result.outputPath);
        console.log('='.repeat(60));

    } catch (error) {
        console.error('\n❌ ERROR during generation:');
        console.error(error);
    }
}

// Run the test
runTest();
