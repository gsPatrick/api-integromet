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
                const name = mainOrder.customerName || '';
                console.log(`[BlingService] Searching for client: Name="${name}", Phone="${phone}"`);
                let client = await this._findClient(token, name, phone);

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

            // Process items and ensure products exist in Bling
            const orderItems = [];

            for (const order of orders) {
                // 1. Generate SKU
                let sku = 'WAPP-' + order.id;
                let baseCode = null;

                // Try to extract code from [CODE] Name format
                const codeMatch = (order.productRaw || '').match(/^\[([\w-]+)\]/);
                if (codeMatch) {
                    baseCode = codeMatch[1];
                }

                // Construct a smart SKU: CODE-COLORCODE-SIZE
                // Example: 46274-120722-2
                if (baseCode) {
                    const parts = [baseCode];
                    if (order.extractedColorCode) parts.push(order.extractedColorCode);
                    if (order.extractedSize) parts.push(order.extractedSize);
                    sku = parts.join('-');
                }

                // 2. Find or Create Product
                let product = await this._findProduct(token, sku);
                if (!product) {
                    // Create it
                    const details = [];
                    if (order.extractedColor) details.push(`Cor: ${order.extractedColor}`);
                    if (order.extractedSize) details.push(`Tam: ${order.extractedSize}`);

                    const productName = (order.productRaw || 'Produto WhatsApp').replace(/^\[[\w-]+\]\s*/, '') +
                        (details.length > 0 ? ` (${details.join(', ')})` : '');

                    product = await this._createProduct(token, {
                        sku: sku,
                        nome: productName,
                        price: order.sellPrice || 0
                    });
                }

                // 3. Add to Order Items
                const itemPayload = {
                    descricao: (order.productRaw || 'Produto WhatsApp'), // Keep original desc for reference
                    quantidade: order.quantity || 1,
                    valor: order.sellPrice || 0,
                    unidade: 'UN'
                };

                if (product && product.id) {
                    itemPayload.produto = { id: product.id };
                } else {
                    itemPayload.codigo = sku; // Fallback to code if ID missing (shouldn't happen)
                }

                orderItems.push(itemPayload);
            }

            // Construct payload
            const payload = {
                data: new Date().toISOString().split('T')[0],
                itens: orderItems,
                observacoes: `Pedido via WhatsApp. IDs: ${orders.map(o => o.id).join(', ')}. Cliente: ${mainOrder.customerName}${campaignDescription ? `. Campanha: ${campaignDescription}` : ''}`
            };

            if (clientId) {
                payload.contato = { id: clientId };
            }

            await this._sleep(350); // Rate limit protection
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

    async _findClient(token, name, phone) {
        if (!name && !phone) return null;

        // Clean target phone for comparison
        const targetPhone = phone ? phone.replace(/\D/g, '') : '';

        // 1. Search by Name (primary strategy since phone search is unreliable in 'pesquisa')
        if (name) {
            await this._sleep(350);
            try {
                console.log(`[BlingService] Searching client by name: "${name}"`);
                const response = await axios.get(`${this.baseUrl}/contatos?pesquisa=${encodeURIComponent(name)}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.data.data && Array.isArray(response.data.data)) {
                    // Client-side filtering by phone
                    const match = response.data.data.find(client => {
                        const clientPhone = (client.celular || '').replace(/\D/g, '');
                        // Check if phone matches (allowing partial match if one is 11 and other is 10 chars, etc, best effort)
                        // Or strict equality of sanitized numbers
                        return clientPhone === targetPhone ||
                            (targetPhone && clientPhone.endsWith(targetPhone)) ||
                            (clientPhone && targetPhone.endsWith(clientPhone));
                    });

                    if (match) {
                        console.log(`[BlingService] ✓ Found client by name "${name}" with matching phone: ${match.celular}`);
                        return match;
                    }
                }
            } catch (error) {
                console.warn('[BlingService] Name search failed or empty:', error.message);
            }
        }

        // 2. Fallback: Search by Phone (if name strategy failed, though we know 'pesquisa' by phone is weak)
        // We keep this just in case Bling improves indexing or for specific number formats
        if (phone) {
            const cleanPhone = phone.replace(/\D/g, '');
            const variations = this._generatePhoneVariations(cleanPhone);

            for (const variation of variations) {
                await this._sleep(350);
                try {
                    const response = await axios.get(`${this.baseUrl}/contatos?pesquisa=${variation}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    if (response.data.data && response.data.data.length > 0) {
                        console.log(`[BlingService] ✓ Found client with variation: ${variation}`);
                        return response.data.data[0];
                    }
                } catch (e) { }
            }
        }

        console.log(`[BlingService] ✗ No existing client found for "${name}" / "${phone}"`);
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

        // Add formatted variations for better search matching
        // Iterate over current plain variations to create formatted ones
        for (const v of Array.from(variations)) {
            // We only format numbers clearly looking like BR phones without country code (10 or 11 digits)
            let raw = v;
            if (raw.startsWith('55') && raw.length >= 12) raw = raw.substring(2);

            if (raw.length === 10) {
                // (11) 2222-3333
                variations.add(`(${raw.substring(0, 2)}) ${raw.substring(2, 6)}-${raw.substring(6)}`);
            } else if (raw.length === 11) {
                // (11) 92222-3333
                variations.add(`(${raw.substring(0, 2)}) ${raw.substring(2, 7)}-${raw.substring(7)}`);
            }
        }

        return Array.from(variations);
    }

    async _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async _createClient(token, clientData) {
        await this._sleep(350); // Rate limit protection

        const payload = {
            nome: clientData.nome || 'Cliente WhatsApp',
            tipo: 'F', // Fisica
            situacao: 'A', // Ativo
        };

        if (clientData.telefone) {
            // Bling expects DDD + Number (10 or 11 digits). No Country Code.
            // If we have 12 or 13 chars and starts with 55, strip.
            let phone = clientData.telefone.replace(/\D/g, '');
            if (phone.startsWith('55') && phone.length >= 12) {
                phone = phone.substring(2);
            }
            payload.celular = phone;
        }

        try {
            console.log('[BlingService] Creating client:', payload);
            const response = await axios.post(`${this.baseUrl}/contatos`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            return response.data.data;
        } catch (error) {
            console.error('[BlingService] Failed to create client:', JSON.stringify(error.response?.data || error.message, null, 2));
            // Don't throw, just return null so we can proceed without client binding if needed
            return null;
        }
    }

    // =========================================================================
    // PRODUCT METHODS
    // =========================================================================

    async _findProduct(token, sku) {
        await this._sleep(350);
        try {
            const response = await axios.get(`${this.baseUrl}/produtos?codigo=${sku}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.data && response.data.data.length > 0) {
                return response.data.data[0];
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    async _createProduct(token, productData) {
        await this._sleep(350);

        const payload = {
            nome: productData.nome,
            codigo: productData.sku,
            preco: productData.price || 0,
            tipo: 'P', // Produto
            situacao: 'A', // Ativo
            formato: 'S' // Simples
        };

        if (productData.description) {
            payload.descricaoCurta = productData.description;
        }

        try {
            console.log(`[BlingService] Creating product: ${productData.sku}`);
            const response = await axios.post(`${this.baseUrl}/produtos`, payload, {
                headers: { Authorization: `Bearer ${token}` }
            });
            return response.data.data;
        } catch (error) {
            const errorData = error.response?.data?.error;
            const errorMsg = JSON.stringify(errorData || error.message);

            // If error is "Product already exists", ignore it and proceed
            if (errorMsg.includes('já existe') || errorMsg.includes('already exists')) {
                console.warn(`[BlingService] Product ${productData.sku} already exists (trap). Fetching ID...`);
                // Fetch the existing product to get its ID
                const existing = await this._findProduct(token, productData.sku);
                if (existing) {
                    return existing;
                }
                // If somehow not found (race condition?), return mock with code
                return { id: 0, codigo: productData.sku };
            }

            console.error('[BlingService] Failed to create product:', JSON.stringify(error.response?.data || error.message, null, 2));
            throw error;
        }
    }
}

module.exports = new BlingService();
