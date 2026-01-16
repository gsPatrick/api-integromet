const express = require('express');
const cors = require('cors');
const path = require('path');
const sequelize = require('./config/database');
const webhookController = require('./controllers/webhook.controller');
const blingController = require('./controllers/bling.controller');
const orderController = require('./controllers/order.controller');
const authController = require('./controllers/auth.controller');
const importController = require('./controllers/import.controller');
const authMiddleware = require('./middleware/auth');
const User = require('./models/User');
const CatalogProduct = require('./models/CatalogProduct');
const MessageContext = require('./models/MessageContext');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: true, // Allow all origins
    credentials: true, // Allow cookies/auth headers
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-token', 'Accept']
}));
app.use(express.json({ limit: '10gb' })); // Effectively unlimited
app.use(express.urlencoded({ extended: true, limit: '10gb' }));

// Serve static files (uploaded images)
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Public Routes
app.post('/webhook', webhookController.handleWebhook);
app.post('/webhook/asaas', webhookController.handleAsaasWebhook.bind(webhookController)); // Asaas payment webhook
app.get('/health', (req, res) => res.status(200).send('OK'));

const SettingsController = require('./controllers/settings.controller');
const CustomerController = require('./controllers/customer.controller');
const settingsController = new SettingsController();

// Auth & Integration Routes
app.get('/auth/bling/start', authController.startBlingAuth);
app.get('/auth/bling/callback', authController.handleBlingCallback);
app.get('/integrations/status', authController.getIntegrationStatus);
app.delete('/auth/bling/disconnect', authController.disconnectBling);

// Import/Tools Routes
app.post('/import/history', importController.importHistory);

// Legacy Setup Route
app.get('/setup/bling', blingController.handleSetup);

// Settings Routes
app.get('/settings', settingsController.getAll);
app.put('/settings', settingsController.update);
// Customer Routes
app.get('/customers', CustomerController.listCustomers);
app.get('/customers/:phone/orders', CustomerController.getCustomerOrders);

