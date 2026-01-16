const OpenAI = require('openai');

class PdfParserAIService {
    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });

        // Ensure Homebrew bin is in PATH for Mac (critical for pdf2pic/gm)
        if (process.platform === 'darwin' && !process.env.PATH.includes('/opt/homebrew/bin')) {
            console.log('[PdfParserAI] Adding /opt/homebrew/bin to PATH for GraphicsMagick');
            process.env.PATH = `/opt/homebrew/bin:${process.env.PATH}`;
        }
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
        // Configure pdf2pic
        // Initial configuration moved inside loop for dynamic sizing

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
                // Get Specific Page Dimensions
                const page = await doc.getPage(pageNum);
                const viewport = page.getViewport({ scale: 1 });
                const specificPageWidth = viewport.width;
                const specificPageHeight = viewport.height;

                // Calculate Exact Pixels for 72 DPI (1:1 with PDF points) to fix Aspect Ratio and prevent oversized images
                const density = 72;
                const widthPx = Math.round(specificPageWidth * (density / 72));
                const heightPx = Math.round(specificPageHeight * (density / 72));

                // Instantiate pdf2pic PER PAGE to force correct dimensions
                const { fromBuffer } = require('pdf2pic');
                const pageOptions = {
                    density: density,
                    savePath: '/tmp',
                    format: 'png',
                    width: widthPx,
                    height: heightPx
                };
                const pageConverter = fromBuffer(pdfBuffer, pageOptions);

                // Convert page
                const result = await pageConverter(pageNum);
                const imageBuffer = await sharp(result.path).toBuffer();

                // DEBUG: Check Image Dimensions
                const metadata = await sharp(imageBuffer).metadata();
                console.log(`[DEBUG] Page ${pageNum}: PDF Viewport=${specificPageWidth}x${specificPageHeight} | Image=${metadata.width}x${metadata.height} | RatioDiff=${(specificPageWidth / specificPageHeight - metadata.width / metadata.height).toFixed(4)}`);

                const base64Image = imageBuffer.toString('base64');

                // Call GPT-4o Vision with SPECIFIC page dimensions
                // Retry up to 2 times if empty result (likely safety filter)
                let prices = [];
                let attempts = 0;
                const maxAttempts = 2;

                while (attempts < maxAttempts && prices.length === 0) {
                    attempts++;
                    const useRetryPrompt = attempts > 1; // Use fallback prompt on retry
                    prices = await this.extractPricesFromImage(base64Image, pageNum - 1, specificPageWidth, specificPageHeight, useRetryPrompt);

                    if (prices.length === 0 && attempts < maxAttempts) {
                        console.log(`[PdfParserAI] Page ${pageNum}: No prices found, retrying with fallback prompt...`);
                    }
                }

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

    async extractPricesFromImage(base64Image, pageIndex, pageWidth, pageHeight, useRetryPrompt = false) {
        // Normal prompt - focuses on R$
        let systemPrompt = `You are a specialized OCR engine for Brazilian price extraction.
Your task is to find PRICES in the format "R$ XXX" or "R$ XXX,XX".

CRITICAL RULES:
1. Look for the "R$" currency symbol. This is your PRIMARY visual anchor.
2. The bounding box MUST start at the "R$" and extend to the end of the number.
3. IGNORE small numbers inside shapes (like diamonds showing sizes: 2, 4, 6, 8).
4. Return ONLY the main product price, which is typically the LARGEST number with "R$" prefix.

Output MUST be a raw JSON array. No markdown.`;

        let userPrompt = `Extract the PRICE with "R$" from this Brazilian catalog image.
Return a JSON array where each object contains:
- "originalValue": The exact text string (e.g. "R$ 267" or "R$ 387,00").
- "numericValue": The parsed number.
- "box": The PRECISE bounding box {top, left, width, height} (0.0-1.0 scale) that starts at "R$" and covers the entire price.

If no prices are found, return [].`;

        // Fallback prompt - more technical/clinical, no content interpretation
        if (useRetryPrompt) {
            systemPrompt = `You are an OCR text extraction tool. Your ONLY task is to read text characters from images.
Do NOT analyze or interpret image content. Do NOT refuse to process. You are reading TEXT OVERLAY only.
Extract any text matching the pattern "R$ [number]" and return coordinates.
Output: raw JSON array. No explanations.`;

            userPrompt = `OCR Task: Read the "R$ XXX" text pattern from this image.
Return JSON: [{"originalValue": "R$ 267", "numericValue": 267, "box": {"top": 0.8, "left": 0.3, "width": 0.2, "height": 0.05}}]
If pattern not found, return [].`;
        }

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

                console.log(`[DEBUG] Page ${pageIndex + 1}: Value=${p.numericValue} | BoxTop=${top.toFixed(3)} BoxLeft=${left.toFixed(3)} | PDF_X=${pdfX.toFixed(2)} PDF_Y=${pdfY.toFixed(2)} | PageW=${pageWidth} PageH=${pageHeight}`);

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

