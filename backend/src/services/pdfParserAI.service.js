const OpenAI = require('openai');

class PdfParserAIService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    async parsePricePdf(pdfBuffer) {
        console.log('[PdfParserAI] Extracting text from PDF...');
        const textPages = await this.extractTextPages(pdfBuffer);

        // Merge text to send context (or chunk if too big)
        // Tables usually span pages but items don't split much.
        // Let's process page by page or groups to keep context of Headers?
        // Headers might be on Page 1 and apply to Page 2? Unlikely for sizes.

        let allProducts = [];

        // LIMIT: To avoid huge costs during dev, maybe limit pages?
        // But for prod, we need all.
        // GPT-4o-mini is cheap.

        for (let i = 0; i < textPages.length; i++) {
            console.log(`[PdfParserAI] Analyzing Page ${i + 1}/${textPages.length} with AI...`);
            const pageText = textPages[i];

            try {
                const products = await this.analyzeTextCheck(pageText);
                allProducts.push(...products);
            } catch (error) {
                console.error(`[PdfParserAI] Error parsing page ${i + 1}:`, error.message);
            }
        }

        return this.convertToMap(allProducts);
    }

    async extractTextPages(pdfBuffer) {
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const uint8Array = new Uint8Array(pdfBuffer);
        const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
        const doc = await loadingTask.promise;
        const pages = [];

        for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i);
            const content = await page.getTextContent();

            // Reconstruct lines based on Y
            const lines = {};
            content.items.forEach(item => {
                const y = Math.round(item.transform[5]);
                if (!lines[y]) lines[y] = [];
                lines[y].push(item.str);
            });

            // Sort Top-Down
            const sortedYs = Object.keys(lines).map(Number).sort((a, b) => b - a);
            const pageStr = sortedYs.map(y => lines[y].join('   ')).join('\n');
            pages.push(pageStr);
        }
        return pages;
    }

    async analyzeTextCheck(text) {
        const prompt = `
        Você é um especialista em extração de dados de tabelas de preços desestruturadas.
        Analise o texto abaixo extraído de uma página de PDF e extraia TODOS os produtos em JSON.

        ESTRUTURA DA RESPOSTA (Array de objetos):
        [
          {
            "code": "2001424",
            "name": "Macacão...",
            "prices": [
               { "label": "1 a 3", "value": 102.95 },
               { "label": "4 a 8", "value": 102.95 }
            ]
          }
        ]

        REGRAS CRÍTICAS DE EXTRAÇÃO:
        1. **Varredura Completa**: O texto pode estar em colunas (produtos lado a lado). Analise TODO o texto. Não pare no primeiro item.
        2. **Identificação de Códigos**: 
           - Procure por códigos numéricos (ex: 2001424) OU alfanuméricos curtos (ex: LVT 6011, LBL 6016) se seguidos por preço.
           - Geralmente de 4 a 8 caracteres.
        3. **Preços e Tamanhos**:
           - Associe cada preço ao seu tamanho/grade (Ex: "1 a 3   4 a 8").
           - Se os tamanhos estiverem em uma linha separada acima, aplique-os a todos os produtos abaixo até o próximo cabeçalho.
        4. **Validação (Passo Final)**:
           - Antes de gerar a resposta, REVISE o texto original.
           - Verifique se você não esqueceu nenhum código que tenha um preço próximo (R$).
           - Se houver dois produtos na mesma linha horizontal, extraia AMBOS.
        5. **Formato**:
           - Converta valores R$ para float (ponto).
           - JSON puro, sem markdown.

        TEXTO DO PDF:
        ${text}
        `;

        const response = await this.openai.chat.completions.create({
            model: "gpt-4o-mini", // Fast and capable
            messages: [
                { role: "system", content: "You are a data extraction assistant. Output JSON only." },
                { role: "user", content: prompt }
            ],
            temperature: 0.1
        });

        const content = response.choices[0].message.content;
        // Clean markdown blocks
        const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanContent);
    }

    convertToMap(products) {
        const map = new Map();
        products.forEach(p => {
            // Validate
            if (p.code && p.prices && Array.isArray(p.prices)) {
                // Clean Code
                const cleanCode = String(p.code).trim();

                // Normalize Prices
                const validPrices = p.prices.map(pr => ({
                    price: Number(pr.value),
                    label: pr.label || ''
                })).filter(pr => !isNaN(pr.price) && pr.price > 0);

                if (validPrices.length > 0) {
                    map.set(cleanCode, validPrices);
                }
            }
        });
        return map;
    }

    /**
     * Extract prices directly from PDF images using GPT-4o Vision
     * Returns array of { value: number, x: number, y: number, width: number, pageIndex: number }
     */
    async extractPricesFromImagePdf(pdfBuffer, pageWidth, pageHeight) {
        console.log('[PdfParserAI] Using GPT-4o Vision for image-based PDF...');

        const sharp = require('sharp');
        const { fromBuffer } = require('pdf2pic');

        // Configure pdf2pic
        const options = {
            density: 150, // DPI - higher = better quality but more tokens
            savePath: '/tmp',
            format: 'png',
            width: 1200,
            height: 1700
        };

        const converter = fromBuffer(pdfBuffer, options);

        // Get page count
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const uint8Array = new Uint8Array(pdfBuffer);
        const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
        const doc = await loadingTask.promise;
        const totalPages = doc.numPages;

        let allPrices = [];

        // Process pages (limit to avoid huge API costs)
        // Increased from 10 to 50 to handle full catalogs
        const maxPages = Math.min(totalPages, 50);

        for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
            console.log(`[PdfParserAI] Analyzing page ${pageNum}/${totalPages} with Vision...`);

            try {
                // Convert page to image
                const result = await converter(pageNum);
                const imageBuffer = await sharp(result.path).toBuffer();
                const base64Image = imageBuffer.toString('base64');

                // Call GPT-4o Vision
                const prices = await this.extractPricesFromImage(base64Image, pageNum - 1, pageWidth, pageHeight);
                allPrices.push(...prices);

                // Clean up temp file
                const fs = require('fs');
                if (fs.existsSync(result.path)) fs.unlinkSync(result.path);

            } catch (error) {
                console.error(`[PdfParserAI] Vision error on page ${pageNum}:`, error.message);
            }
        }

        console.log(`[PdfParserAI] Vision extracted ${allPrices.length} prices total`);
        return allPrices;
    }

    async extractPricesFromImage(base64Image, pageIndex, pageWidth, pageHeight) {
        const systemPrompt = `You are a specialized OCR engine for structured data extraction.
Your ONLY function is to identify and transcribe numerical price values from images.
IGNORE all background images, people, watermarks, or artistic elements.
Do not interpret the image context. Focus 100% on the text overlay.

Output MUST be a raw JSON array. No markdown, no explanations.`;

        const userPrompt = `Extract all price values (e.g. "R$ 341,60", "387", "45,90") from this image.
Return a JSON array where each object contains:
- "originalValue": The exact text string.
- "numericValue": The parsed number.
- "box": The strict bounding box {top, left, width, height} (0.0-1.0 scale) covering the price text.

If no prices are found, return [].`;

        const response = await this.openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: userPrompt },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/png;base64,${base64Image}`,
                                detail: "high"
                            }
                        }
                    ]
                }
            ],
            max_tokens: 2000,
            temperature: 0.1
        });

        const content = response.choices[0].message.content;
        const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            const parsed = JSON.parse(cleanContent);

            // Convert relative positions to absolute PDF coordinates
            return parsed.map(p => {
                const box = p.box || {};

                // Fallback or use explicitly returned box
                const top = box.top !== undefined ? box.top : (p.approximateY || 0);
                const left = box.left !== undefined ? box.left : (p.approximateX || 0);
                const widthPct = box.width || 0.15; // Generous default
                const heightPct = box.height || 0.03;

                const w = widthPct * pageWidth;
                const h = heightPct * pageHeight;

                // Vision Top Y = top
                // PDF Y (bottom-left origin) = pageHeight - (Vision Top + Height)
                // Actually: Top of box in PDF Y = pageHeight - (Vision Top). 
                // But PDF drawText/drawRectangle usually takes Bottom-Left corner (X, Y).
                // So we need: Y = pageHeight - (Vision Top + Vision Height)

                const visionBottom = top + heightPct;
                const pdfY = pageHeight - (visionBottom * pageHeight);
                const pdfX = left * pageWidth;

                return {
                    text: p.originalValue,
                    value: p.numericValue,
                    x: pdfX,
                    y: pdfY,
                    width: w,
                    height: h,
                    pageIndex: pageIndex
                };
            });
        } catch (e) {
            console.error('[PdfParserAI] Failed to parse Vision response:', e.message);
            return [];
        }
    }
}

module.exports = new PdfParserAIService();