// DEBUG ENDPOINT: Migrate legacy orders
app.get('/debug/migrate-legacy', async (req, res) => {
    try {
        const Campaign = require('./models/Campaign');
        const Order = require('./models/Order');

        // 1. Create/Find Legado
        const [legacyCampaign, created] = await Campaign.findOrCreate({
            where: { name: 'Legado' },
            defaults: {
                name: 'Legado',
                description: 'Pedidos antigos antes da separação de campanhas',
                isActive: true,
                isDefault: false
            }
        });

        // 2. Update orphans (campaignId IS NULL)
        const [updatedCount] = await Order.update(
            { campaignId: legacyCampaign.id },
            { where: { campaignId: null } }
        );

        res.json({
            success: true,
            campaign: legacyCampaign,
            created,
            updatedCount
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// DEBUG ENDPOINT: Fix product names for Precoce
app.get('/debug/fix-names', async (req, res) => {
    try {
        const Order = require('./models/Order');
        const { Op } = require('sequelize');

        const TARGET_CAMPAIGN_ID = 12;
        const WRONG_SUFFIX = 'Lili Sampedro Jan 26';
        const CORRECT_SUFFIX_TEXT = 'Precoce Jan 26';

        const orders = await Order.findAll({
            where: {
                campaignId: TARGET_CAMPAIGN_ID,
                productRaw: { [Op.like]: `%${WRONG_SUFFIX}%` }
            }
        });

        let updatedCount = 0;
        const details = [];

        for (const order of orders) {
            let newName = order.productRaw;

            // Clean common dirty suffixes
            newName = newName.replace(/ ou campanha teste/gi, '');
            newName = newName.replace(/ ou Lili Sampedro Jan 26/g, '');

            // Replace main wrong one
            newName = newName.replace(/Lili Sampedro Jan 26/g, CORRECT_SUFFIX_TEXT);

            // Cleanup double separators if they occurred " - - "
            // newName = newName.replace(/ - - /g, ' - '); // Optional, use caution

            if (newName !== order.productRaw) {
                await order.update({ productRaw: newName });
                updatedCount++;
                details.push({ old: order.productRaw, new: newName });
            }
        }

        res.json({ success: true, updatedCount, details });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DEBUG ENDPOINT: Resync orders to Bling (delete old and recreate)
app.get('/debug/resync-bling', async (req, res) => {
    try {
        const Order = require('./models/Order');
        const blingService = require('./services/bling.service');
        const { Op } = require('sequelize');

        const campaignId = parseInt(req.query.campaignId);

        if (!campaignId) {
            return res.status(400).json({ error: 'campaignId query param required' });
        }

        // Find all orders in this campaign that have been synced to Bling
        const orders = await Order.findAll({
            where: {
                campaignId: campaignId,
                blingId: { [Op.not]: null }
            }
        });

        console.log(`[ResyncBling] Found ${orders.length} orders with blingId in campaign ${campaignId}`);

        const results = [];

        for (const order of orders) {
            const oldBlingId = order.blingId;

            // 1. Delete old order from Bling
            console.log(`[ResyncBling] Deleting Bling order ${oldBlingId}...`);
            const deleted = await blingService.deleteOrder(oldBlingId);

            if (deleted) {
                // 2. Clear blingId so it can be resynced
                await order.update({ blingId: null, blingSyncedAt: null, status: 'PENDING' });
                results.push({ orderId: order.id, oldBlingId, deleted: true });
            } else {
                results.push({ orderId: order.id, oldBlingId, deleted: false, error: 'Failed to delete' });
            }
        }

        res.json({
            success: true,
            message: `Deleted ${results.filter(r => r.deleted).length} orders from Bling. They are now ready to be resynced via the Dashboard.`,
            results
        });

    } catch (error) {
        console.error('[ResyncBling] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DEBUG ENDPOINT: Find client in Bling by phone
app.get('/debug/find-client', async (req, res) => {
    try {
        const blingService = require('./services/bling.service');
        const phone = req.query.phone;

        if (!phone) {
            return res.status(400).json({ error: 'phone query param required' });
        }

        console.log(`[FindClient] Searching for phone: ${phone}`);

        const token = await blingService.getValidToken();
        const client = await blingService._findClient(token, null, phone);

        if (client) {
            res.json({
                found: true,
                client: {
                    id: client.id,
                    nome: client.nome,
                    cpfCnpj: client.numeroDocumento || client.cpfCnpj || 'Não cadastrado',
                    telefone: client.telefone,
                    celular: client.celular,
                    email: client.email
                }
            });
        } else {
            res.json({ found: false, message: 'Cliente não encontrado no Bling' });
        }

    } catch (error) {
        console.error('[FindClient] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DEBUG ENDPOINT: Order stats by campaign
app.get('/debug/stats', async (req, res) => {
    try {
        const Order = require('./models/Order');
        const Campaign = require('./models/Campaign');
        const sequelize = require('./config/database');

        const stats = await Order.findAll({
            attributes: ['campaignId', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            group: ['campaignId'],
            order: [[sequelize.literal('count'), 'DESC']]
        });

        const campaigns = await Campaign.findAll();
        const campaignMap = {};
        campaigns.forEach(c => campaignMap[c.id] = c.name);

        const enrichedStats = stats.map(s => ({
            campaignId: s.campaignId,
            campaignName: campaignMap[s.campaignId] || (s.campaignId === null ? 'Sem Campanha (NULL)' : 'Desconhecida'),
            count: s.get('count')
        }));

        res.json(enrichedStats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/debug/fix-orders', async (req, res) => {
    try {
        const Order = require('./models/Order');
        const { Op } = require('sequelize');
        // Update all NULL campaignId to 12
        const [updated] = await Order.update(
            { campaignId: 12 },
            { where: { campaignId: null } }
        );
        res.json({ success: true, updatedCount: updated });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post('/customers/:phone/sync', CustomerController.syncCustomerOrders);

// Campaign Routes
const campaignController = require('./controllers/campaign.controller');
app.post('/campaigns', campaignController.createCampaign);
app.get('/campaigns', campaignController.listCampaigns);
app.put('/campaigns/:id', campaignController.updateCampaign);
app.delete('/campaigns/:id', campaignController.deleteCampaign);
// Campaign Routes Moved Below to satisfy Dependencies

// Catalog Routes
const catalogController = require('./controllers/catalog.controller');
const multer = require('multer');

// Configure multer for PDF uploads
const pdfStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../public/uploads/catalogs');
        const fs = require('fs');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'catalog-' + uniqueSuffix + '.pdf');
    }
});
const pdfUpload = multer({
    storage: pdfStorage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    }
    // No file size limit
});

// New Campaign Catalog Routes (Now correctly placed)
app.post('/campaigns/:id/upload', pdfUpload.fields([
    { name: 'pdf', maxCount: 1 },
    { name: 'pricePdf', maxCount: 20 }
]), campaignController.uploadFiles);
app.post('/campaigns/:id/generate', campaignController.generateCatalog);

app.get('/catalog', catalogController.listProducts);
app.get('/catalog/status', catalogController.getStatus);
app.post('/catalog/product', catalogController.addProduct);
app.post('/catalog/import', catalogController.bulkImport);
app.post('/catalog/upload-pdf', pdfUpload.single('pdf'), catalogController.uploadPdf);
app.get('/catalog/search/:code', catalogController.searchByCode);
app.delete('/catalog/reset', catalogController.resetCatalog);
app.post('/catalog/generate-markup', catalogController.generateMarkup);
app.post('/catalog/generate-markup-upload', pdfUpload.fields([
    { name: 'pdf', maxCount: 1 },
    { name: 'pricePdf', maxCount: 20 }
]), catalogController.generateMarkupFromUpload);

// Protected Routes (Require x-api-token)
app.use('/orders', authMiddleware);

app.get('/orders', orderController.listOrders);
app.put('/orders/move', orderController.moveOrders.bind(orderController));
app.post('/orders/send-confirmation', orderController.sendConfirmation.bind(orderController));
app.post('/orders/generate-link-sync', orderController.generateLinkSync.bind(orderController)); // Asaas + Bling sync
app.get('/orders/:id', orderController.getOrder);
app.put('/orders/:id', orderController.updateOrder);
app.post('/orders/:id/sync-bling', orderController.syncOrderToBling.bind(orderController));

// Start Server
async function startServer() {
    try {
        // Sync Database
        // Attach sequelize to app for easier access if needed, though it's already imported
        app.sequelize = sequelize;

        app.sequelize.sync({ alter: true }).then(async () => {
            console.log('Database synced (ALTER mode - Data preserved)');

            // Seed Default Admin User
            const User = require('./models/User'); // Ensure User model is loaded
            const Campaign = require('./models/Campaign');
            const Order = require('./models/Order');

            const defaultUser = 'dpbrinquedoscriativos@gmail.com';
            User.findOne({ where: { username: defaultUser } }).then(admin => {
                if (!admin) {
                    User.create({ username: defaultUser, password: 'DP#bc#1212' });
                    console.log(`[Server] Default user (${defaultUser}) created automatically.`);
                }
            });

            // -------------------------------------------------------------
            // CAMPAIGN MIGRATION: Ensure a Default Campaign exists and claims old orders
            // -------------------------------------------------------------
            try {
                // 1. Check if a DEFAULT campaign exists
                let defaultCamp = await Campaign.findOne({ where: { isDefault: true } });

                if (!defaultCamp) {
                    // Try to find one named "Pronta Entrega" to promote
                    defaultCamp = await Campaign.findOne({ where: { name: 'Pronta Entrega' } });

                    if (defaultCamp) {
                        defaultCamp.isDefault = true;
                        await defaultCamp.save();
                        console.log(`[Server] Promoted existing 'Pronta Entrega' to Default Campaign.`);
                    } else {
                        // Create Default Campaign "Pronta Entrega"
                        defaultCamp = await Campaign.create({
                            name: 'Pronta Entrega',
                            isActive: true,
                            isDefault: true,
                            markupPercentage: 35,
                            description: 'Campanha padrão para pedidos sem catálogo específico.'
                        });
                        console.log(`[Server] Created Default Campaign 'Pronta Entrega' (ID: ${defaultCamp.id})`);
                    }
                }

                const defaultCampaignId = defaultCamp.id;

                if (defaultCampaignId) {
                    // 2. Update NULL orders
                    const { Op } = require('sequelize');
                    const [updatedCount] = await Order.update(
                        { campaignId: defaultCampaignId },
                        { where: { campaignId: null } }
                    );

                    if (updatedCount > 0) {
                        console.log(`[Server] Migrated ${updatedCount} orphan orders to Campaign ID ${defaultCampaignId}`);
                    }
                }
            } catch (err) {
                console.error('[Server] Campaign migration failed:', err);
                // Non-fatal, continue starting server
            }
            // -------------------------------------------------------------

            // app.listen... moved below
            const server = app.listen(PORT, () => {
                console.log(`[Server] Running on port ${PORT}`);
            });

            // Set timeouts to unlimited (0 = no timeout)
            server.timeout = 0; // Request timeout
            server.keepAliveTimeout = 0; // Keep-alive timeout
            server.headersTimeout = 0; // Headers timeout
            console.log('[Server] Timeouts set to unlimited for long PDF processing');
        }).catch(err => {
            console.error('Failed to sync database:', err);
        });
    } catch (error) {
        console.error('[Server] Failed to start:', error);
    }
}

startServer();
