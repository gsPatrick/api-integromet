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
        console.log('[PdfParserAI] Extracting text from PDF...');
        const textPages = await this.extractTextPages(pdfBuffer);
        let allProducts = [];

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
            const lines = {};
            content.items.forEach(item => {
                const y = Math.round(item.transform[5]);
                if (!lines[y]) lines[y] = [];
                lines[y].push(item.str);
            });
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
        TEXTO DO PDF: ${text}
        `;
        const response = await this.openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a data extraction assistant. Output JSON only." },
                { role: "user", content: prompt }
            ],
            temperature: 0.1
        });
        const content = response.choices[0].message.content;
        const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanContent);
    }

    convertToMap(products) {
        const map = new Map();
        products.forEach(p => {
            if (p.code && p.prices && Array.isArray(p.prices)) {
                const cleanCode = String(p.code).trim();
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

    async extractPricesFromImagePdf(pdfBuffer, pageWidth, pageHeight) {
        console.log('[PdfParserAI] Using Smart Hybrid OCR (Tesseract + GPT Context + Fallback)...');

        const Tesseract = require('tesseract.js');
        const sharp = require('sharp');
        const fs = require('fs');
        const { fromBuffer } = require('pdf2pic');

        // Tesseract Setup (The Eyes)
        const worker = await Tesseract.createWorker('por', 1, { logger: () => { } });
        await worker.setParameters({
            tessedit_create_hocr: '0',
            tessedit_create_tsv: '0',
            tessedit_create_wordstrbox: '0'
        });

        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const uint8Array = new Uint8Array(pdfBuffer);
        const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
        const doc = await loadingTask.promise;
        const totalPages = doc.numPages;

        let allPrices = [];

        // DEBUG: restrict to pages 9-16 for faster verification
        for (let pageNum = 9; pageNum <= 16; pageNum++) {
            console.log(`[PdfParserAI] Analyzing page ${pageNum}/${totalPages}...`);

            try {
                const page = await doc.getPage(pageNum);
                const viewport = page.getViewport({ scale: 1 });
                const density = 300; // Ultra High density for precision
                const scale = density / 72;
                const widthPx = Math.round(viewport.width * scale);
                const heightPx = Math.round(viewport.height * scale);

                const pageConverter = fromBuffer(pdfBuffer, {
                    density: density,
                    savePath: '/tmp',
                    format: 'png',
                    width: widthPx,
                    height: heightPx
                });

                const result = await pageConverter(pageNum);

                // 1. Tesseract Pass (Precision Logic)
                const procPath = result.path.replace('.png', '_proc.png');
                await sharp(result.path).grayscale().normalize().sharpen().toFile(procPath);

                const ret = await worker.recognize(procPath, {}, { text: true, blocks: true });
                const blocks = ret.data.blocks;

                let wordList = [];
                if (blocks) {
                    for (const block of blocks) {
                        for (const para of block.paragraphs) {
                            for (const line of para.lines) {
                                for (const word of line.words) {
                                    if (word.text && word.text.trim().length > 0) {
                                        wordList.push({
                                            text: word.text.trim(),
                                            bbox: word.bbox // {x0, y0, x1, y1}
                                        });
                                    }
                                }
                            }
                        }
                    }
                }

                // 2. GPT Pass (Context + Coordinates)
                const gptImgPath = result.path.replace('.png', '_gpt.jpg');
                await sharp(result.path).resize({ width: 1000 }).jpeg({ quality: 85 }).toFile(gptImgPath);
                const base64Image = fs.readFileSync(gptImgPath, { encoding: 'base64' });

                const prompt = `
                I am providing an image of a catalog page.
                Your task is to identify ALL product prices in the image.
                
                Rules:
                1. Identify the price strings visually (e.g. "42,90", "60,00").
                2. Return the value AND the 1000x1000 bounding box.
                3. Ignore reference numbers or sizes.
                4. Output a STRICT JSON array:
                   [ { "value": "42,90", "box_2d": [ymin, xmin, ymax, xmax] } ]
                `;

                // Add Delay
                await new Promise(resolve => setTimeout(resolve, 2000));

                const gptResponse = await this.openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                        {
                            role: "user",
                            content: [
                                { type: "text", text: prompt },
                                { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
                            ]
                        }
                    ],
                    max_tokens: 1000,
                    temperature: 0.1
                });

                const content = gptResponse.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '').trim();
                let detectedItems = [];
                try {
                    detectedItems = JSON.parse(content);
                } catch (e) {
                    console.error('Failed to parse GPT response:', content);
                }

                console.log(`[PdfParserAI] DEBUG: GPT found ${detectedItems.length} items`);

                // 3. Match Logic (Hybird with Fallback)
                for (const item of detectedItems) {
                    if (!item.value) continue;

                    const targetDigits = String(item.value).replace(/[^\d]/g, '');
                    if (targetDigits.length === 0) continue;

                    // Clusering Logic
                    wordList.sort((a, b) => {
                        const yCenterA = (a.bbox.y0 + a.bbox.y1) / 2;
                        const yCenterB = (b.bbox.y0 + b.bbox.y1) / 2;
                        if (Math.abs(yCenterA - yCenterB) < 10) return a.bbox.x0 - b.bbox.x0;
                        return a.bbox.y0 - b.bbox.y0;
                    });

                    let tempClusters = [];
                    let cluster = [wordList[0]];

                    for (let i = 1; i < wordList.length; i++) {
                        const prev = wordList[i - 1];
                        const curr = wordList[i];
                        const gap = curr.bbox.x0 - prev.bbox.x1;
                        const yOverlap = Math.min(prev.bbox.y1, curr.bbox.y1) - Math.max(prev.bbox.y0, curr.bbox.y0);
                        const isSameLine = yOverlap > 0 || Math.abs((prev.bbox.y0 + prev.bbox.y1) / 2 - (curr.bbox.y0 + curr.bbox.y1) / 2) < 10;

                        if (gap > 80 || !isSameLine) {
                            if (cluster.length > 0) tempClusters.push(cluster);
                            cluster = [];
                        }
                        cluster.push(curr);
                    }
                    if (cluster.length) tempClusters.push(cluster);

                    let bestCluster = null;
                    for (const cl of tempClusters) {
                        const text = cl.map(w => w.text).join('');
                        const clusterDigits = text.replace(/[^\d]/g, '');
                        if (clusterDigits.includes(targetDigits)) {
                            bestCluster = cl;
                            break;
                        }
                    }

                    if (bestCluster) {
                        // PRIMARY: Tesseract Precise Match
                        // console.log(`[PdfParserAI] Checking overlap for ${item.value}`);

                        const leftMost = bestCluster[0];
                        const leftNeighbor = wordList.find(w => {
                            const isCurrency = /^R\$/i.test(w.text.trim());
                            if (!isCurrency) return false;
                            const gap = leftMost.bbox.x0 - w.bbox.x1;
                            const yOverlap = Math.min(leftMost.bbox.y1, w.bbox.y1) - Math.max(leftMost.bbox.y0, w.bbox.y0);
                            return (gap > -20 && gap < 100 && yOverlap > 0);
                        });

                        if (leftNeighbor) bestCluster.push(leftNeighbor);

                        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                        bestCluster.forEach(w => {
                            if (w.bbox.x0 < minX) minX = w.bbox.x0;
                            if (w.bbox.y0 < minY) minY = w.bbox.y0;
                            if (w.bbox.x1 > maxX) maxX = w.bbox.x1;
                            if (w.bbox.y1 > maxY) maxY = w.bbox.y1;
                        });

                        const imgW = maxX - minX;
                        const imgH = maxY - minY;
                        const pdfX = minX / scale;
                        const pdfY = viewport.height - (maxY / scale);
                        const paddingX = 6;
                        const paddingY = 4;

                        allPrices.push({
                            text: 'Price',
                            value: item.value,
                            x: pdfX - paddingX,
                            y: pdfY - paddingY,
                            width: (imgW / scale) + (paddingX * 2),
                            height: (imgH / scale) + (paddingY * 2),
                            pageIndex: pageNum - 1,
                            method: 'hybrid-precise'
                        });
                    } else {
                        // FALLBACK: Pure GPT Coordinates
                        console.log(`[PdfParserAI] Fallback to GPT Vision for value: ${item.value}`);

                        if (item.box_2d && item.box_2d.length === 4) {
                            const [ymin, xmin, ymax, xmax] = item.box_2d;

                            // Map 1000x1000 -> PDF
                            const pdfX = (xmin / 1000) * viewport.width;
                            const pdfW = ((xmax - xmin) / 1000) * viewport.width;
                            // Convert Y
                            const pdfY_Bottom = viewport.height - ((ymax / 1000) * viewport.height);
                            const pdfH = ((ymax - ymin) / 1000) * viewport.height;

                            const paddingX = 6;
                            const paddingY = 4;

                            allPrices.push({
                                text: 'Price',
                                value: item.value,
                                x: pdfX - paddingX,
                                y: pdfY_Bottom - paddingY,
                                width: pdfW + (paddingX * 2),
                                height: pdfH + (paddingY * 2),
                                pageIndex: pageNum - 1,
                                method: 'gpt-fallback'
                            });
                        }
                    }
                }

                console.log(`[PdfParserAI] Page ${pageNum}: Found ${allPrices.length} total prices so far.`);

                // Cleanup
                if (fs.existsSync(gptImgPath)) fs.unlinkSync(gptImgPath);
                if (fs.existsSync(procPath)) fs.unlinkSync(procPath);
                if (fs.existsSync(result.path)) fs.unlinkSync(result.path);

            } catch (error) {
                console.error(`[PdfParserAI] Error on page ${pageNum}:`, error);
            }
        }

        await worker.terminate();
        return allPrices;
    }
}

module.exports = new PdfParserAIService();
