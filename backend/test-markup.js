/**
 * Standalone test script for PDF Markup Service - V2
 * Improved: Properly calculates price position within text items
 * Run with: node test-markup.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const inputPdfPath = path.join(__dirname, 'Catálogo Up Baby_INVERNO 2026 (1).pdf');
const outputDir = path.join(__dirname, 'public/uploads/catalogs/markup');
const markupPercentage = 10;

// Price utilities
function parseBrazilianPrice(priceStr) {
    let cleaned = priceStr.replace(/R\$\s?/g, '').trim();
    cleaned = cleaned.replace(/\./g, '');
    cleaned = cleaned.replace(',', '.');
    return parseFloat(cleaned);
}

function formatBrazilianPrice(value) {
    return 'R$ ' + value.toFixed(2).replace('.', ',');
}

async function extractPricesWithPdfjs(pdfBuffer, maxPages = 50) {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

    const prices = [];
    const priceRegex = /R\$\s?[\d.,]+/g;

    const uint8Array = new Uint8Array(pdfBuffer);
    const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
    const pdfDoc = await loadingTask.promise;

    const totalPages = Math.min(pdfDoc.numPages, maxPages);
    console.log(`   Processing ${totalPages} of ${pdfDoc.numPages} pages...`);

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.0 });
        const textContent = await page.getTextContent();

        for (const item of textContent.items) {
            const text = item.str;

            // Find price matches with their index in the string
            let match;
            const regex = /R\$\s?[\d.,]+/g;
            while ((match = regex.exec(text)) !== null) {
                const priceText = match[0];
                const matchIndex = match.index;
                const value = parseBrazilianPrice(priceText);

                if (!isNaN(value) && value > 0) {
                    // Calculate the position of the price within the text item
                    // The transform gives us the start of the entire text
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

        if (pageNum % 10 === 0 || pageNum === totalPages) {
            console.log(`   ✓ Page ${pageNum}/${totalPages}`);
        }
    }

    return { prices, totalPages, pdfNumPages: pdfDoc.numPages };
}

async function generateMarkupPdf(pdfPath, markup) {
    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');

    console.log(`\n📄 Processing PDF: ${path.basename(pdfPath)}`);
    console.log(`📈 Markup: ${markup}%\n`);

    const pdfBuffer = fs.readFileSync(pdfPath);
    console.log(`✅ Loaded PDF (${(pdfBuffer.length / 1024 / 1024).toFixed(2)} MB)`);

    console.log('🔍 Extracting prices with coordinates...');

    let result;
    try {
        result = await extractPricesWithPdfjs(pdfBuffer);
    } catch (err) {
        console.error(`❌ Error extracting: ${err.message}`);
        console.error(err.stack);
        return null;
    }

    const { prices, totalPages, pdfNumPages } = result;
    console.log(`\n✅ Found ${prices.length} prices in ${totalPages} pages (total: ${pdfNumPages})\n`);

    if (prices.length === 0) {
        console.log('⚠️  No prices found!');
        return null;
    }

    // Show sample prices with context
    console.log('📋 Sample prices found (first 10):');
    const uniquePrices = [...new Map(prices.map(p => [p.originalText + p.pageIndex, p])).values()];
    uniquePrices.slice(0, 10).forEach((p, i) => {
        const newValue = p.value * (1 + markup / 100);
        console.log(`   ${i + 1}. "${p.fullText}" → price: ${p.originalText} → ${formatBrazilianPrice(newValue)}`);
        console.log(`      X: ${p.x.toFixed(1)}, Width: ${p.width.toFixed(1)}, Height: ${p.height.toFixed(1)}`);
    });
    console.log('');

    // Edit PDF
    console.log('✏️  Editing PDF with new prices...');
    const pdfDocEdit = await PDFDocument.load(new Uint8Array(pdfBuffer));
    const pages = pdfDocEdit.getPages();
    const font = await pdfDocEdit.embedFont(StandardFonts.HelveticaBold);

    let successCount = 0;

    for (const priceInfo of prices) {
        const page = pages[priceInfo.pageIndex];
        if (!page) continue;

        const newValue = priceInfo.value * (1 + markup / 100);
        const newPriceText = formatBrazilianPrice(newValue);

        // Calculate proper font size based on item height
        // Most catalog prices use around 8-12pt fonts
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

            // Draw new price in red at the same position
            page.drawText(newPriceText, {
                x: priceInfo.x,
                y: priceInfo.y,
                size: fontSize,
                font: font,
                color: rgb(0.8, 0, 0),
            });

            successCount++;
        } catch (err) {
            console.log(`   ⚠️ Error on price ${priceInfo.originalText}: ${err.message}`);
        }
    }

    console.log(`✅ Updated ${successCount}/${prices.length} prices\n`);

    // Save
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const pdfBytes = await pdfDocEdit.save();
    const originalName = path.basename(pdfPath, '.pdf');
    const outputFilename = `${originalName}_markup_${markup}pct_v2_${Date.now()}.pdf`;
    const outputPath = path.join(outputDir, outputFilename);

    fs.writeFileSync(outputPath, pdfBytes);

    console.log('✅ PDF saved!');
    console.log(`📁 Output: ${outputPath}`);
    console.log(`📊 Size: ${(pdfBytes.length / 1024 / 1024).toFixed(2)} MB\n`);

    return {
        outputPath,
        pricesUpdated: successCount,
        pricesFound: prices.length
    };
}

// Run test
async function main() {
    console.log('═══════════════════════════════════════════');
    console.log('  PDF Markup Test Script V2');
    console.log('═══════════════════════════════════════════');

    if (!fs.existsSync(inputPdfPath)) {
        console.error(`❌ PDF not found: ${inputPdfPath}`);
        process.exit(1);
    }

    try {
        const result = await generateMarkupPdf(inputPdfPath, markupPercentage);

        if (result) {
            console.log('═══════════════════════════════════════════');
            console.log('  ✅ TEST PASSED!');
            console.log('═══════════════════════════════════════════');
            console.log(`Prices found: ${result.pricesFound}`);
            console.log(`Prices updated: ${result.pricesUpdated}`);
            console.log(`\nOpen the output PDF to verify.`);
        } else {
            console.log('═══════════════════════════════════════════');
            console.log('  ⚠️  TEST INCOMPLETE');
            console.log('═══════════════════════════════════════════');
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

main();
