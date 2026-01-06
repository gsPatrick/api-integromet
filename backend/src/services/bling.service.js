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
    async executeOrder(orderData) {
        try {
            const token = await this.getValidToken();

            // 1. Identify Client
            // We use the phone number as "CPF" placeholder if real CPF isn't known.
            // Ideally, the AI should extract CPF if present, but let's assume valid CPF logic or use a generic one if allowed (Bling validates CPF).
            // Since we often don't have CPF from WhatsApp, we might need a dummy or search by name?
            // Doc says: GET /contatos?numeroDocumento={CPF}

            // FALLBACK STRATEGY: 
            // Since we likely don't have the CPF from a simple photo reply, we'll try to use the phone digits.
            // WARNING: Bling validates CPF strictly for NFe. If this is just for internal control, maybe it passes.
            // For this implementation, we will try to find by customerPhone (stripping chars).
            const doc = orderData.customerPhone.replace(/\D/g, '');

            let client = await this._findClient(token, doc);

            if (!client) {
                console.log(`[BlingService] Client not found for doc ${doc}. Creating...`);
                client = await this._createClient(token, {
                    nome: orderData.customerName,
                    // If we don't have a real CPF, this creation might fail if Bling enforces valid CPF.
                    // We will attempt with the phone number, but allow failure to be caught.
                    cpfCnpj: doc,
                    telefone: orderData.customerPhone
                });
            }

            // 2. Create Order
            if (client && client.id) {
                await this._createSalesOrder(token, orderData, client.id);
            } else {
                throw new Error('Could not resolve Client ID for Bling Order');
            }

        } catch (error) {
            console.error('[BlingService] executeOrder failed:', error.message);
        }
    }

    async _findClient(token, doc) {
        try {
            const response = await axios.get(
                `${this.baseUrl}/contatos`,
                {
                    params: { numeroDocumento: doc },
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );

            if (response.data.data && response.data.data.length > 0) {
                return response.data.data[0];
            }
            return null;
        } catch (error) {
            // 404 is normal if not found? Bling V3 usually returns empty data or 404.
            return null;
        }
    }

    async _createClient(token, data) {
        try {
            const payload = {
                nome: data.nome,
                numeroDocumento: data.cpfCnpj,
                tipo: data.cpfCnpj.length > 11 ? 'J' : 'F',
                contribuinte: 9, // Não contribuinte
                telefone: data.telefone
            };

            const response = await axios.post(
                `${this.baseUrl}/contatos`,
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            return response.data.data; // Usually returns the created object with ID
        } catch (error) {
            console.error('[BlingService] Create Client Error:', error.response?.data);
            throw error;
        }
    }

    async _createSalesOrder(token, orderData, clientId) {
        console.log('[BlingService] Creating order...');
        const payload = {
            contato: { id: clientId },
            data: new Date().toISOString().split('T')[0],
            itens: [
                {
                    codigo: 'GENERICO', // Code is often required
                    descricao: orderData.productRaw || 'Produto WhatsApp',
                    quantidade: 1,
                    valor: orderData.sellPrice || 0
                }
            ],
            // Payment installments are optional but good to have logic for later
            observacoes: `Pedido Auto ID: ${orderData.id}. Tamanho: ${orderData.extractedSize}. Cor: ${orderData.extractedColor}`
        };

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

        console.log('[BlingService] Order created successfully:', response.data);
        return response.data;
    }
}

module.exports = new BlingService();
