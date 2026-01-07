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

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files (uploaded images)
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Public Routes
app.post('/webhook', webhookController.handleWebhook);
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
app.post('/customers/:phone/sync', CustomerController.syncCustomerOrders);

// Protected Routes (Require x-api-token)
app.use('/orders', authMiddleware);

app.get('/orders', orderController.listOrders);
app.get('/orders/:id', orderController.getOrder);
app.put('/orders/:id', orderController.updateOrder);
app.post('/orders/:id/sync-bling', orderController.syncOrderToBling.bind(orderController));

// Start Server
async function startServer() {
    try {
        // Sync Database
        await sequelize.sync({ force: false }); // CHANGED: Prevent data loss
        console.log('[Server] Database synced (force: false).');

        // Seed Admin User
        try {
            const admin = await User.findOne({ where: { username: 'admin' } });
            if (!admin) {
                await User.create({ username: 'admin', password: 'admin' });
                console.log('[Server] Admin user created automatically (admin/admin).');
            }
        } catch (seedError) {
            console.error('[Server] Failed to seed admin user (non-critical):', seedError.message);
        }

        app.listen(PORT, () => {
            console.log(`[Server] Running on port ${PORT}`);
        });

    } catch (error) {
        console.error('[Server] Failed to start:', error);
    }
}

startServer();
