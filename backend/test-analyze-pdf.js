/**
 * Test Script for Self-Priced PDF Analysis
 * 
 * This PDF already has prices - we need to understand the structure
 * and see if our markup system can handle it.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Use pdfjs-dist like the main service
const pdfjsLib = require('pdfjs-dist');

const pdfPath = path.join(__dirname, 'CARNAVAL_CIRCO_26.pdf');

async function analyzePdf() {
    console.log('='.repeat(60));
    console.log('ANALYZING: CARNAVAL_CIRCO_26.pdf');
    console.log('='.repeat(60));

    const dataBuffer = new Uint8Array(fs.readFileSync(pdfPath));
    const pdf = await pdfjsLib.getDocument({ data: dataBuffer }).promise;

    console.log('\nTotal Pages:', pdf.numPages);

    // Extract text from first few pages
    for (let pageNum = 1; pageNum <= Math.min(3, pdf.numPages); pageNum++) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`PAGE ${pageNum}`);
        console.log('='.repeat(60));

        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        // Get all text items
        const textItems = textContent.items.map(item => ({
            text: item.str,
            x: Math.round(item.transform[4]),
            y: Math.round(item.transform[5]),
            fontSize: Math.round(item.transform[0])
        }));

        // Look for prices (R$ pattern or just numbers that look like prices)
        const pricePattern = /R\$\s*[\d.,]+|^\d{1,3}[.,]\d{2}$/;
        const codePattern = /^\d{5,7}$/;

        console.log('\n--- TEXT ITEMS (first 50) ---');
        textItems.slice(0, 50).forEach((item, i) => {
            const isPrice = pricePattern.test(item.text);
            const isCode = codePattern.test(item.text);
            const marker = isPrice ? ' [PRICE]' : (isCode ? ' [CODE]' : '');
            console.log(`${i}: "${item.text}" at (${item.x}, ${item.y})${marker}`);
        });

        // Find all potential prices
        const prices = textItems.filter(item => pricePattern.test(item.text));
        const codes = textItems.filter(item => codePattern.test(item.text));

        console.log('\n--- PRICES FOUND ---');
        prices.forEach(p => console.log(`  "${p.text}" at (${p.x}, ${p.y})`));

        console.log('\n--- CODES FOUND ---');
        codes.forEach(c => console.log(`  "${c.text}" at (${c.x}, ${c.y})`));
    }
}

analyzePdf().then(() => {
    console.log('\n\nAnalysis complete.');
    process.exit(0);
}).catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
