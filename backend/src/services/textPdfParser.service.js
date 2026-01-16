const fs = require('fs');
const path = require('path');

class TextPdfParserService {
    async extractProducts(pdfPath) {
        console.log(`[TextPdfParser] Extracting from: ${pdfPath}`);

        try {
            // Dynamic import for ESM module
            const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

            const dataBuffer = new Uint8Array(fs.readFileSync(pdfPath));
            const pdf = await pdfjsLib.getDocument({ data: dataBuffer }).promise;

            console.log(`[TextPdfParser] Pages: ${pdf.numPages}`);

            const extractedProducts = [];

            // Limit pages if necessary, but for valid catalog we want all
            const maxPages = pdf.numPages; // Or limit if huge

            for (let i = 1; i <= maxPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();

                // Concatenate text items to find patterns
                // Simple strategy: Look for items that look like codes or prices nearby
                // Or simply extract all tokens and process linearly

                // Let's build a list of tokens with positions
                const tokens = textContent.items.map(item => ({
                    text: item.str,
                    x: Math.round(item.transform[4]), // x info for validation if needed
                    y: Math.round(item.transform[5])
                })).filter(t => t.text.trim().length > 0);

                // Regex patterns
                // Code: 4 to 7 digits (e.g. 3651, 102030)
                // Avoid dates like 2026 or small numbers like sizes
                // Valid codes usually standalone or labelled.
                // Reusing logic from test script:
                const codeRegex = /^\d{4,7}$/;

                // Price: R$ 100,00 or 120,50
                const priceRegex = /R\$\s*[\d.,]+|^\d{1,4}[.,]\d{2}$/;

                // Heuristic:
                // Iterate tokens. If we find a code, look ahead/behind for a price?
                // Or if we find a price, look for the nearest code?

                // For tabular catalogs like Skip Hop, rows are consistent.
                // Let's try to group by Y coordinate (lines) first?
                // But PDF text extraction order isn't guaranteed row-by-row.

                // Simple approach: Capture all codes and all prices on the page.
                // If counts match, map huge assumption.
                // If not, we might need spatial clustering.

                // Let's filter candidates first
                const pageCodes = tokens.filter(t => codeRegex.test(t.text.trim()) && !t.text.includes('2026') && parseInt(t.text) > 100);
                const pagePrices = tokens.filter(t => priceRegex.test(t.text.trim()));

                // If we have codes and prices, let's try to pair them by Y proximity
                // Iterate codes, find price with similar Y (within threshold)

                for (const codeToken of pageCodes) {
                    // Find price on same line (similar Y)
                    const sameLinePrice = pagePrices.find(p => Math.abs(p.y - codeToken.y) < 10);

                    if (sameLinePrice) {
                        // Clean price
                        let priceVal = sameLinePrice.text.replace('R$', '').trim().replace(',', '.');
                        // handle 1.200,50 -> 1200.50 ? Assuming simple format for now

                        extractedProducts.push({
                            code: codeToken.text.trim(),
                            price: parseFloat(priceVal),
                            page: i
                            // name? description? Harder to parse from unstructured tokens without bounding boxes
                        });
                    }
                }
            }

            console.log(`[TextPdfParser] Extracted ${extractedProducts.length} items successfully.`);
            return extractedProducts; // Array of { code, price, page }

        } catch (error) {
            console.error('[TextPdfParser] Error:', error);
            return []; // Fail gracefully
        }
    }
}

module.exports = new TextPdfParserService();
