const OpenAI = require('openai');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class PdfParserAIService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        if (process.platform === 'darwin' && !process.env.PATH.includes('/opt/homebrew/bin')) {
            console.log('[PdfParserAI] Adding /opt/homebrew/bin to PATH for GraphicsMagick');
            process.env.PATH = `/opt/homebrew/bin:${process.env.PATH}`;
        }
    }

    async parsePricePdf(pdfBuffer) {
        console.log('[PdfParserAI] Extracting text from PDF (Legacy Text Mode)...');

        let productsMap = new Map();

        try {
            const textPages = await this.extractTextPages(pdfBuffer);
            let allProducts = [];

            for (let i = 0; i < textPages.length; i++) {
                // If page text is too short, it's likely an image. Skip text analysis for that page?
                // Or just try.
                const pageText = textPages[i];
                if (pageText.length > 50) {
                    try {
                        const products = await this.analyzeTextCheck(pageText);
                        if (Array.isArray(products)) {
                            allProducts.push(...products);
                        }
                    } catch (error) {
                        // console.error(`[PdfParserAI] Error parsing page ${i + 1}:`, error.message);
                    }
                }
            }
            productsMap = this.convertToMap(allProducts);
        } catch (e) {
            console.warn('[PdfParserAI] Text extraction failed:', e.message);
        }

        // FALLBACK: If text extraction failed (few or no products), use Vision (Gemini)
        if (productsMap.size < 5) {
            console.log(`[PdfParserAI] Few products found (${productsMap.size}). Switching to Gemini Vision Extraction...`);

            // We need a temporary file path for the buffer to pass to Python script
            const tempPdfPath = require('path').join('/tmp', `temp_extract_${Date.now()}.pdf`);
            require('fs').writeFileSync(tempPdfPath, pdfBuffer);

            try {
                const visionProducts = await this.extractProductsFromPdfVision(tempPdfPath);

                // Merge vision products
                visionProducts.forEach((value, key) => {
                    productsMap.set(key, value);
                });

                console.log(`[PdfParserAI] Gemini Vision found ${visionProducts.size} products.`);

            } catch (visionErr) {
                console.error('[PdfParserAI] Vision extraction failed:', visionErr);
            } finally {
                if (require('fs').existsSync(tempPdfPath)) require('fs').unlinkSync(tempPdfPath);
            }
        }

        return productsMap;
    }

    /**
     * Calls gemini_extract.py to get JSON data from PDF images
     */
    async extractProductsFromPdfVision(pdfPath) {
        console.log('[PdfParserAI] Running OpenAI GPT-4o Extraction (Smart Chunking)...');

        const { PDFDocument } = require('pdf-lib');
        const fsPromises = require('fs').promises;
        const OpenAI = require('openai');

        // Helper: Split PDF
        async function splitPDFByPages(fullPath, pagesPerChunk = 50) {
            const existingPdfBytes = await fsPromises.readFile(fullPath);
            const pdfDoc = await PDFDocument.load(existingPdfBytes);
            const totalPages = pdfDoc.getPageCount();

            const chunks = [];
            for (let i = 0; i < totalPages; i += pagesPerChunk) {
                const newPdf = await PDFDocument.create();
                const end = Math.min(i + pagesPerChunk, totalPages);

                const pageIndices = Array.from({ length: end - i }, (_, idx) => i + idx);
                const pages = await newPdf.copyPages(pdfDoc, pageIndices);
                pages.forEach(page => newPdf.addPage(page));

                const pdfBytes = await newPdf.save();
                chunks.push({
                    buffer: Buffer.from(pdfBytes),
                    startPage: i + 1,
                    endPage: end
                });
            }
            return chunks;
        }

        try {
            const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
            if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY Not Found");

            const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

            // Check file size to decide strategy
            const fileStats = await fsPromises.stat(pdfPath);
            const fileSizeMB = fileStats.size / (1024 * 1024);
            const existingPdfBytes = await fsPromises.readFile(pdfPath);
            const pdfDoc = await PDFDocument.load(existingPdfBytes);
            const totalPages = pdfDoc.getPageCount();

            let mergedResults = [];

            // FAST PATH
            if (totalPages <= 100 && fileSizeMB <= 32) {
                console.log("[PdfParserAI] Fast Path: Sending entire PDF to GPT-4o.");
                const base64PDF = existingPdfBytes.toString('base64');
                const fileData = `data:application/pdf;base64,${base64PDF}`;

                const response = await openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [{
                        role: "user",
                        content: [
                            { type: "file", file: { filename: "pricelist.pdf", file_data: fileData } },
                            {
                                type: "text", text: `
                                VOCÊ É UM EXTRATOR DE TABELAS DE PREÇO DE MODA.
                                Extraia TODOS os produtos.
                                
                                IMPORTANTE: VARIAÇÃO DE TAMANHO
                                - Se um código tiver preços diferentes por tamanho, retorne múltiplos itens.
                                - Exemplo: "Ref 123 P/M/G 10,00 GG 12,00" -> 
                                  [{"code": "123", "price": 10, "label": "P/M/G"}, {"code": "123", "price": 12, "label": "GG"}]
                                
                                SAÍDA ESPERADA (JSON Array):
                                [{"code": "...", "price": 0.00, "label": "..."}]
                                
                                REGRAS:
                                1. "label" é opcional (use se houver tamanhos específicos).
                                2. Ignore cabeçalhos repetidos.
                                3. Retorne APENAS JSON.
                            ` }
                        ]
                    }],
                    max_tokens: 16000
                });

                const content = response.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '');
                mergedResults = JSON.parse(content);

            } else {
                console.log("[PdfParserAI] Chunking PDF for GPT-4o...");
                const chunks = await splitPDFByPages(pdfPath, 50);

                for (const chunk of chunks) {
                    try {
                        console.log(`[PdfParserAI] Processing pages ${chunk.startPage}-${chunk.endPage}`);
                        const base64PDF = chunk.buffer.toString('base64');
                        const fileData = `data:application/pdf;base64,${base64PDF}`;

                        const response = await openai.chat.completions.create({
                            model: "gpt-4o",
                            messages: [{
                                role: "user",
                                content: [
                                    { type: "file", file: { filename: "chunk.pdf", file_data: fileData } },
                                    {
                                        type: "text", text: `
                                        Extraia tabela de preços.
                                        Se houver tamanhos com preços diferentes, separe.
                                        JSON Array: [{"code": "...", "price": 0.00, "label": "..."}]
                                    ` }
                                ]
                            }],
                            max_tokens: 16000
                        });
                        const content = response.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '');
                        const items = JSON.parse(content);
                        mergedResults.push(...items);

                    } catch (e) {
                        console.error(`[PdfParserAI] Chunk Error: ${e.message}`);
                    }
                }
            }

            // Aggregation Map (Fixing Overwrite Issue)
            const map = new Map();
            mergedResults.forEach(p => {
                if (p.code && p.price) {
                    const code = String(p.code).trim().toUpperCase();
                    // Clean price
                    let priceVal = p.price;
                    if (typeof priceVal === 'string') {
                        priceVal = parseFloat(priceVal.replace(',', '.').replace(/[^\d.]/g, ''));
                    }

                    const newItem = {
                        price: priceVal,
                        label: p.label || 'GPT' // Default label if missing
                    };

                    if (map.has(code)) {
                        // Avoid exact duplicates (same price, same label)
                        const existing = map.get(code);
                        const isDuplicate = existing.some(e => e.price === newItem.price && e.label === newItem.label);
                        if (!isDuplicate) {
                            existing.push(newItem);
                        }
                    } else {
                        map.set(code, [newItem]);
                    }
                }
            });

            return map;

        } catch (error) {
            console.error('[PdfParserAI] GPT-4o Failed:', error);
            throw error; // Re-throw to handle upstream
        }
    }

    /**
     * Executes the Gemini Python script to generate a markup PDF
     * @param {string} inputPdfPath - Path to source PDF
     * @param {string} outputPdfPath - Path where output should be saved
     * @param {number} markupPct - Markup percentage (e.g. 40.0)
     * @returns {Promise<string>} - Path to the generated file
     */
    async executeGeminiMarkup(inputPdfPath, outputPdfPath, markupPct) {
        console.log(`[PdfParserAI] Launching Gemini Python Script...`);
        console.log(`Input: ${inputPdfPath}`);
        console.log(`Output: ${outputPdfPath}`);
        console.log(`Markup: ${markupPct}%`);

        // Path to python script
        const scriptPath = require('path').join(__dirname, '../../python-ocr-service/ocr_service.py');

        // Command: python3 script.py input output markup
        const command = `python3 "${scriptPath}" "${inputPdfPath}" "${outputPdfPath}" ${markupPct}`;

        try {
            const { stdout, stderr } = await execPromise(command);
            console.log('[PdfParserAI] Python Output:', stdout);

            if (stderr) {
                console.warn('[PdfParserAI] Python Stderr:', stderr);
            }

            const fs = require('fs');
            if (fs.existsSync(outputPdfPath)) {
                return outputPdfPath;
            } else {
                throw new Error('Python script finished but output file was not created');
            }
        } catch (error) {
            console.error('[PdfParserAI] Python execution failed:', error);
            throw error;
        }
    }
}

module.exports = new PdfParserAIService();
