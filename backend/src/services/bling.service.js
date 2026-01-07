const axios = require('axios');
const BlingToken = require('../models/BlingToken');
const { Op } = require('sequelize');

class BlingService {
    constructor() {
        this.clientId = process.env.BLING_CLIENT_ID;
        this.clientSecret = process.env.BLING_CLIENT_SECRET;
        this.baseUrl = 'https://api.bling.com.br/Api/v3';
        this.authUrl = 'https://www.bling.com.br/Api/v3/oauth/token';
    }

    // =========================================================================
    // AUTHENTICATION METHODS
    // =========================================================================

    /**
     * Exchanges the initial Authorization Code for tokens and saves them.
     */
    async handleInitialAuth(code) {
        console.log('[BlingService] Exchanging initial code for tokens...');
        const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

        try {
            const response = await axios.post(
                this.authUrl,
                new URLSearchParams({
                    grant_type: 'authorization_code',
                    code: code
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': `Basic ${credentials}`
                    }
                }
            );

            await this._saveTokens(response.data);
            console.log('[BlingService] Initial auth successful.');

        } catch (error) {
            console.error('[BlingService] Initial auth failed:', error.response?.data || error.message);
            throw new Error('Failed to exchange code for tokens');
        }
    }

    /**
     * Retrieves a valid access token, performing refresh if necessary.
     */
    async getValidToken() {
        // 1. Get latest token from DB
        const tokenRecord = await BlingToken.findOne({ order: [['createdAt', 'DESC']] });

        if (!tokenRecord) {
            throw new Error('No Bling tokens found. Please run /setup/bling?code=... first.');
        }

        // 2. Check expiration (give 5 min buffer)
        const now = new Date();
        const expiresAt = new Date(tokenRecord.expiresAt);
        const bufferMs = 5 * 60 * 1000;

        if (now.getTime() + bufferMs < expiresAt.getTime()) {
            // Token is still valid
            return tokenRecord.accessToken;
        }

        // 3. Token expired/expiring -> Refresh it
        console.log('[BlingService] Token expired or expiring. Refreshing...');
        return await this._refreshToken(tokenRecord.refreshToken);
    }

    async _refreshToken(refreshToken) {
        const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

        try {
            const response = await axios.post(
                this.authUrl,
                new URLSearchParams({
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': `Basic ${credentials}`
                    }
                }
            );

            await this._saveTokens(response.data);
            console.log('[BlingService] Token refreshed successfully.');
            return response.data.access_token;

        } catch (error) {
            console.error('[BlingService] Refresh failed:', error.response?.data || error.message);
            // If refresh fails (e.g., refresh token expired), we might need manual intervention
            throw new Error('CRITICAL: Failed to refresh Bling token. Manual re-authentication required.');
        }
    }

