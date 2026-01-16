const fs = require('fs');
const path = require('path');

async function dump() {
    const pdfPath = path.join(__dirname, 'Lookbook CP-Fantástico Planeta Precoce (5).pdf');
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const dataBuffer = new Uint8Array(fs.readFileSync(pdfPath));
    const pdf = await pdfjsLib.getDocument({ data: dataBuffer }).promise;

    console.log(`Pages: ${pdf.numPages}`);
    // Dump first 3 pages
    for (let i = 1; i <= Math.min(3, pdf.numPages); i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const strings = textContent.items.map(item => item.str);
        console.log(`--- Page ${i} ---`);
        console.log(strings.join(' | '));
    }
}

dump();
