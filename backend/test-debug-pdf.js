/**
 * Debug: Dump all text items from PDF to understand structure
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');

const PDF_PATH = path.join(__dirname, 'CARNAVAL_CIRCO_26.pdf');

async function debugPdf() {
    console.log('='.repeat(60));
    console.log('DEBUG: Dumping PDF Text Items');
    console.log('='.repeat(60));

    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdfBuffer = fs.readFileSync(PDF_PATH);
    const uint8Array = new Uint8Array(pdfBuffer);
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdfDoc = await loadingTask.promise;

    console.log('Total Pages:', pdfDoc.numPages);

    // Only check first 2 pages
    for (let pageNum = 1; pageNum <= Math.min(2, pdfDoc.numPages); pageNum++) {
        console.log(`\n${'='.repeat(40)}`);
        console.log(`PAGE ${pageNum}`);
        console.log('='.repeat(40));

        const page = await pdfDoc.getPage(pageNum);
        const textContent = await page.getTextContent();

        // Log all text items
        const allText = textContent.items.map(item => item.str).filter(s => s.trim());
        console.log('\nAll Text Items:');
        allText.forEach((t, i) => console.log(`  ${i}: "${t}"`));

        // Look for price patterns
        console.log('\n--- Checking for price patterns ---');
        const patterns = [
            { name: 'R$ X,XX', regex: /R\$\s*\d+,\d{2}/g },
            { name: 'X,XX (2 decimals)', regex: /\d+,\d{2}/g },
            { name: 'X.XXX,XX', regex: /\d{1,3}\.\d{3},\d{2}/g },
            { name: 'Any number', regex: /\d+/g }
        ];

        for (const p of patterns) {
            const matches = allText.join(' ').match(p.regex);
            console.log(`  ${p.name}: ${matches ? matches.length : 0} matches`);
            if (matches && matches.length > 0) {
                console.log(`    Samples: ${matches.slice(0, 5).join(', ')}`);
            }
        }
    }
}

debugPdf().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
