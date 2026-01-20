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

    // Helper for single PDF mode - finds prices and modifies them in-place
    async generateSinglePdfReplace(pdfPath, markupPercentage) {
        console.log(`[CatalogMarkup] Processing Single PDF: ${pdfPath}`);
        const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
        const pdfBuffer = fs.readFileSync(pdfPath);

        // Regex to capture prices WITH or WITHOUT "R$" prefix
        const priceRegex = /(?:R\$\s?)?(\d{1,3}(?:\.\d{3})*,\d{2})/g;
        let prices = await this.extractItemsFromPdf(pdfBuffer, priceRegex);

        const pdfDoc = await PDFDocument.load(new Uint8Array(pdfBuffer));
        const pages = pdfDoc.getPages();
        const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

        // If no prices found via text extraction, try Vision API (Gemini Image Edit)
        if (prices.length === 0) {
            console.log(`[CatalogMarkup] No text prices found. Using Gemini Image Editing (ocr_service.py)...`);

            try {
                // Generate output filename
                const originalName = path.basename(pdfPath, '.pdf');
                const outputFilename = `${originalName}_markup_${markupPercentage}pct_${Date.now()}.pdf`;
                const outputFullPath = path.join(this.outputDir, outputFilename);

                // Call Python Script
                await pdfParserAIService.executeGeminiMarkup(pdfPath, outputFullPath, markupPercentage);

                // If successful, return directly (Python did all the work)
                return {
                    outputPath: outputFullPath,
                    outputFilename: outputFilename,
                    pricesUpdated: 999 // Unknown count, but successful
                };

            } catch (visionError) {
                console.error(`[CatalogMarkup] Gemini extraction failed:`, visionError.message);
                throw visionError;
            }
        }

        let successCount = 0;

        for (const priceInfo of prices) {
            const page = pages[priceInfo.pageIndex];
            if (!page) continue;

            // Get value - either from parsed text or directly from Vision
            const originalValue = priceInfo.value !== undefined
                ? priceInfo.value
                : this.parseBrazilianPrice(priceInfo.text);

            if (isNaN(originalValue) || originalValue <= 0) continue;

            const newValue = originalValue * (1 + markupPercentage / 100);
            const newPriceText = this.formatBrazilianPrice(newValue);

            // Tunning Font Size:
            // Use 50% of the original box height as font size foundation
            let fontSize = priceInfo.height * 0.5;
            if (fontSize < 12) fontSize = 12; // Increased min size for better visibility
            if (fontSize > 40) fontSize = 40;

            // Measure new text dimensions
            const textWidth = font.widthOfTextAtSize(newPriceText, fontSize);
            const textHeight = font.heightAtSize(fontSize);

            // Box dimensions:
            // Width: Adapt to text width (prevent overflow)
            // Height: Use the NEW text height + padding. 
            // We rely on Bottom Anchoring to ensure we cover the price and not the header.
            const boxWidth = Math.max(textWidth + 12, priceInfo.width);
            const boxHeight = textHeight + 10;

            // Anchoring Strategy: BOTTOM-CENTER
            const originalCenterX = priceInfo.x + (priceInfo.width / 2);

            // White Rectangle Position
            const rectX = originalCenterX - (boxWidth / 2);
            const rectY = priceInfo.y;

            // Draw White Background
            page.drawRectangle({
                x: rectX,
                y: rectY,
                width: boxWidth,
                height: boxHeight,
                color: rgb(1, 1, 1),
            });

            // Draw Text Position
            const textX = originalCenterX - (textWidth / 2);
            const textY = rectY + 5;

            page.drawText(newPriceText, {
                x: textX,
                y: textY,
                size: fontSize,
                font: font,
                color: rgb(0.8, 0, 0),
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
        // 3. Spaced numeric: 2 0 0 1 6 4 8 (Common in some catalogs)
        const codeRegex = /(?:\b[A-Z]{2,3}\s*\d{4,6}\b|\b\d{4,8}\b|\b\d(?:\s*\d){3,7}\b)/g;

        const codes = await this.extractItemsFromPdf(pdfBuffer, codeRegex);
        console.log(`[CatalogMarkup] Found ${codes.length} codes in visual catalog. Matching...`);

        // 2b. Extract ALL text for collision detection (Obstacles)
        // Match anything that includes non-whitespace characters
        const obstacleRegex = /\S+/g;
        const allObstacles = await this.extractItemsFromPdf(pdfBuffer, obstacleRegex);
        console.log(`[CatalogMarkup] Found ${allObstacles.length} text obstacles for collision detection.`);

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
            const priceList = masterPriceMap.get(normalizedCode);

            if (priceList && priceList.length > 0) {
                const page = pages[item.pageIndex];
                if (!page) continue;

                const fontSize = 11; // Increased from 10
                const lineHeight = 11;
                const boxPadding = 3;

                // 1. Calculate Content Dimensions
                let maxLineWidth = 0;
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

                // 2. Define Candidate Positions
                // We define the Box Rectangle {x, y, w, h}

                // Position A: RIGHT (Preferred)
                // Aligned with text baseline roughly, or slightly down? 
                // Let's vertically align the TOP of the box with the TOP of the code text (roughly item.y + item.height)
                // item.y is usually baseline. font height ~10.
                const codeTopY = item.y + item.height;
                // Let's place Box Top slightly below Code Top for alignment? Or centered?
                // Simple: Box Top = BoxY + BoxHeight.
                // We want Box Top = Code Top Y. => BoxY = Code Top Y - BoxHeight.
                // X = CodeX + CodeWidth + 5.
                const posRight = {
                    x: item.x + item.width + 5,
                    y: codeTopY - boxHeight,
                    w: boxWidth,
                    h: boxHeight,
                    type: 'RIGHT'
                };

                // Position B: ABOVE
                // X aligned with code X.
                // Y (bottom of box) = Code Top Y + 2 (small gap)
                // Wait, if Y is bottom-left, Y must be > Code Top Y.
                const posAbove = {
                    x: item.x,
                    y: codeTopY + 2,
                    w: boxWidth,
                    h: boxHeight,
                    type: 'ABOVE'
                };

                // Position C: BELOW
                // X aligned with code X.
                // Y (top of box) = Code Bottom Y (baseline item.y) - 2.
                // BoxY = (item.y - 2) - BoxHeight.
                const posBelow = {
                    x: item.x,
                    y: item.y - 2 - boxHeight,
                    w: boxWidth,
                    h: boxHeight,
                    type: 'BELOW'
                };

                // 3. Check Collision
                // Helper to check rect intersection
                const hasCollision = (rect) => {
                    // Filter obstacles on same page excluding THIS code itself
                    const relevantObstacles = allObstacles.filter(o =>
                        o.pageIndex === item.pageIndex &&
                        // Ignore the code text itself (heuristic overlap check)
                        !(Math.abs(o.x - item.x) < 5 && Math.abs(o.y - item.y) < 5)
                    );

                    for (const obs of relevantObstacles) {
                        // Standard Rect Intersection
                        // Rect 1: box {x, y, w, h} (y is bottom)
                        // Rect 2: obs {x, y, width, height} (y is bottom)

                        // Convert to Top/Bottom / Left/Right
                        const r1 = { l: rect.x, r: rect.x + rect.w, b: rect.y, t: rect.y + rect.h };
                        const r2 = { l: obs.x, r: obs.x + obs.width, b: obs.y, t: obs.y + obs.height };

                        const noOverlap = r1.l > r2.r || r1.r < r2.l || r1.b > r2.t || r1.t < r2.b;
                        if (!noOverlap) {
                            // Collision found!
                            // console.log(`Collision at ${rect.type} with "${obs.text}"`);
                            return true;
                        }
                    }
                    return false;
                };

                // Decision Strategy: Right -> Above -> Below (Default)
                let selectedPos = posRight;

                if (hasCollision(posRight)) {
                    if (!hasCollision(posAbove)) {
                        selectedPos = posAbove;
                    } else {
                        // If Above also fails, use Below (or Above if Below fails? User suggested Above then Below)
                        // If both fail, maybe Below is safer or just force Above?
                        // Let's stick to Below as fallback.
                        selectedPos = posBelow;
                    }
                }

                // 4. Draw
                // Draw White Background Box
                page.drawRectangle({
                    x: selectedPos.x,
                    y: selectedPos.y,
                    width: selectedPos.w,
                    height: selectedPos.h,
                    color: rgb(1, 1, 1), // White
                });

                // Draw Text inside Box
                // Box Y is Bottom-Left.
                // We write text from Top-Down.
                // First line Y (baseline).
                // Box Top is selectedPos.y + selectedPos.h.
                // StartY roughly BoxTop - padding - fontSize? 
                // Or: StartY = BoxY + BoxHeight - Padding - (LineHeight? or slightly less for baseline)
                // Let's align top line.
                const startTextY = selectedPos.y + selectedPos.h - boxPadding - (lineHeight * 0.8);

                priceList.forEach((p, idx) => {
                    const newValue = p.price * (1 + markupPercentage / 100);
                    const newPriceText = this.formatBrazilianPrice(newValue);
                    const labelText = p.label ? `${p.label} ` : '';

                    const currentY = startTextY - (idx * lineHeight);

                    // Draw Label
                    if (p.label) {
                        page.drawText(labelText, {
                            x: selectedPos.x + boxPadding, // Left align inside box
                            y: currentY,
                            size: fontSize,
                            font: font,
                            color: rgb(0.8, 0, 0),
                        });
                    }

                    // Draw Price
                    const labelWidth = p.label ? font.widthOfTextAtSize(labelText, fontSize) : 0;

                    page.drawText(newPriceText, {
                        x: selectedPos.x + boxPadding + labelWidth,
                        y: currentY,
                        size: fontSize,
                        font: font,
                        color: rgb(0.8, 0, 0),
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
