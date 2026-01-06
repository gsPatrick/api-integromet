const express = require('express');
const cors = require('cors'); // Import CORS
const sequelize = require('./config/database');
const webhookController = require('./controllers/webhook.controller');
const blingController = require('./controllers/bling.controller');
const orderController = require('./controllers/order.controller');
const authController = require('./controllers/auth.controller'); // Import AuthController
const authMiddleware = require('./middleware/auth');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Public Routes
app.post('/webhook', webhookController.handleWebhook);
app.get('/health', (req, res) => res.status(200).send('OK'));

// Auth & Integration Routes (Public for OAuth flow to work comfortably)
app.get('/auth/bling/start', authController.startBlingAuth);
app.get('/auth/bling/callback', authController.handleBlingCallback);
app.get('/integrations/status', authController.getIntegrationStatus);

// Legacy Setup Route (Optional, kept for backward compat if needed)
app.get('/setup/bling', blingController.handleSetup);

// Protected Routes (Require x-api-token)
app.use('/orders', authMiddleware);

app.get('/orders', orderController.listOrders);
app.get('/orders/:id', orderController.getOrder);
app.put('/orders/:id', orderController.updateOrder);
app.post('/orders/:id/sync-bling', orderController.syncOrderToBling);


// Start Server
async function startServer() {
    try {
        // Sync Database
        await sequelize.sync({ alter: true }); // 'alter' updates tables if models change
        console.log('[Server] Database synced successfully.');

        const User = require('./models/User'); // Import User model

        app.listen(PORT, async () => {
            console.log(`[Server] Running on port ${PORT}`);
            try {
                await sequelize.sync();
                console.log('[Server] Database synced successfully.');

                // Seed Admin User
                const admin = await User.findOne({ where: { username: 'admin' } });
                if (!admin) {
                    await User.create({ username: 'admin', password: 'admin' });
                    console.log('[Server] Admin user created automatically (admin/admin).');
                }

            } catch (error) {
                console.error('[Server] Failed to sync database:', error);
            }
        });
    } catch (error) {
        console.error('[Server] Failed to start:', error);
    }
}

startServer();
