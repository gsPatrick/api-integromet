const CatalogProduct = require('../models/CatalogProduct');
const Campaign = require('../models/Campaign');
const catalogService = require('../services/catalog.service');
const catalogAssistant = require('../services/catalogAssistant.service');
const catalogMarkupService = require('../services/catalogMarkup.service');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');

class CatalogController {

    constructor() {
        this.uploadDir = path.join(__dirname, '../../public/uploads/catalogs');
        // Ensure upload directory exists
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    /**
     * List all catalog products
     * GET /catalog
     */
    async listProducts(req, res) {
        try {
            const { search, category, catalog, campaignId } = req.query;

            const where = { isActive: true };

            if (campaignId) {
                where.campaignId = parseInt(campaignId);
            } else {
                // If no specific campaign selected, show products from active campaigns
                const activeCampaigns = await Campaign.findAll({ where: { isActive: true } });
                const activeIds = activeCampaigns.map(c => c.id);
                where.campaignId = { [Op.in]: activeIds };
            }

            if (search) {
                where[Op.or] = [
                    { code: { [Op.like]: `%${search}%` } },
                    { name: { [Op.like]: `%${search}%` } }
                ];
            }

            if (category) {
                where.category = category;
            }

            if (catalog) {
                where.catalogName = catalog;
            }

            const products = await CatalogProduct.findAll({
                where,
                order: [['code', 'ASC']],
                limit: 500
            });

            res.json({
                total: products.length,
                data: products
            });
        } catch (error) {
            console.error('[CatalogController] Error listing products:', error);
            res.status(500).json({ error: 'Failed to list catalog products' });
        }
    }

    /**
     * Upload and process PDF catalog
     * POST /catalog/upload-pdf
     */
    async uploadPdf(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'No PDF file uploaded' });
            }

            const pdfPath = req.file.path;
            const catalogName = req.body.catalogName || req.file.originalname.replace('.pdf', '');
            const campaignId = req.body.campaignId ? parseInt(req.body.campaignId) : null;

            console.log(`[CatalogController] Processing PDF: ${catalogName} (Campaign ID: ${campaignId})`);

            // 1. Upload to OpenAI Assistant Vector Store
            try {
                console.log('[CatalogController] Uploading to OpenAI Assistant...');
                await catalogAssistant.uploadCatalogPdf(pdfPath, catalogName);
                console.log('[CatalogController] Uploaded to OpenAI Assistant successfully');

                // Save catalog metadata to DB (with pdfPath for markup feature)
                await CatalogProduct.create({
                    code: 'CATALOG_META',
                    name: `Catálogo: ${catalogName}`,
                    category: 'METADATA',
                    catalogName: catalogName,
                    pdfPath: pdfPath, // Keep path for markup generation
                    isActive: true,
                    campaignId: campaignId
                });

            } catch (assistError) {
                console.error('[CatalogController] Assistant upload failed:', assistError.message);
                // If assistant upload fails, we should probably error out since it's now our main source
                return res.status(500).json({ error: 'Falha ao enviar para OpenAI Assistant: ' + assistError.message });
            }

            // NOTE: PDF file is kept in public/uploads/catalogs for markup generation
            // It is NOT deleted after upload

            res.json({
                success: true,
                message: 'Catálogo enviado para IA com sucesso!',
                catalogName,
                pdfPath: pdfPath, // Return path for frontend reference
                pagesProcessed: 0,
                productsFound: 0,
                products: []
            });

        } catch (error) {
            console.error('[CatalogController] PDF upload error:', error);
            res.status(500).json({ error: 'Failed to process PDF: ' + error.message });
        }
    }

    /**
     * Get processing status
     * GET /catalog/status
     */
    async getStatus(req, res) {
        try {
            const totalProducts = await CatalogProduct.count({ where: { isActive: true } });
            const catalogs = await CatalogProduct.findAll({
                attributes: ['catalogName'],
                group: ['catalogName']
            });

            res.json({
                totalProducts,
                catalogs: catalogs.map(c => c.catalogName).filter(Boolean)
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to get status' });
        }
    }

    /**
     * Add or update a catalog product manually
     * POST /catalog/product
     */
    async addProduct(req, res) {
        try {
            const { code, name, category, price_1_3, price_4_8, price_10_12, catalogName } = req.body;

            if (!code) {
                return res.status(400).json({ error: 'Product code is required' });
            }

            // Upsert by code
            const [product, created] = await CatalogProduct.upsert({
                code,
                name,
                category,
                price_1_3,
                price_4_8,
                price_10_12,
                catalogName,
                isActive: true
            }, {
                returning: true
            });

            res.json({
                message: created ? 'Product created' : 'Product updated',
                product
            });
        } catch (error) {
            console.error('[CatalogController] Error adding product:', error);
            res.status(500).json({ error: 'Failed to add catalog product' });
        }
    }

    /**
     * Bulk import products from JSON array
     * POST /catalog/import
     */
    async bulkImport(req, res) {
        try {
            const { products, catalogName } = req.body;

            if (!Array.isArray(products) || products.length === 0) {
                return res.status(400).json({ error: 'Products array is required' });
            }

            let created = 0;
            let updated = 0;

            for (const p of products) {
                if (!p.code) continue;

                const existing = await CatalogProduct.findOne({ where: { code: p.code } });

                if (existing) {
                    await existing.update({
                        name: p.name || existing.name,
                        category: p.category || existing.category,
                        price_1_3: p.price_1_3 || existing.price_1_3,
                        price_4_8: p.price_4_8 || existing.price_4_8,
                        price_10_12: p.price_10_12 || existing.price_10_12,
                        catalogName: catalogName || existing.catalogName,
                        rawText: p.rawText || existing.rawText
                    });
                    updated++;
                } else {
                    await CatalogProduct.create({
                        code: p.code,
                        name: p.name,
                        category: p.category,
                        price_1_3: p.price_1_3,
                        price_4_8: p.price_4_8,
                        price_10_12: p.price_10_12,
                        catalogName: catalogName,
                        rawText: p.rawText,
                        isActive: true
                    });
                    created++;
                }
            }

            res.json({
                message: 'Import completed',
                created,
                updated,
                total: created + updated
            });
        } catch (error) {
            console.error('[CatalogController] Error bulk importing:', error);
            res.status(500).json({ error: 'Failed to import products' });
        }
    }

    /**
     * Search product by code
     * GET /catalog/search/:code
     */
    async searchByCode(req, res) {
        try {
            const { code } = req.params;

            const product = await CatalogProduct.findOne({
                where: {
                    code: { [Op.like]: `%${code}%` },
                    isActive: true
                }
            });

            if (!product) {
                return res.status(404).json({ error: 'Product not found in catalog' });
            }

            res.json(product);
        } catch (error) {
            console.error('[CatalogController] Error searching product:', error);
            res.status(500).json({ error: 'Failed to search product' });
        }
    }

    /**
     * Static helper to find product price by code
     */
    async getProductPrice(code, size = null, campaignId = null) {
        try {
            const where = {
                code: { [Op.like]: `%${code}%` },
                isActive: true
            };

            if (campaignId) {
                where.campaignId = campaignId;
            }

            const product = await CatalogProduct.findOne({
                where: where,
                // If multiple matches (duplicates), prefer the one created most recently
                order: [['createdAt', 'DESC']]
            });

            if (!product) return null;

            // Determine which price based on size
            if (size) {
                const sizeNum = parseInt(size);
                if (sizeNum <= 3 || size.includes('1-3') || size.includes('P')) {
                    return product.price_1_3;
                } else if (sizeNum <= 8 || size.includes('4-8') || size.includes('M')) {
                    return product.price_4_8;
                } else {
                    return product.price_10_12;
                }
            }

            // Return middle price if no size specified
            return product.price_4_8 || product.price_1_3 || product.price_10_12;
        } catch (error) {
            console.error('[CatalogController] Error getting price:', error);
            return null;
        }
    }

    /**
     * Delete all catalog products (reset)
     * DELETE /catalog/reset
     */
    async resetCatalog(req, res) {
        try {
            await CatalogProduct.destroy({ where: {} });
            res.json({ message: 'Catalog reset successfully' });
        } catch (error) {
            console.error('[CatalogController] Error resetting catalog:', error);
            res.status(500).json({ error: 'Failed to reset catalog' });
        }
    }

    /**
     * Generate PDF with markup applied to prices
     * POST /catalog/generate-markup
     */
    async generateMarkup(req, res) {
        try {
            const { catalogName, markupPercentage } = req.body;

            if (!catalogName) {
                return res.status(400).json({ error: 'Nome do catálogo é obrigatório' });
            }

            if (markupPercentage === undefined) {
                return res.status(400).json({ error: 'Porcentagem de markup inválida' });
            }

            // Find the catalog record with pdfPath
            const catalog = await CatalogProduct.findOne({
                where: {
                    catalogName: catalogName,
                    code: 'CATALOG_META'
                }
            });

            if (!catalog || !catalog.pdfPath) {
                return res.status(404).json({
                    error: 'Catálogo não encontrado ou PDF não disponível. Faça upload novamente.'
                });
            }

            // Check if file still exists
            if (!fs.existsSync(catalog.pdfPath)) {
                return res.status(404).json({
                    error: 'Arquivo PDF não encontrado no servidor. Faça upload novamente.'
                });
            }

            console.log(`[CatalogController] Generating markup PDF for: ${catalogName} with ${markupPercentage}%`);

            // Generate the markup PDF
            const result = await catalogMarkupService.generateMarkupPdf(
                catalog.pdfPath,
                parseFloat(markupPercentage)
            );

            // Return the file for download
            res.download(result.outputPath, result.outputFilename, (err) => {
                if (err) {
                    console.error('[CatalogController] Error sending file:', err);
                }
                // Optionally delete the generated file after download
                // fs.unlinkSync(result.outputPath);
            });

        } catch (error) {
            console.error('[CatalogController] Error generating markup PDF:', error);
            res.status(500).json({ error: 'Falha ao gerar PDF com markup: ' + error.message });
        }
    }

    /**
     * Generate PDF with markup from direct upload (no catalog storage)
     * POST /catalog/generate-markup-upload
     */
    async generateMarkupFromUpload(req, res) {
        try {
            // Multer fields: { pdf: [file], pricePdf: [file] }
            const files = req.files || {};
            let visualPdf = files['pdf'] ? files['pdf'][0] : req.file;
            let pdfPath = null;
            let isUploaded = false; // Flag to know if we should delete the file later

            // Case 1: Uploaded File
            if (visualPdf) {
                pdfPath = visualPdf.path;
                isUploaded = true;
            }
            // Case 2: Fallback to Campaign File
            else if (req.body.campaignId) {
                const campaign = await Campaign.findByPk(req.body.campaignId);
                if (campaign && campaign.visualPdfPath) {
                    pdfPath = campaign.visualPdfPath;
                    console.log(`[CatalogController] Using existing Campaign PDF: ${pdfPath}`);
                }
            }

            if (!pdfPath) {
                return res.status(400).json({ error: 'Nenhum arquivo PDF enviado e nenhum PDF associado à campanha encontrado.' });
            }

            const pricePdfs = files['pricePdf'] || [];
            const markupPercentage = parseFloat(req.body.markupPercentage);

            if (isNaN(markupPercentage)) { // Accept negative values
                return res.status(400).json({ error: 'Porcentagem de markup inválida' });
            }

            // Map to array of paths
            const pricePdfPaths = pricePdfs.map(f => f.path);
            const originalName = visualPdf ? (visualPdf.originalname || 'catalog.pdf') : 'campanha_catalogo.pdf';

            console.log(`[CatalogController] Generating markup PDF: ${originalName} + ${pricePdfPaths.length} Price Lists with ${markupPercentage}%`);

            // Generate the markup PDF
            const result = await catalogMarkupService.generateMarkupPdf(
                pdfPath,
                markupPercentage,
                pricePdfPaths
            );

            // Clean up uploaded files immediately after generation (not the output!)
            try {
                if (isUploaded && fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
                if (pricePdfPaths.length > 0) {
                    pricePdfPaths.forEach(p => {
                        if (fs.existsSync(p)) fs.unlinkSync(p);
                    });
                }
            } catch (e) {
                console.warn('[CatalogController] Could not delete uploaded files:', e.message);
            }

            // Return download URL instead of streaming (avoids proxy timeout issues)
            // The file is in: /workspace/public/uploads/catalogs/markup/filename.pdf
            // Public URL will be: /uploads/catalogs/markup/filename.pdf
            const downloadUrl = `/uploads/catalogs/markup/${result.outputFilename}`;

            console.log(`[CatalogController] PDF generated successfully. Download URL: ${downloadUrl}`);

            res.json({
                success: true,
                downloadUrl: downloadUrl,
                filename: result.outputFilename,
                pricesUpdated: result.pricesUpdated
            });

        } catch (error) {
            console.error('[CatalogController] Error generating markup PDF from upload:', error);
            res.status(500).json({ error: 'Falha ao gerar PDF com markup: ' + error.message });
        }
    }
}

module.exports = new CatalogController();
