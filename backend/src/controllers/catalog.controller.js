const CatalogProduct = require('../models/CatalogProduct');
const catalogService = require('../services/catalog.service');
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
            const { search, category, catalog } = req.query;

            const where = { isActive: true };

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

            console.log(`[CatalogController] Processing PDF: ${catalogName}`);

            // 1. Extract pages from PDF
            res.write(JSON.stringify({ status: 'extracting', message: 'Extraindo páginas do PDF...' }) + '\n');

            const pagePaths = await catalogService.extractPagesFromPdf(pdfPath, catalogName);
            console.log(`[CatalogController] Extracted ${pagePaths.length} pages`);

            // 2. Analyze each page with AI
            let processedProducts = 0;
            const allProducts = [];

            for (let i = 0; i < pagePaths.length; i++) {
                const pagePath = pagePaths[i];
                const pageNum = i + 1;

                console.log(`[CatalogController] Analyzing page ${pageNum}/${pagePaths.length}`);

                try {
                    const result = await catalogService.analyzePageWithAI(pagePath, pageNum);

                    if (result.produtos && result.produtos.length > 0) {
                        for (const produto of result.produtos) {
                            if (!produto.codigo) continue;

                            // Save to database
                            const existing = await CatalogProduct.findOne({ where: { code: produto.codigo } });

                            if (existing) {
                                await existing.update({
                                    name: produto.nome || existing.name,
                                    category: produto.categoria || existing.category,
                                    price_1_3: produto.preco_1_3 || existing.price_1_3,
                                    price_4_8: produto.preco_4_8 || existing.price_4_8,
                                    price_10_12: produto.preco_10_12 || existing.price_10_12,
                                    catalogName: catalogName,
                                    pageNumber: pageNum,
                                    imageUrl: pagePath
                                });
                            } else {
                                await CatalogProduct.create({
                                    code: produto.codigo,
                                    name: produto.nome,
                                    category: produto.categoria,
                                    price_1_3: produto.preco_1_3,
                                    price_4_8: produto.preco_4_8,
                                    price_10_12: produto.preco_10_12,
                                    catalogName: catalogName,
                                    pageNumber: pageNum,
                                    imageUrl: pagePath,
                                    isActive: true
                                });
                            }

                            allProducts.push(produto);
                            processedProducts++;
                        }
                    }
                } catch (pageError) {
                    console.error(`[CatalogController] Error on page ${pageNum}:`, pageError.message);
                }
            }

            // Clean up uploaded PDF
            fs.unlinkSync(pdfPath);

            res.json({
                success: true,
                message: 'Catálogo processado com sucesso!',
                catalogName,
                pagesProcessed: pagePaths.length,
                productsFound: processedProducts,
                products: allProducts
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
    static async getProductPrice(code, size = null) {
        try {
            const product = await CatalogProduct.findOne({
                where: {
                    code: { [Op.like]: `%${code}%` },
                    isActive: true
                }
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
}

module.exports = new CatalogController();
