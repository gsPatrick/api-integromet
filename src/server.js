const express = require('express');
const sequelize = require('./config/database');
const webhookController = require('./controllers/webhook.controller');
const blingController = require('./controllers/bling.controller');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON bodies (Z-API sends JSON)
app.use(express.json());

// Main Webhook
app.post('/webhook', webhookController.handleWebhook);

// Bling Setup Route
app.get('/setup/bling', blingController.handleSetup);

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Start Server
async function startServer() {
    try {
        // Sync Database
        await sequelize.sync({ alter: true }); // 'alter' updates tables if models change
        console.log('[Server] Database synced successfully.');

        app.listen(PORT, () => {
            console.log(`[Server] Running on port ${PORT}`);
        });
    } catch (error) {
        console.error('[Server] Failed to start:', error);
    }
}

startServer();
