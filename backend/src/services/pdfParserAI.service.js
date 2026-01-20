const OpenAI = require('openai');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class PdfParserAIService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    async parsePricePdf(pdfBuffer) {
        console.log('[PdfParserAI] Parsing Price List PDF using GPT-4o...');

        try {
            // Use GPT-4o Vision/Extraction logic directly
            const productsMap = await this.extractProductsOpenAI(pdfBuffer);
            console.log(`[PdfParserAI] GPT-4o extracted ${productsMap.size} unique codes.`);
            return productsMap;
        } catch (e) {
            console.error('[PdfParserAI] Extraction failed:', e.message);
            return new Map();
        }
    }

    async extractProductsOpenAI(pdfBuffer) {
        const { PDFDocument } = require('pdf-lib');

        // Helper: Split PDF if needed
        const pdfDoc = await PDFDocument.load(pdfBuffer);
        const totalPages = pdfDoc.getPageCount();
        const fileSizeMB = pdfBuffer.length / (1024 * 1024);

        console.log(`[PdfParserAI] PDF Stats: ${totalPages} pages, ${fileSizeMB.toFixed(2)} MB`);

        let mergedResults = [];

        // Helper: Process Chunk
        const processChunk = async (buffer, chunkLabel) => {
            const base64PDF = buffer.toString('base64');
            const fileData = `data:application/pdf;base64,${base64PDF}`;

            console.log(`[PdfParserAI] Sending ${chunkLabel} to GPT-4o...`);

            try {
                const response = await this.openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [{
                        role: "user",
                        content: [
                            {
                                type: "file",
                                file: {
                                    filename: "price_list.pdf",
                                    file_data: fileData
                                }
                            },
                            {
                                type: "text",
                                text: `
                                    EXTRACT PRICE LIST.
                                    Return ONLY valid JSON array:
                                    [{"code": "...", "price": 10.50}]
                                    
                                    RULES:
                                    1. Extract 'code' (reference/ref) and 'price'.
                                    2. If multiple sizes/prices exist for a code, return list or just base price.
                                    3. Ignore currency symbols (R$). 
                                    4. Output JSON ONLY. No markdown.
                                `
                            }
                        ]
                    }],
                    max_tokens: 16000
                });

                let content = response.choices[0].message.content;
                content = content.replace(/```json/g, '').replace(/```/g, '');
                return JSON.parse(content);
            } catch (err) {
                console.error(`[PdfParserAI] Chunk Error (${chunkLabel}):`, err.message);
                return [];
            }
        };

        if (totalPages <= 100 && fileSizeMB <= 32) {
            // Fast Path
            mergedResults = await processChunk(pdfBuffer, `All Pages`);
        } else {
            // Chunk Path (50 pages)
            const pagesPerChunk = 50;
            for (let i = 0; i < totalPages; i += pagesPerChunk) {
                const newPdf = await PDFDocument.create();
                const end = Math.min(i + pagesPerChunk, totalPages);
                const pageIndices = Array.from({ length: end - i }, (_, idx) => i + idx);
                const pages = await newPdf.copyPages(pdfDoc, pageIndices);
                pages.forEach(page => newPdf.addPage(page));
                const chunkBytes = await newPdf.save();

                const chunkProducts = await processChunk(Buffer.from(chunkBytes), `Pages ${i + 1}-${end}`);
                mergedResults.push(...chunkProducts);
            }
        }

        // Convert List to Map format expected by Controller
        // Map format: "123" -> [{price: 10.0, label: ""}]
        const map = new Map();
        if (Array.isArray(mergedResults)) {
            mergedResults.forEach(p => {
                if ((p.code || p.codigo) && (p.price || p.preco)) {
                    const rawCode = p.code || p.codigo;
                    const rawPrice = p.price || p.preco;

                    const code = String(rawCode).trim().toUpperCase();

                    // Clean price
                    let priceVal = rawPrice;
                    if (typeof priceVal === 'string') {
                        // Handle R$ 1.200,50 -> 1200.50
                        // Or 1,200.50 -> 1200.50
                        // Heuristic: swap comma to dot if applicable?
                        // Simple approach: remove non-digit, non-comma, non-dot. 
                        // If comma is last separator, it's decimal.
                        let cleanStr = priceVal.replace(/[^\d.,]/g, '');
                        if (cleanStr.includes(',') && !cleanStr.includes('.')) {
                            cleanStr = cleanStr.replace(',', '.');
                        } else if (cleanStr.includes(',') && cleanStr.includes('.')) {
                            // 1.000,00 -> remove dot, replace comma
                            cleanStr = cleanStr.replace(/\./g, '').replace(',', '.');
                        }
                        priceVal = parseFloat(cleanStr);
                    }

                    if (!isNaN(priceVal)) {
                        map.set(code, [{
                            price: priceVal,
                            label: 'GPT'
                        }]);
                    }
                }
            });
        }
        return map;
    }

    // Legacy/Stub method for generating markup manually via Python (Deprecated/Removed)
    async executeGeminiMarkup(inputPdfPath, outputPdfPath, markupPct) {
        throw new Error("Python/Gemini Markup is deprecated. Use Node.js PDF Markup.");
    }
}

module.exports = new PdfParserAIService();
