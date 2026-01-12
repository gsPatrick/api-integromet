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
        Analise o texto abaixo extraído de uma página de PDF e extraia os produtos em JSON.

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

        REGRAS CRÍTICAS:
        1. Identifique Códigos de Produto (Geralmente 4 a 8 dígitos, ex: 2001424, 2001527).
        2. Identifique PREÇOS (R$ XX,XX).
        3. Identifique VARIAÇÕES DE TAMANHO (Labels).
           - Muitas vezes os tamanhos aparecem como CABEÇALHOS acima dos produtos (Ex: "1 a 3   4 a 8" ou "0A3M a 3A6M").
           - Se houver uma linha de tamanhos, aplique-a aos produtos listados abaixo dela até que apareça outro cabeçalho.
           - Se o produto tiver múltiplos preços na mesma linha ou linhas próximas, associe cada preço ao seu tamanho correspondente do cabeçalho.
        4. Converta valores para number (float).
        5. Retorne APENAS o JSON válido, sem markdown.

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
}

module.exports = new PdfParserAIService();
