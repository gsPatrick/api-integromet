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
const pdfParserAIService = require('./pdfParserAI.service');

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

            // Process each line (sorted by Y descending for logic flow)
            const sortedYs = Object.keys(lines).map(Number).sort((a, b) => b - a);

            let currentSizeLabels = [];

            // Helper to detect size line
            const isSizeLine = (str) => {
                // Not a code line
                if (/\b\d{4,8}\b/.test(str)) return false;
                // Has size patterns
                const sizePatterns = [
                    /\b\d{1,2}\s?a\s?\d{1,2}\b/, // 1 a 3
                    /\b(RN|P|M|G|GG|XG)\b/,       // P M G
                    /\b(UN|ÚNICO)\b/i
                ];
                return sizePatterns.some(p => p.test(str));
            };

            const extractSizes = (str) => {
                // Regex to capture individual size tokens
                const tokenRegex = /\b(\d{1,2}\s?a\s?\d{1,2}|RN|P|M|G|GG|XG|UN|ÚNICO)\b/gi;
                return [...str.matchAll(tokenRegex)].map(m => m[0]);
            };

            for (let i = 0; i < sortedYs.length; i++) {
                const y = sortedYs[i];
                const lineParts = lines[y];
                const fullLine = lineParts.join(' ');

                // Check for Size Header Line FIRST
                if (isSizeLine(fullLine)) {
                    const extracted = extractSizes(fullLine);
                    if (extracted.length > 0) {
                        currentSizeLabels = extracted;
                        // console.log(`[Parser] Updated Size Labels at Y=${y}:`, currentSizeLabels);
                        continue; // Assume this line is just headers
                    }
                }

                // Check for Code
                const codeMatch = fullLine.match(/\b\d{4,8}\b/);

                // Find Preços
                const priceMatches = [...fullLine.matchAll(/(?:R\$\s?)?(\d{1,3}(?:\.\d{3})*,\d{2})/g)];

                if (codeMatch) {
                    const code = codeMatch[0];
                    let extractedPrices = [];

                    // CASE 1: Prices on SAME line
                    if (priceMatches.length > 0) {
                        extractedPrices = priceMatches.map((m, idx) => ({
                            price: this.parseBrazilianPrice(m[1] || m[0]),
                            label: currentSizeLabels[idx] || ''
                        }));
                    }
                    // CASE 2: Prices on NEXT line(s)
                    else {
                        if (i + 1 < sortedYs.length) {
                            const nextLine = lines[sortedYs[i + 1]].join(' ');
                            const nextPrices = [...nextLine.matchAll(/(?:R\$\s?)?(\d{1,3}(?:\.\d{3})*,\d{2})/g)];

                            if (nextPrices.length > 0) {
                                extractedPrices = nextPrices.map((m, idx) => ({
                                    price: this.parseBrazilianPrice(m[1] || m[0]),
                                    label: currentSizeLabels[idx] || ''
                                }));
                            }
                        }
                    }

                    if (extractedPrices.length > 0) {
                        const validPrices = extractedPrices.filter(p => p.price > 0);
                        if (validPrices.length > 0) {
                            priceMap.set(code, validPrices);
                        }
                    }
                }
            }
        }

        console.log(`[CatalogMarkup] Extracted prices for ${priceMap.size} codes`);
        return priceMap;
    }

    async generateMarkupPdf(pdfPath, markupPercentage, pricePdfPaths = []) {
        // Normalize to array just in case
        const paths = Array.isArray(pricePdfPaths) ? pricePdfPaths : (pricePdfPaths ? [pricePdfPaths] : []);

        if (paths.length > 0) {
            return this.generateMergedPdf(pdfPath, paths, markupPercentage);
        }

        return this.generateSinglePdfReplace(pdfPath, markupPercentage);
    }

    // Helper for old logic (single PDF mode)
    async generateSinglePdfReplace(pdfPath, markupPercentage) {
        console.log(`[CatalogMarkup] Processing Single PDF: ${pdfPath}`);
        const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
        const pdfBuffer = fs.readFileSync(pdfPath);
        // Regex updated to capture prices WITH or WITHOUT "R$" prefix
        // Matches: "R$ 202,37", "R$202,37", "122,70", "1.234,56"
        const priceRegex = /(?:R\$\s?)?(\d{1,3}(?:\.\d{3})*,\d{2})/g;
        const prices = await this.extractItemsFromPdf(pdfBuffer, priceRegex);

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

            page.drawRectangle({
                x: priceInfo.x - 2, y: priceInfo.y - 2,
                width: priceInfo.width + 4, height: priceInfo.height + 4,
                color: rgb(1, 1, 1),
            });
            page.drawText(newPriceText, {
                x: priceInfo.x, y: priceInfo.y, size: fontSize, font: font, color: rgb(0.8, 0, 0),
            });
            successCount++;
        }
        return this.savePdf(pdfDoc, pdfPath, markupPercentage, successCount);
    }

    normalizeCode(code) {
        if (!code) return '';
        return code.replace(/\s+/g, '').toUpperCase();
    }

    async generateMergedPdf(visualPdfPath, pricePdfPaths, markupPercentage) {
        console.log(`[CatalogMarkup] Generate Merged PDF. Visual: ${visualPdfPath}, Price Files: ${pricePdfPaths.length}`);

        // 1. Build Master Price Map from ALL files
        const masterPriceMap = new Map();

        for (const pPath of pricePdfPaths) {
            try {
                console.log(`[CatalogMarkup] Parsing price file: ${path.basename(pPath)}`);
                const fileBuffer = fs.readFileSync(pPath);
                const fileMap = await pdfParserAIService.parsePricePdf(fileBuffer);

                // Merge into master with NORMALIZED keys
                fileMap.forEach((value, key) => {
                    const normalizedKey = this.normalizeCode(key);
                    masterPriceMap.set(normalizedKey, value);
                });
                console.log(`[CatalogMarkup] Merged ${fileMap.size} codes from ${path.basename(pPath)}`);
            } catch (err) {
                console.error(`[CatalogMarkup] Failed to parse price file ${pPath}:`, err.message);
            }
        }

        console.log(`[CatalogMarkup] Total codes in Master Price Map: ${masterPriceMap.size}`);

        // 2. Extract Codes from Visual Catalog
        const pdfBuffer = fs.readFileSync(visualPdfPath);
        // RegEx extended for:
        // 1. Standard numeric: 2000711 (4-8 digits)
        // 2. Alphanumeric: LVT 6011, LBL 6016 (2-3 chars + space? + digits)
        // Update: \s* allows flexible spacing
        const codeRegex = /(?:\b[A-Z]{2,3}\s*\d{4,6}\b|\b\d{4,8}\b)/g;

        const codes = await this.extractItemsFromPdf(pdfBuffer, codeRegex);
        console.log(`[CatalogMarkup] Found ${codes.length} codes in visual catalog. Matching...`);

        // 3. Edit PDF
        const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
        const pdfDoc = await PDFDocument.load(new Uint8Array(pdfBuffer));
        const pages = pdfDoc.getPages();
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold); // For price
        const labelFont = await pdfDoc.embedFont(StandardFonts.Helvetica); // For label

        // DEBUG: Print sample codes for comparison
        const masterKeys = Array.from(masterPriceMap.keys()).slice(0, 20);
        const visualSamples = codes.slice(0, 20).map(c => this.normalizeCode(c.text));

        console.log('[DEBUG] Master Price Keys (Sample):', masterKeys);
        console.log('[DEBUG] Visual Codes Normalized (Sample):', visualSamples);

        let successCount = 0;

        for (const item of codes) {
            const code = item.text;
            const normalizedCode = this.normalizeCode(code);
            const priceList = masterPriceMap.get(normalizedCode); // Lookup by normalized key

            if (priceList && priceList.length > 0) {
                const page = pages[item.pageIndex];
                if (!page) continue;

                const fontSize = 11; // Increased from 10
                const lineHeight = 11; // Compact spacing
                const xOffset = item.width + 10; // Right of code

                // Adjust Start Y based on number of lines to center vertically or grow upwards?
                // Visual PDF has code baseline. Descriptions are below.
                // We should start slightly higher to allow list to grow downwards without hitting description.
                // Or grow Upwards? No, standard is list top-down.
                const startY = item.y + (priceList.length > 1 ? 5 : 0);

                // Calculate dimensions for Background Box
                const boxPadding = 2;
                let maxLineWidth = 0;

                // Pre-calc width
                priceList.forEach(p => {
                    const newValue = p.price * (1 + markupPercentage / 100);
                    const newPriceText = this.formatBrazilianPrice(newValue);
                    const labelText = p.label ? `${p.label} ` : '';
                    const fullText = labelText + newPriceText;
                    const width = font.widthOfTextAtSize(fullText, fontSize);
                    if (width > maxLineWidth) maxLineWidth = width;
                });

                const boxWidth = maxLineWidth + (boxPadding * 2);
                const boxHeight = (priceList.length * lineHeight) + (boxPadding * 2);
                const boxX = item.x + xOffset - boxPadding;
                const boxY = startY - ((priceList.length - 1) * lineHeight) - 2; // Bottom Y

                // Draw White Background Box
                page.drawRectangle({
                    x: boxX,
                    y: boxY,
                    width: boxWidth,
                    height: boxHeight,
                    color: rgb(1, 1, 1), // White
                });

                // Draw list of prices
                priceList.forEach((p, idx) => {
                    const newValue = p.price * (1 + markupPercentage / 100);
                    const newPriceText = this.formatBrazilianPrice(newValue);
                    const labelText = p.label ? `${p.label} ` : '';

                    const currentY = startY - (idx * lineHeight);

                    // Draw Label
                    if (p.label) {
                        page.drawText(labelText, {
                            x: item.x + xOffset,
                            y: currentY,
                            size: fontSize,
                            font: font,
                            color: rgb(0.8, 0, 0), // RED
                        });
                    }

                    // Draw Price
                    const labelWidth = p.label ? font.widthOfTextAtSize(labelText, fontSize) : 0;

                    page.drawText(newPriceText, {
                        x: item.x + xOffset + labelWidth,
                        y: currentY,
                        size: fontSize,
                        font: font,
                        color: rgb(0.8, 0, 0), // RED
                    });
                });

                successCount++;
            }
        }

        console.log(`[CatalogMarkup] Injected prices for ${successCount} products`);
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
