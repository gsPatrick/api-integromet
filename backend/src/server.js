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
// Customer Routes
app.get('/customers', CustomerController.listCustomers);
app.get('/customers/:phone/orders', CustomerController.getCustomerOrders);
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
                // 1. Check if ANY campaign exists
                const count = await Campaign.count();
                let defaultCampaignId;

                if (count === 0) {
                    // Create Default Campaign
                    const defaultCamp = await Campaign.create({
                        name: 'Campanha Padrão (Legado)',
                        isActive: true,
                        description: 'Campanha automática para pedidos anteriores.'
                    });
                    defaultCampaignId = defaultCamp.id;
                    console.log(`[Server] Created Default Campaign (ID: ${defaultCampaignId})`);
                } else {
                    // Use the first one found (or a specific "Default" if we tracked it)
                    // For now, just finding the first ID to rescue orphans is safe enough,
                    // or finding one explicitly named 'Campanha Padrão'.
                    const existing = await Campaign.findOne({ order: [['id', 'ASC']] });
                    if (existing) defaultCampaignId = existing.id;
                }

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
            app.listen(PORT, () => {
                console.log(`[Server] Running on port ${PORT}`);
            });
        }).catch(err => {
            console.error('Failed to sync database:', err);
        });
    } catch (error) {
        console.error('[Server] Failed to start:', error);
    }
}

startServer();
