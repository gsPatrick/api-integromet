import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

// Setup __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pdfPath = path.join(__dirname, 'CATALOGO SKIPHOP JAN 26.pdf');

async function analyzePdf() {
    console.log('='.repeat(60));
    console.log('ANALYZING: CATALOGO SKIPHOP JAN 26.pdf');
    console.log('='.repeat(60));

    if (!fs.existsSync(pdfPath)) {
        console.error('File not found:', pdfPath);
        process.exit(1);
    }

    const dataBuffer = new Uint8Array(fs.readFileSync(pdfPath));
    const pdf = await pdfjsLib.getDocument({ data: dataBuffer }).promise;

    console.log('\nTotal Pages:', pdf.numPages);

    // Analyze first 3 pages
    for (let pageNum = 1; pageNum <= Math.min(3, pdf.numPages); pageNum++) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`PAGE ${pageNum}`);
        console.log('='.repeat(60));

        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        let contentStr = "";

        const textItems = textContent.items.map(item => {
            contentStr += item.str + " ";
            return {
                text: item.str,
                x: Math.round(item.transform[4]),
                y: Math.round(item.transform[5]),
                fontSize: Math.round(item.transform[0])
            };
        });

        // Basic patterns
        // Price: R$ 100,00 or 100,00
        const pricePattern = /R\$\s*[\d.,]+|^\d{1,3}[.,]\d{2}$/;
        // Code: 5 to 7 digits
        const codePattern = /^\d{5,7}$/;

        console.log('\n--- EXTRACTED TEXT SAMPLE ---');
        console.log(contentStr.substring(0, 300) + "...");

        const prices = textItems.filter(item => pricePattern.test(item.text));
        const codes = textItems.filter(item => codePattern.test(item.text));

        console.log(`\n--- STATS ---`);
        console.log(`Items found: ${textItems.length}`);
        console.log(`Prices candidate found: ${prices.length}`);
        console.log(`Codes candidate found: ${codes.length}`);

        if (prices.length > 0) {
            console.log('\n--- FIRST 5 PRICES ---');
            prices.slice(0, 5).forEach(p => console.log(`  "${p.text}" at x=${p.x}, y=${p.y}`));
        }

        if (codes.length > 0) {
            console.log('\n--- FIRST 5 CODES ---');
            codes.slice(0, 5).forEach(c => console.log(`  "${c.text}" at x=${c.x}, y=${c.y}`));
        }
    }
}

analyzePdf().then(() => {
    console.log('\n\nAnalysis complete.');
    process.exit(0);
}).catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