    async _saveTokens(tokenData) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + (tokenData.expires_in * 1000));

        // Upsert or just create new record? Keeping history might be useful, but let's just create new for now.
        // Ideally we might want only one active record.
        await BlingToken.destroy({ where: {} }); // Clear old tokens to keep table clean

        await BlingToken.create({
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            expiresIn: tokenData.expires_in,
            expiresAt: expiresAt
        });
    }

    // =========================================================================
    // BUSINESS LOGIC METHODS
    // =========================================================================

    /**
     * Main entry point for processing an order.
     * 1. Get Token
     * 2. Find/Create Client
     * 3. Create Order
     */
    async executeOrder(ordersInput) {
        try {
            const token = await this.getValidToken();

            // Normalize to array
            const orders = Array.isArray(ordersInput) ? ordersInput : [ordersInput];
            if (orders.length === 0) return;

            // Use the first order for customer info
            const mainOrder = orders[0];

            // Fetch campaign description setting
            const SettingsController = require('../controllers/settings.controller');
            const campaignDescription = await SettingsController.getValue('campaign_description', '');

            // Try to find or create client
            let clientId = null;
            try {
                const phone = (mainOrder.customerPhone || '').replace(/\D/g, '');
                console.log(`[BlingService] Searching for client with phone: ${phone}`);
                let client = await this._findClient(token, phone);

                if (client) {
                    console.log(`[BlingService] Found existing client: ID ${client.id}, Name: ${client.nome}`);
                } else {
                    console.log(`[BlingService] Client not found. Creating new client...`);
                    client = await this._createClient(token, {
                        nome: mainOrder.customerName || 'Cliente WhatsApp',
                        telefone: phone
                    });
                }

                if (client && client.id) {
                    clientId = client.id;
                }
            } catch (clientError) {
                console.warn('[BlingService] Could not find/create client, proceeding without:', clientError.message);
            }

            // Construct payload with multiple items
            const payload = {
                data: new Date().toISOString().split('T')[0],
                itens: orders.map(order => {
                    // Build description with campaign info if available
                    let descricao = order.productRaw || 'Produto WhatsApp';
                    descricao += ` (Cor: ${order.extractedColor || '-'})`;
                    if (campaignDescription) {
                        descricao += ` - ${campaignDescription}`;
                    }

                    return {
                        codigo: 'WAPP-' + (order.id || '0'),
                        descricao: descricao,
                        quantidade: order.quantity || 1,
                        valor: order.sellPrice || 0,
                        unidade: 'UN'
                    };
                }),
                observacoes: `Pedido via WhatsApp. IDs: ${orders.map(o => o.id).join(', ')}. Cliente: ${mainOrder.customerName}${campaignDescription ? `. Campanha: ${campaignDescription}` : ''}`
            };

            if (clientId) {
                payload.contato = { id: clientId };
            }

            const response = await axios.post(
                `${this.baseUrl}/pedidos/vendas`,
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            console.log('[BlingService] Order created successfully with items:', orders.length);
            return response.data;

        } catch (error) {
            console.error('[BlingService] executeOrder failed:', JSON.stringify(error.response?.data || error.message, null, 2));
            throw error;
        }
    }

    // =========================================================================
    // CLIENT METHODS
    // =========================================================================

    async _findClient(token, phone) {
        if (!phone) return null;

        // Clean the phone number - remove all non-digits
        const cleanPhone = phone.replace(/\D/g, '');

        // Generate all possible variations
        const variations = this._generatePhoneVariations(cleanPhone);
        console.log(`[BlingService] Trying ${variations.length} phone variations:`, variations);

        for (const variation of variations) {
            try {
                const response = await axios.get(`${this.baseUrl}/contatos?pesquisa=${variation}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.data.data && response.data.data.length > 0) {
                    console.log(`[BlingService] ✓ Found client with variation: ${variation}`);
                    return response.data.data[0];
                }
            } catch (error) {
                // Continue to next variation
            }
        }

        console.log(`[BlingService] ✗ No client found with any phone variation`);
        return null;
    }

    /**
     * Generate all possible phone number variations for Brazil
     * Example input: 5511999998888
     * Variations: 5511999998888, 11999998888, 55119999988, 119999988, etc.
     */
    _generatePhoneVariations(phone) {
        const variations = new Set();

        // Add original
        variations.add(phone);

        // If starts with 55 (Brazil country code), try without it
        if (phone.startsWith('55') && phone.length >= 12) {
            const withoutCountry = phone.substring(2);
            variations.add(withoutCountry);

            // If has 9th digit (cell phones), try without it
            // Format: DDD (2 digits) + 9 + 8 digits = 11 digits without country code
            if (withoutCountry.length === 11 && withoutCountry[2] === '9') {
                const without9 = withoutCountry.substring(0, 2) + withoutCountry.substring(3);
                variations.add(without9);
                variations.add('55' + without9);
            }

            // Try adding 9 if missing (older numbers)
            if (withoutCountry.length === 10) {
                const with9 = withoutCountry.substring(0, 2) + '9' + withoutCountry.substring(2);
                variations.add(with9);
                variations.add('55' + with9);
            }
        }

        // If doesn't start with 55, try adding it
        if (!phone.startsWith('55')) {
            variations.add('55' + phone);

            // Handle the 9th digit variations
            if (phone.length === 11 && phone[2] === '9') {
                const without9 = phone.substring(0, 2) + phone.substring(3);
                variations.add(without9);
                variations.add('55' + without9);
            }

            if (phone.length === 10) {
                const with9 = phone.substring(0, 2) + '9' + phone.substring(2);
                variations.add(with9);
                variations.add('55' + with9);
            }
        }

        return Array.from(variations);
    }

    async _createClient(token, clientData) {
        const payload = {
            nome: clientData.nome || 'Cliente WhatsApp',
            tipo: 'F', // Fisica
            situacao: 'A', // Ativo
        };

        if (clientData.telefone) {
            payload.celular = clientData.telefone;
        }

        try {
            console.log('[BlingService] Creating client:', payload);
            const response = await axios.post(`${this.baseUrl}/contatos`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            return response.data.data;
        } catch (error) {
            console.error('[BlingService] Failed to create client:', JSON.stringify(error.response?.data || error.message, null, 2));
            throw error;
        }
    }
}

module.exports = new BlingService();
