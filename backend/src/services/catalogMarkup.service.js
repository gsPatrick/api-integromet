/**
 * CatalogMarkup Service - V2
 * Generates new PDFs with updated prices based on markup percentage
 * Uses pdfjs-dist for precise text/coordinate extraction and pdf-lib for PDF editing
 * 
 * Key improvement: Calculates price position WITHIN text items to avoid covering
 * size labels like "1-3", "4-8", "10-12"
 */

const fs = require('fs');
const path = require('path');

class CatalogMarkupService {

    constructor() {
        this.outputDir = path.join(__dirname, '../../public/uploads/catalogs/markup');
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    /**
     * Parse a Brazilian price string to a number
     * Examples: "R$ 49,90" -> 49.90, "R$1.299,00" -> 1299.00
     */
    parseBrazilianPrice(priceStr) {
        let cleaned = priceStr.replace(/R\$\s?/g, '').trim();
        cleaned = cleaned.replace(/\./g, '');
        cleaned = cleaned.replace(',', '.');
        return parseFloat(cleaned);
    }

    /**
     * Format a number back to Brazilian price format
     * Example: 64.87 -> "R$ 64,87"
     */
    formatBrazilianPrice(value) {
        return 'R$ ' + value.toFixed(2).replace('.', ',');
    }

    /**
     * Extract prices and their PRECISE positions from PDF using pdfjs-dist
     * @param {Buffer} pdfBuffer - The PDF file as a buffer
     * @param {number} maxPages - Maximum number of pages to process
     * @returns {Promise<Array>} - Array of price objects with positions
     */
    async extractPricesFromPdf(pdfBuffer, maxPages = 100) {
        // Dynamic import for ESM module
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

        const prices = [];

        // Convert Buffer to Uint8Array (required by pdfjs-dist)
        const uint8Array = new Uint8Array(pdfBuffer);
        const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
        const pdfDoc = await loadingTask.promise;

        const totalPages = Math.min(pdfDoc.numPages, maxPages);
        console.log(`[CatalogMarkup] Processing ${totalPages} of ${pdfDoc.numPages} pages...`);

        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.0 });
            const textContent = await page.getTextContent();

            for (const item of textContent.items) {
                const text = item.str;

                // Find price matches with their index in the string
                const regex = /R\$\s?[\d.,]+/g;
                let match;

                while ((match = regex.exec(text)) !== null) {
                    const priceText = match[0];
                    const matchIndex = match.index;
                    const value = this.parseBrazilianPrice(priceText);

                    if (!isNaN(value) && value > 0) {
                        // Calculate the position of the price within the text item
                        const itemX = item.transform[4];
                        const itemY = item.transform[5];
                        const itemWidth = item.width || 0;
                        const itemHeight = item.height || 10;

                        // Estimate character width (total width / text length)
                        const charWidth = text.length > 0 ? itemWidth / text.length : 6;

                        // Calculate X offset for where the price starts
                        const priceXOffset = matchIndex * charWidth;
                        const priceWidth = priceText.length * charWidth;

                        prices.push({
                            originalText: priceText,
                            fullText: text,
                            value: value,
                            x: itemX + priceXOffset, // Adjusted X position
                            y: itemY,
                            width: priceWidth,       // Width of just the price
                            height: itemHeight,
                            charWidth: charWidth,
                            pageIndex: pageNum - 1,
                            pageHeight: viewport.height
                        });
                    }
                }
            }

            if (pageNum % 20 === 0) {
                console.log(`[CatalogMarkup] Processed page ${pageNum}/${totalPages}`);
            }
        }

        return prices;
    }

    /**
     * Generate a new PDF with markup applied to all prices
     * 
     * @param {string} pdfPath - Path to the original PDF file
     * @param {number} markupPercentage - Markup percentage (e.g., 20 for 20%)
     * @returns {Promise<{outputPath: string, pricesUpdated: number}>}
     */
    async generateMarkupPdf(pdfPath, markupPercentage) {
        console.log(`[CatalogMarkup] Processing PDF: ${pdfPath} with ${markupPercentage}% markup`);

        // Dynamic import for ESM module
        const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');

        // Read the original PDF
        const pdfBuffer = fs.readFileSync(pdfPath);
        console.log(`[CatalogMarkup] Loaded PDF (${(pdfBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

        // Extract prices with precise positions
        const prices = await this.extractPricesFromPdf(pdfBuffer);
        console.log(`[CatalogMarkup] Found ${prices.length} prices to update`);

        if (prices.length === 0) {
            throw new Error('Nenhum preço encontrado no PDF. Verifique se o formato é R$ XX,XX');
        }

        // Load PDF for editing
        const pdfDoc = await PDFDocument.load(new Uint8Array(pdfBuffer));
        const pages = pdfDoc.getPages();
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        let successCount = 0;

        // Process each price
        for (const priceInfo of prices) {
            const page = pages[priceInfo.pageIndex];
            if (!page) continue;

            // Calculate new price
            const newValue = priceInfo.value * (1 + markupPercentage / 100);
            const newPriceText = this.formatBrazilianPrice(newValue);

            // Calculate proper font size based on item height
            const fontSize = Math.max(7, Math.min(priceInfo.height * 0.8, 10));

            // Calculate the width needed for the new price text
            const newTextWidth = font.widthOfTextAtSize(newPriceText, fontSize);

            // Use the larger of: original price width or new text width
            const rectWidth = Math.max(priceInfo.width, newTextWidth) + 4;
            const rectHeight = priceInfo.height + 4;

            const padding = 2;

            try {
                // Draw white rectangle to cover ONLY the old price
                page.drawRectangle({
                    x: priceInfo.x - padding,
                    y: priceInfo.y - padding - 2, // Slight adjustment for baseline
                    width: rectWidth,
                    height: rectHeight,
                    color: rgb(1, 1, 1),
                });

                // Draw new price in red
                page.drawText(newPriceText, {
                    x: priceInfo.x,
                    y: priceInfo.y,
                    size: fontSize,
                    font: font,
                    color: rgb(0.8, 0, 0),
                });

                successCount++;
            } catch (err) {
                // Skip individual price errors
            }
        }

        console.log(`[CatalogMarkup] Updated ${successCount}/${prices.length} prices`);

        // Save the modified PDF
        const pdfBytes = await pdfDoc.save();

        // Generate output filename
        const originalName = path.basename(pdfPath, '.pdf');
        const timestamp = Date.now();
        const outputFilename = `${originalName}_markup_${markupPercentage}pct_${timestamp}.pdf`;
        const outputPath = path.join(this.outputDir, outputFilename);

        fs.writeFileSync(outputPath, pdfBytes);
        console.log(`[CatalogMarkup] Saved to: ${outputPath}`);

        return {
            outputPath: outputPath,
            outputFilename: outputFilename,
            pricesUpdated: successCount,
            pricesFound: prices.length,
            markupApplied: markupPercentage
        };
    }
}

module.exports = new CatalogMarkupService();
