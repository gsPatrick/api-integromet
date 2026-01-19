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
const CustomerBlingMapping = require('./models/CustomerBlingMapping');

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

// DEBUG ENDPOINT: Test Assistant Source Identification
app.get('/debug/assistant-source', async (req, res) => {
    try {
        const catalogAssistant = require('./services/catalogAssistant.service');
        const query = req.query.q; // e.g. "Código 1228"
        const context = req.query.c || 'Pronta Entrega';

        if (!query) return res.status(400).json({ error: 'Missing query param q' });

        console.log(`[Debug] Testing Assistant Search for: "${query}" in Context: "${context}"`);
        const result = await catalogAssistant.searchCatalog(query, context);

        res.json({
            query,
            context,
            result
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// DEBUG ENDPOINT: List all files in Vector Store
app.get('/debug/assistant-files', async (req, res) => {
    try {
        const service = require('./services/catalogAssistant.service');
        await service.initialize();

        if (!service.vectorStoreId) {
            return res.status(404).json({ error: 'Vector Store ID not initialized' });
        }

        const vsFiles = await service.openai.beta.vectorStores.files.list(
            service.vectorStoreId
        );

        const fileDetails = [];
        for (const f of vsFiles.data) {
            try {
                const fileObj = await service.openai.files.retrieve(f.id);
                fileDetails.push({
                    id: f.id,
                    name: fileObj.filename,
                    status: f.status,
                    created_at: new Date(fileObj.created_at * 1000).toISOString()
                });
            } catch (e) {
                fileDetails.push({ id: f.id, error: 'File not found details' });
            }
        }

        res.json({
            vectorStoreId: service.vectorStoreId,
            count: fileDetails.length,
            files: fileDetails
        });
    } catch (error) {
        console.error(error);
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

// DEBUG ENDPOINT: Raw Bling search to see all results
app.get('/debug/bling-search', async (req, res) => {
    try {
        const blingService = require('./services/bling.service');
        const axios = require('axios');
        const query = req.query.q;

        if (!query) {
            return res.status(400).json({ error: 'q query param required (search term)' });
        }

        const token = await blingService.getValidToken();

        const response = await axios.get(
            `https://api.bling.com.br/Api/v3/contatos?pesquisa=${encodeURIComponent(query)}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        res.json({
            query,
            totalResults: response.data.data?.length || 0,
            results: (response.data.data || []).map(c => ({
                id: c.id,
                nome: c.nome,
                cpfCnpj: c.numeroDocumento || 'N/A',
                telefone: c.telefone || 'N/A',
                celular: c.celular || 'N/A',
                email: c.email || 'N/A'
            }))
        });

    } catch (error) {
        console.error('[BlingSearch] Error:', error.response?.data || error);
        res.status(500).json({ error: error.message });
    }
});

// DEBUG ENDPOINT: List ALL Bling clients
app.get('/debug/bling-clients', async (req, res) => {
    try {
        const blingService = require('./services/bling.service');
        const axios = require('axios');

        const token = await blingService.getValidToken();
        const allClients = [];
        let page = 1;
        let hasMore = true;

        console.log('[BlingClients] Fetching all clients from Bling...');

        while (hasMore && page <= 20) { // Limit to 20 pages (2000 clients) for safety
            await new Promise(r => setTimeout(r, 400)); // Rate limit

            const response = await axios.get(
                `https://api.bling.com.br/Api/v3/contatos?pagina=${page}&limite=100`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const clients = response.data.data || [];

            if (clients.length === 0) {
                hasMore = false;
            } else {
                allClients.push(...clients.map(c => ({
                    id: c.id,
                    nome: c.nome,
                    cpfCnpj: c.numeroDocumento || '',
                    telefone: c.telefone || '',
                    celular: c.celular || '',
                    email: c.email || ''
                })));
                page++;
            }

            console.log(`[BlingClients] Page ${page - 1}: ${clients.length} clients. Total so far: ${allClients.length}`);
        }

        console.log(`[BlingClients] Total clients fetched: ${allClients.length}`);

        res.json({
            totalClients: allClients.length,
            clients: allClients
        });

    } catch (error) {
        console.error('[BlingClients] Error:', error.response?.data || error);
        res.status(500).json({ error: error.message });
    }
});

// =========================================================================
// BLING CLIENT MAPPING ENDPOINTS
// =========================================================================

// Search Bling clients by phone OR term for the selection modal
app.get('/bling/clients/search', async (req, res) => {
    try {
        const blingService = require('./services/bling.service');
        const axios = require('axios');
        const { phone, term } = req.query;

        const token = await blingService.getValidToken();

        // 1. If No Parameters: Fetch ALL clients (paginated)
        if (!phone && !term) {
            try {
                console.log('[BlingClientSearch] Fetching all clients (paginated)...');
                const foundClients = new Map();
                let page = 1;
                let hasMore = true;

                // Paginate through all clients (max 10 pages = 1000 clients)
                while (hasMore && page <= 10) {
                    await new Promise(r => setTimeout(r, 300)); // Rate limit

                    const response = await axios.get(
                        `https://api.bling.com.br/Api/v3/contatos?pagina=${page}&limite=100`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    );

                    const clients = response.data.data || [];

                    if (clients.length === 0) {
                        hasMore = false;
                    } else {
                        for (const c of clients) {
                            foundClients.set(c.id, {
                                id: c.id,
                                nome: c.nome,
                                cpfCnpj: c.numeroDocumento || '',
                                telefone: c.telefone || '',
                                celular: c.celular || '',
                                email: c.email || ''
                            });
                        }
                        page++;
                        console.log(`[BlingClientSearch] Page ${page - 1}: ${clients.length} clients. Total: ${foundClients.size}`);
                    }
                }

                console.log(`[BlingClientSearch] Total clients fetched: ${foundClients.size}`);

                return res.json({
                    term: '',
                    phone: '',
                    totalResults: foundClients.size,
                    clients: Array.from(foundClients.values())
                });

            } catch (err) {
                console.error('[BlingClientSearch] Default fetch error:', err.message);
                return res.json({ totalResults: 0, clients: [] });
            }
        }

        const foundClients = new Map(); // Use Map to avoid duplicates

        // 1. Search by Term (Name, CPF, Email, manual Phone)
        if (term) {
            try {
                const response = await axios.get(
                    `https://api.bling.com.br/Api/v3/contatos?pesquisa=${encodeURIComponent(term)}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                const clients = response.data.data || [];
                for (const c of clients) {
                    foundClients.set(c.id, {
                        id: c.id,
                        nome: c.nome,
                        cpfCnpj: c.numeroDocumento || '',
                        telefone: c.telefone || '',
                        celular: c.celular || '',
                        email: c.email || ''
                    });
                }
            } catch (err) {
                console.error('[BlingClientSearch] Term search error:', err.message);
            }
        }

        // 2. Search by Phone (Automated variations)
        if (phone) {
            // Normalize phone (remove 55 prefix if present)
            let searchPhone = phone.replace(/\D/g, '');
            if (searchPhone.startsWith('55')) {
                searchPhone = searchPhone.substring(2);
            }

            // Search with multiple variations because Bling search is fuzzy/strict depends on field
            const variations = [
                searchPhone,
                searchPhone.slice(-8), // Last 8 digits
                searchPhone.slice(-10), // Last 10 digits
            ];

            for (const variation of variations) {
                // Rate limit slightly
                await new Promise(r => setTimeout(r, 200));

                try {
                    const response = await axios.get(
                        `https://api.bling.com.br/Api/v3/contatos?pesquisa=${encodeURIComponent(variation)}`,
                        { headers: { Authorization: `Bearer ${token}` } }
                    );

                    const clients = response.data.data || [];
                    for (const c of clients) {
                        if (!foundClients.has(c.id)) {
                            foundClients.set(c.id, {
                                id: c.id,
                                nome: c.nome,
                                cpfCnpj: c.numeroDocumento || '',
                                telefone: c.telefone || '',
                                celulares: c.celular || '',
                                email: c.email || ''
                            });
                        }
                    }
                } catch (err) {
                    // Continue on error
                }
            }
        }

        res.json({
            term,
            phone,
            totalResults: foundClients.size,
            clients: Array.from(foundClients.values())
        });

    } catch (error) {
        console.error('[BlingClientSearch] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get existing mapping for a phone
app.get('/bling/clients/mapping/:phone', async (req, res) => {
    try {
        const phone = req.params.phone.replace(/\D/g, '');

        // Try with and without 55 prefix
        const variations = [phone];
        if (phone.startsWith('55')) {
            variations.push(phone.substring(2));
        } else {
            variations.push('55' + phone);
        }

        const mapping = await CustomerBlingMapping.findOne({
            where: { customerPhone: variations }
        });

        if (mapping) {
            res.json({ found: true, mapping });
        } else {
            res.json({ found: false });
        }

    } catch (error) {
        console.error('[GetMapping] Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Save mapping between customer phone and Bling client
app.post('/bling/clients/mapping', async (req, res) => {
    try {
        const { customerPhone, blingClientId, blingClientName, blingClientCpfCnpj } = req.body;

        if (!customerPhone || !blingClientId) {
            return res.status(400).json({ error: 'customerPhone and blingClientId required' });
        }

        // Normalize phone (without 55)
        let normalizedPhone = customerPhone.replace(/\D/g, '');
        if (normalizedPhone.startsWith('55')) {
            normalizedPhone = normalizedPhone.substring(2);
        }

        // Upsert mapping
        const [mapping, created] = await CustomerBlingMapping.upsert({
            customerPhone: normalizedPhone,
            blingClientId,
            blingClientName,
            blingClientCpfCnpj
        }, {
            returning: true
        });

        console.log(`[BlingMapping] ${created ? 'Created' : 'Updated'} mapping: ${normalizedPhone} -> ${blingClientId}`);

        res.json({
            success: true,
            created,
            mapping: mapping || { customerPhone: normalizedPhone, blingClientId, blingClientName, blingClientCpfCnpj }
        });

    } catch (error) {
        console.error('[SaveMapping] Error:', error);
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
        const saneName = file.originalname.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 50);
        cb(null, 'catalog-' + saneName + '-' + uniqueSuffix + '.pdf');
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
app.post('/campaigns/:id/fix-pdf-filename', campaignController.fixPdfFilename);

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
app.delete('/orders/bulk', orderController.deleteOrders.bind(orderController)); // Bulk Delete Endpoint
app.post('/orders/:id/validate', orderController.validateOrder.bind(orderController));
app.post('/admin/fix-lili', orderController.fixLili.bind(orderController));

// Start Server
async function startServer() {
    try {
        // Sync Database
        // Attach sequelize to app for easier access if needed, though it's already imported
        app.sequelize = sequelize;

        // Check Database Connection
        await sequelize.authenticate();
        console.log('[Server] Database connection established (Migrations should have run).');

        // Logic (previously inside sync)
        const runInitialization = async () => {
            // Seed Default Admin User
            const User = require('./models/User');
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

            const server = app.listen(PORT, () => {
                console.log(`[Server] Running on port ${PORT}`);
            });

            // Set timeouts to unlimited (0 = no timeout)
            server.timeout = 0; // Request timeout
            server.keepAliveTimeout = 0; // Keep-alive timeout
            server.headersTimeout = 0; // Headers timeout
            console.log('[Server] Timeouts set to unlimited for long PDF processing');
        };

        await runInitialization();
    } catch (error) {
        console.error('[Server] Failed to start:', error);
    }
}

startServer();
