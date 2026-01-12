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

    parseBrazilianPrice(priceStr) {
        let cleaned = priceStr.replace(/R\$\s?/g, '').trim();
        cleaned = cleaned.replace(/\./g, '');
        cleaned = cleaned.replace(',', '.');
        return parseFloat(cleaned);
    }

    formatBrazilianPrice(value) {
        return 'R$ ' + value.toFixed(2).replace('.', ',');
    }

    async extractItemsFromPdf(pdfBuffer, regex) {
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const items = [];
        const uint8Array = new Uint8Array(pdfBuffer);
        const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
        const pdfDoc = await loadingTask.promise;

        // Process all pages
        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
            const page = await pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.0 });
            const textContent = await page.getTextContent();

            for (const item of textContent.items) {
                const text = item.str;
                let match;
                // Clone regex because of global state
                const localRegex = new RegExp(regex);
                while ((match = localRegex.exec(text)) !== null) {
                    const matchedText = match[0];
                    const itemX = item.transform[4];
                    const itemY = item.transform[5];
                    const itemWidth = item.width || 0;
                    const charWidth = text.length > 0 ? itemWidth / text.length : 6;

                    items.push({
                        text: matchedText,
                        fullText: text,
                        x: itemX + (match.index * charWidth),
                        y: itemY,
                        width: matchedText.length * charWidth,
                        height: item.height || 10,
                        pageIndex: pageNum - 1
                    });
                }
            }
        }
        return items;
    }

    async extractPriceMapFromPdf(pdfBuffer) {
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const priceMap = new Map(); // Code -> Price
        const uint8Array = new Uint8Array(pdfBuffer);
        const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
        const pdfDoc = await loadingTask.promise;

        for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
            const page = await pdfDoc.getPage(pageNum);
            const textContent = await page.getTextContent();

            // Group by Y coordinate (lines)
            const lines = {};
            textContent.items.forEach(item => {
                const y = Math.round(item.transform[5]); // Round Y to group roughly aligned items
                if (!lines[y]) lines[y] = [];
                lines[y].push(item.str);
            });

            // Process each line (sorted by Y descending for logic flow, but lines object keys are Y strings)
            // Need to sort keys to process sequentially top-down or bottom-up?
            // PDF Y usually grows upwards (0 at bottom). So top items have HIGHER Y.
            // We should process from High Y to Low Y to read line by line natural order.

            const sortedYs = Object.keys(lines).map(Number).sort((a, b) => b - a); // Descending Y (Top to Bottom)

            let lastCode = null;

            sortedYs.forEach(y => {
                const lineParts = lines[y];
                const fullLine = lineParts.join(' ');

                // Matches
                const codeMatch = fullLine.match(/\b\d{4,8}\b/);
                // Regex for price: (R$ )? XX,XX
                const priceMatch = fullLine.match(/(?:R\$\s?)?(\d{1,3}(?:\.\d{3})*,\d{2})/);

                if (codeMatch && priceMatch) {
                    // Perfect match on same line
                    const code = codeMatch[0];
                    const priceStr = priceMatch[1] || priceMatch[0];
                    const price = this.parseBrazilianPrice(priceStr);
                    if (price > 0) priceMap.set(code, price);
                    lastCode = null; // Reset
                } else if (codeMatch) {
                    // Code found, but no price. Wait for next line.
                    lastCode = codeMatch[0];
                } else if (priceMatch && lastCode) {
                    // Price found, and we have a pending code from previous (upper) line
                    const priceStr = priceMatch[1] || priceMatch[0];
                    const price = this.parseBrazilianPrice(priceStr);
                    if (price > 0) priceMap.set(lastCode, price);
                    // Don't reset lastCode yet if we support multiple prices? 
                    // Usually we just want the first price found for the base code.
                    lastCode = null;
                } else {
                    // Reset if line has neither (e.g. Header text or garbage), 
                    // unless it's strictly the next line? 
                    // Let's be lenient: keep lastCode for 1-2 lines? 
                    // For now, reset if we see a new code or strict break.
                    // But in Tables, usually empty lines are rare or ignored.
                }
            });
        }

        console.log(`[CatalogMarkup] Extracted ${priceMap.size} prices from Price List`);
        return priceMap;
    }

    async generateMarkupPdf(pdfPath, markupPercentage, pricePdfPath = null) {
        if (pricePdfPath) {
            return this.generateMergedPdf(pdfPath, pricePdfPath, markupPercentage);
        }

        // --- EXISTING LOGIC FOR SINGLE PDF (REPLACE PRICES) ---
        console.log(`[CatalogMarkup] Processing PDF (Replace Logic): ${pdfPath}`);
        const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
        const pdfBuffer = fs.readFileSync(pdfPath);

        // Regex for prices
        const prices = await this.extractItemsFromPdf(pdfBuffer, /R\$\s?[\d.,]+/g);
        console.log(`[CatalogMarkup] Found ${prices.length} prices to replace`);

        if (prices.length === 0) {
            // Fallback warning handled by caller or just return empty
            console.warn('[CatalogMarkup] No prices found to replace');
        }

        const pdfDoc = await PDFDocument.load(new Uint8Array(pdfBuffer));
        const pages = pdfDoc.getPages();
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        let successCount = 0;

        for (const priceInfo of prices) {
            const page = pages[priceInfo.pageIndex];
            if (!page) continue;

            const originalValue = this.parseBrazilianPrice(priceInfo.text);
            if (isNaN(originalValue)) continue;

            const newValue = originalValue * (1 + markupPercentage / 100);
            const newPriceText = this.formatBrazilianPrice(newValue);
            const fontSize = Math.max(7, Math.min(priceInfo.height * 0.8, 10));

            // Cover old price
            page.drawRectangle({
                x: priceInfo.x - 2,
                y: priceInfo.y - 2,
                width: priceInfo.width + 4,
                height: priceInfo.height + 4,
                color: rgb(1, 1, 1),
            });

            // Draw new price
            page.drawText(newPriceText, {
                x: priceInfo.x,
                y: priceInfo.y,
                size: fontSize,
                font: font,
                color: rgb(0.8, 0, 0),
            });
            successCount++;
        }

        return this.savePdf(pdfDoc, pdfPath, markupPercentage, successCount);
    }

    async generateMergedPdf(visualPdfPath, pricePdfPath, markupPercentage) {
        console.log(`[CatalogMarkup] Generate Merged PDF. Visual: ${visualPdfPath}, Price: ${pricePdfPath}`);

        // 1. Build Price Map with enhanced multi-line parser
        const priceMap = await this.extractPriceMapFromPdf(fs.readFileSync(pricePdfPath));

        // 2. Extract Codes from Visual PDF
        const pdfBuffer = fs.readFileSync(visualPdfPath);
        const codes = await this.extractItemsFromPdf(pdfBuffer, /\b\d{4,8}\b/g);
        console.log(`[CatalogMarkup] Found ${codes.length} codes in Visual PDF`);

        // 3. Edit PDF
        const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
        const pdfDoc = await PDFDocument.load(new Uint8Array(pdfBuffer));
        const pages = pdfDoc.getPages();
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        let successCount = 0;

        for (const item of codes) {
            const code = item.text;
            const originalPrice = priceMap.get(code);

            if (originalPrice) {
                const page = pages[item.pageIndex];
                if (!page) continue;

                const newValue = originalPrice * (1 + markupPercentage / 100);
                const newPriceText = this.formatBrazilianPrice(newValue);

                // POSITION ADJUSTMENT:
                // Move text to the RIGHT of the code to avoid overlap with description below
                // Assuming code width ~40-60px
                const fontSize = 10;
                const xOffset = item.width + 12; // 12px padding to right

                // Keep Y same as code (aligned baseline) or slightly adjusted
                // Usually pdf-lib baseline matches.

                page.drawText(newPriceText, {
                    x: item.x + xOffset,
                    y: item.y, // Same line
                    size: fontSize,
                    font: font,
                    color: rgb(0.8, 0, 0), // Red
                });
                successCount++;
            }
        }

        console.log(`[CatalogMarkup] Injected ${successCount} prices into Visual PDF`);
        return this.savePdf(pdfDoc, visualPdfPath, markupPercentage, successCount);
    }

    async savePdf(pdfDoc, originalPath, markup, count) {
        const pdfBytes = await pdfDoc.save();
        const originalName = path.basename(originalPath, '.pdf');
        const outputFilename = `${originalName}_markup_${markup}pct_${Date.now()}.pdf`;
        const outputPath = path.join(this.outputDir, outputFilename);
        fs.writeFileSync(outputPath, pdfBytes);

        return {
            outputPath,
            outputFilename,
            pricesUpdated: count
        };
    }

}

module.exports = new CatalogMarkupService();
