const axios = require('axios');
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-poppler');

class CatalogService {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY;
        this.apiUrl = 'https://api.openai.com/v1/chat/completions';
        this.catalogDir = path.join(__dirname, '../../public/catalog-pages');

        // Ensure catalog directory exists
        if (!fs.existsSync(this.catalogDir)) {
            fs.mkdirSync(this.catalogDir, { recursive: true });
        }
    }

    /**
     * Convert PDF to images (one per page)
     * @param {string} pdfPath - Path to the PDF file
     * @param {string} catalogName - Name for the catalog
     * @returns {Promise<string[]>} - Array of image paths
     */
    async extractPagesFromPdf(pdfPath, catalogName) {
        console.log(`[CatalogService] Extracting pages from PDF: ${pdfPath}`);

        // Create directory for this catalog
        const catalogFolder = path.join(this.catalogDir, catalogName.replace(/[^a-zA-Z0-9]/g, '_'));
        if (fs.existsSync(catalogFolder)) {
            // Clean existing folder
            fs.rmSync(catalogFolder, { recursive: true });
        }
        fs.mkdirSync(catalogFolder, { recursive: true });

        const opts = {
            format: 'jpeg',
            out_dir: catalogFolder,
            out_prefix: 'page',
            page: null // All pages
        };

        try {
            await pdf.convert(pdfPath, opts);

            // Get list of generated images
            const files = fs.readdirSync(catalogFolder)
                .filter(f => f.endsWith('.jpg') || f.endsWith('.jpeg'))
                .sort((a, b) => {
                    const numA = parseInt(a.match(/\d+/)?.[0] || 0);
                    const numB = parseInt(b.match(/\d+/)?.[0] || 0);
                    return numA - numB;
                })
                .map(f => path.join(catalogFolder, f));

            console.log(`[CatalogService] Extracted ${files.length} pages`);
            return files;
        } catch (error) {
            console.error('[CatalogService] PDF extraction error:', error);
            throw new Error('Failed to extract PDF pages: ' + error.message);
        }
    }

    /**
     * Analyze a catalog page image with GPT-4o
     * @param {string} imagePath - Path to the page image
     * @param {number} pageNumber - Page number
     * @returns {Promise<Object>} - Extracted products
     */
    async analyzePageWithAI(imagePath, pageNumber) {
        console.log(`[CatalogService] Analyzing page ${pageNumber} with AI...`);

        // Convert image to base64
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');
        const mimeType = imagePath.endsWith('.png') ? 'image/png' : 'image/jpeg';

        try {
            const payload = {
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: `Você é um especialista em extração de dados de catálogos de roupas infantis.
Analise a página do catálogo e extraia TODOS os produtos visíveis.

Para cada produto, extraia:
- codigo: Código do produto (ex: 46586, 00271)
- nome: Nome/descrição do produto
- categoria: Tipo (Conjunto, Blusa, Vestido, etc)
- preco_1_3: Preço para tamanho 1-3 (ou P/RN)
- preco_4_8: Preço para tamanho 4-8 (ou M)
- preco_10_12: Preço para tamanho 10-12 (ou G)

Retorne APENAS JSON no formato:
{
  "pagina": number,
  "produtos": [
    {
      "codigo": "string",
      "nome": "string",
      "categoria": "string",
      "preco_1_3": number ou null,
      "preco_4_8": number ou null,
      "preco_10_12": number ou null
    }
  ],
  "observacao": "string (notas sobre a página)"
}

REGRAS:
- Se não conseguir ler algum dado, deixe null
- Inclua TODOS os produtos visíveis na página
- Preços devem ser números (sem R$)
- Se a página não tem produtos (capa, índice), retorne produtos: []`
                    },
                    {
                        role: "user",
                        content: [
                            { type: "text", text: `Analise esta página ${pageNumber} do catálogo e extraia todos os produtos com seus códigos e preços.` },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data:${mimeType};base64,${base64Image}`,
                                    detail: "high"
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 1500,
                response_format: { type: "json_object" }
            };

            const response = await axios.post(
                this.apiUrl,
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    }
                }
            );

            const content = response.data.choices[0].message.content;
            console.log(`[CatalogService] Page ${pageNumber} AI Response:`, content);
            return JSON.parse(content);

        } catch (error) {
            console.error(`[CatalogService] AI analysis error for page ${pageNumber}:`, error.response?.data || error.message);
            return { pagina: pageNumber, produtos: [], observacao: 'Erro na análise: ' + error.message };
        }
    }

    /**
     * Visual match: Compare customer image against catalog pages
     * @param {string} customerImageUrl - URL or base64 of customer image
     * @param {string[]} catalogPagePaths - Paths to catalog page images
     * @returns {Promise<Object>} - Best matching product
     */
    async findVisualMatch(customerImageUrl, catalogPagePaths) {
        console.log('[CatalogService] Starting visual matching...');

        // For now, we'll use a simpler approach:
        // Send the customer image and ask AI to describe it
        // Then search our database for matching products

        try {
            const payload = {
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: `Você está analisando uma foto de produto de catálogo de roupas infantis.
Descreva o produto para que possamos encontrar no nosso catálogo.

Extraia:
- tipo: Tipo de roupa (Conjunto, Vestido, Blusa, Calça, etc)
- cor_principal: Cor principal
- estampa: Padrão/estampa se houver (xadrez, listrado, liso, floral, etc)
- detalhes: Características distintivas (bordado, laço, botões, etc)
- marca_visivel: Se houver marca/logo visível
- codigo_visivel: Código do produto se visível

Retorne JSON:
{
  "tipo": "string",
  "cor_principal": "string",
  "estampa": "string ou null",
  "detalhes": ["string"],
  "marca_visivel": "string ou null",
  "codigo_visivel": "string ou null",
  "descricao_busca": "string (descrição completa para busca)"
}`
                    },
                    {
                        role: "user",
                        content: [
                            { type: "text", text: "Descreva este produto de roupa infantil para busca no catálogo:" },
                            {
                                type: "image_url",
                                image_url: { url: customerImageUrl }
                            }
                        ]
                    }
                ],
                max_tokens: 500,
                response_format: { type: "json_object" }
            };

            const response = await axios.post(
                this.apiUrl,
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    }
                }
            );

            const result = JSON.parse(response.data.choices[0].message.content);
            console.log('[CatalogService] Visual description:', result);
            return result;

        } catch (error) {
            console.error('[CatalogService] Visual match error:', error.response?.data || error.message);
            return null;
        }
    }
}

module.exports = new CatalogService();
