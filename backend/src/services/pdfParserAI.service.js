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
        const scriptPath = require('path').join(__dirname, '../../python-ocr-service/gemini_extract.py');
        const command = `python3 "${scriptPath}" "${pdfPath}"`;

        console.log('[PdfParserAI] Running Gemini Extraction Script...');

        try {
            // Increase maxBuffer for large JSON output
            const { stdout, stderr } = await execPromise(command, { maxBuffer: 1024 * 1024 * 10 });

            if (stderr) console.warn('[PdfParserAI] Python Stderr:', stderr);

            const result = JSON.parse(stdout);

            if (result.error) {
                throw new Error(result.error);
            }

            // Convert List to Map format expected by Controller
            // List format: [{code: "123", price: 10.0}]
            // Map format: "123" -> [{price: 10.0, label: ""}]
            const map = new Map();
            if (Array.isArray(result)) {
                result.forEach(p => {
                    if (p.code && p.price) {
                        const code = String(p.code).trim().toUpperCase();
                        map.set(code, [{
                            price: parseFloat(p.price),
                            label: 'Gemini'
                        }]);
                    }
                });
            }
            return map;

        } catch (error) {
            console.error('[PdfParserAI] Gemini Extract Error:', error);
            throw error;
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
