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

                // First, check if we have a saved mapping for this phone
                const CustomerBlingMapping = require('../models/CustomerBlingMapping');
                let normalizedPhone = phone;
                if (normalizedPhone.startsWith('55')) {
                    normalizedPhone = normalizedPhone.substring(2);
                }

                const existingMapping = await CustomerBlingMapping.findOne({
                    where: { customerPhone: normalizedPhone }
                });

                if (existingMapping) {
                    console.log(`[BlingService] Found saved mapping: Phone ${normalizedPhone} -> Bling Client ${existingMapping.blingClientId} (${existingMapping.blingClientName})`);
                    clientId = existingMapping.blingClientId;
                } else {
                    // No mapping - try to find or create client
                    console.log(`[BlingService] No mapping found. Searching for client: Name="${name}", Phone="${phone}"`);
                    let client = await this._findClient(token, name, phone);

                    if (client) {
                        console.log(`[BlingService] Found existing client: ID ${client.id}, Name: ${client.nome}`);
                        clientId = client.id;

                        // Save mapping for future use
                        await CustomerBlingMapping.create({
                            customerPhone: normalizedPhone,
                            blingClientId: client.id,
                            blingClientName: client.nome,
                            blingClientCpfCnpj: client.numeroDocumento || ''
                        }).catch(() => { }); // Ignore if already exists

                    } else {
                        console.log(`[BlingService] Client not found. Creating new client...`);
                        client = await this._createClient(token, {
                            nome: mainOrder.customerName || 'Cliente WhatsApp',
                            telefone: phone
                        });

                        if (client && client.id) {
                            clientId = client.id;

                            // Save mapping for future use
                            await CustomerBlingMapping.create({
                                customerPhone: normalizedPhone,
                                blingClientId: client.id,
                                blingClientName: client.nome || mainOrder.customerName,
                                blingClientCpfCnpj: ''
                            }).catch(() => { }); // Ignore if already exists
                        }
                    }
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

                // Try to extract code from [CODE] Name format OR Code - Name
                // Matches: [12345] or 12345 - 
                const codeMatch = (order.productRaw || '').match(/^(?:\[([\w-]+)\]|(\d+)\s?-)/);
                if (codeMatch) {
                    baseCode = codeMatch[1] || codeMatch[2];
                }

                // Construct a smart SKU: CODE-COLORCODE-SIZE
                // Example: 46274-120722-2
                if (baseCode) {
                    const parts = [baseCode];
                    if (order.extractedColorCode) parts.push(order.extractedColorCode);
                    if (order.extractedSize) parts.push(order.extractedSize);
                    sku = parts.join('-');
                }

                // 2. Find or Create Product (Only if not a virtual WAPP SKU)
                // We skip product creation for 'WAPP-...' SKUs to avoid cluttering Bling with 1-off products
                // and to avoid "Code already exists" validation errors on retries.
                const isVirtualSku = sku.startsWith('WAPP-');

                if (!isVirtualSku) {
                    let product = await this._findProduct(token, sku);
                    if (!product) {
                        // Create it
                        // Use productRaw as name if available, just cleaning [Code] if old format
                        let productName = order.productRaw || 'Produto WhatsApp';

                        // If old format [Code], clean it for name
                        if (productName.startsWith('[')) {
                            productName = productName.replace(/^\[[\w-]+\]\s*/, '') +
                                ((order.extractedColor || order.extractedSize) ? ` (${[order.extractedColor, order.extractedSize].filter(Boolean).join(', ')})` : '');
                        }

                        product = await this._createProduct(token, {
                            sku: sku,
                            nome: productName,
                            price: order.sellPrice || 0
                        });
                    }
                }

                // 3. Add to Order Items
                // Just use productRaw as description. It is usually well formatted by Webhook.
                let customDesc = order.productRaw || 'Produto WhatsApp';

                // Only append suffix if it's NOT already there
                if (campaignDescription && !customDesc.includes(campaignDescription)) {
                    customDesc += ` - ${campaignDescription}`;
                }

                const itemPayload = {
                    descricao: customDesc,
                    quantidade: order.quantity || 1,
                    valor: order.sellPrice || 0,
                    unidade: 'UN',
                    // Only send codigo if it's a REAL SKU (not virtual). 
                    // Virtual items are sent as text-only to preserve description and avoid validation issues.
                    codigo: isVirtualSku ? undefined : sku
                };

                // Note: We intentionally DON'T link produto.id because Bling overrides 
                // the descricao field with the product's registered name when linked.
                // By using only codigo + descricao (for real SKUs), the order will show the full productRaw.

                orderItems.push(itemPayload);
            }

            // Construct payload
            const payload = {
                data: new Date().toISOString().split('T')[0],
                itens: orderItems,
                situacao: {
                    valor: 'Em aberto' // Initial status - will change to "Atendido" when paid
                },
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
        let allCandidates = [];

        // 1. PRIMARY STRATEGY: Search by phone variations first (most reliable for deduplication)
        if (phone) {
            const variations = this._generatePhoneVariations(targetPhone);
            console.log(`[BlingService] Searching client by phone variations (${variations.length} variations)...`);

            for (const variation of variations.slice(0, 5)) { // Limit to 5 variations to avoid rate limits
                await this._sleep(350);
                try {
                    const response = await axios.get(`${this.baseUrl}/contatos?pesquisa=${encodeURIComponent(variation)}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    if (response.data.data && Array.isArray(response.data.data)) {
                        // Add to candidates, filter by phone match
                        for (const client of response.data.data) {
                            const clientPhone = (client.celular || client.telefone || '').replace(/\D/g, '');

                            // Check if phone matches
                            const phoneMatches = clientPhone === targetPhone ||
                                (targetPhone && clientPhone.endsWith(targetPhone.slice(-8))) ||
                                (clientPhone && targetPhone.endsWith(clientPhone.slice(-8)));

                            if (phoneMatches) {
                                // Avoid duplicates
                                if (!allCandidates.find(c => c.id === client.id)) {
                                    allCandidates.push(client);
                                }
                            }
                        }
                    }
                } catch (error) {
                    // Ignore search errors, continue with next variation
                }

                // If we found candidates, stop searching
                if (allCandidates.length > 0) break;
            }
        }

        // 2. SECONDARY STRATEGY: Search by name if phone search failed
        if (allCandidates.length === 0 && name) {
            await this._sleep(350);
            try {
                console.log(`[BlingService] Searching client by name: "${name}"`);
                const response = await axios.get(`${this.baseUrl}/contatos?pesquisa=${encodeURIComponent(name)}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (response.data.data && Array.isArray(response.data.data)) {
                    // Filter by phone match if we have a phone
                    for (const client of response.data.data) {
                        const clientPhone = (client.celular || client.telefone || '').replace(/\D/g, '');

                        if (targetPhone) {
                            const phoneMatches = clientPhone === targetPhone ||
                                (targetPhone && clientPhone.endsWith(targetPhone.slice(-8))) ||
                                (clientPhone && targetPhone.endsWith(clientPhone.slice(-8)));

                            if (phoneMatches && !allCandidates.find(c => c.id === client.id)) {
                                allCandidates.push(client);
                            }
                        } else {
                            // If no phone, just match by name
                            if (!allCandidates.find(c => c.id === client.id)) {
                                allCandidates.push(client);
                            }
                        }
                    }
                }
            } catch (error) {
                console.warn('[BlingService] Name search failed:', error.message);
            }
        }

        // 3. SELECT BEST CANDIDATE: Prioritize customers with CPF/CNPJ
        if (allCandidates.length === 0) {
            console.log(`[BlingService] ✗ No existing client found for "${name}" / "${phone}"`);
            return null;
        }

        if (allCandidates.length === 1) {
            console.log(`[BlingService] ✓ Found 1 client: ID ${allCandidates[0].id}, Name: ${allCandidates[0].nome}`);
            return allCandidates[0];
        }

        // Multiple candidates found - prioritize by CPF/CNPJ
        console.log(`[BlingService] Found ${allCandidates.length} candidates. Prioritizing by CPF/CNPJ...`);

        // Sort: customers with CPF/CNPJ first
        allCandidates.sort((a, b) => {
            const aHasDoc = !!(a.cpf || a.cnpj || a.numeroDocumento);
            const bHasDoc = !!(b.cpf || b.cnpj || b.numeroDocumento);

            if (aHasDoc && !bHasDoc) return -1;
            if (!aHasDoc && bHasDoc) return 1;

            // If both have or both don't have docs, prefer more recently updated
            return (b.id || 0) - (a.id || 0);
        });

        const selected = allCandidates[0];
        const hasDoc = !!(selected.cpf || selected.cnpj || selected.numeroDocumento);
        console.log(`[BlingService] ✓ Selected client: ID ${selected.id}, Name: ${selected.nome}, Has CPF/CNPJ: ${hasDoc}`);

        return selected;
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

    // =========================================================================
    // ORDER STATUS METHODS
    // =========================================================================

    /**
     * Update order status/situação in Bling
     * @param {number} blingOrderId - Bling order ID
     * @param {string} situacao - Status name (e.g., "Atendido", "Em aberto", "Cancelado")
     * @returns {boolean} - Success status
     */
    async updateOrderStatus(blingOrderId, situacao) {
        try {
            const token = await this.getValidToken();

            console.log(`[BlingService] Updating order ${blingOrderId} to status: ${situacao}`);

            await this._sleep(350); // Rate limit protection

            const response = await axios.put(
                `${this.baseUrl}/pedidos/vendas/${blingOrderId}`,
                {
                    situacao: {
                        valor: situacao
                    }
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            console.log(`[BlingService] ✓ Order ${blingOrderId} status updated to ${situacao}`);
            return true;
        } catch (error) {
            console.error(`[BlingService] Failed to update order status:`, error.response?.data || error.message);
            // Don't throw - status update failure shouldn't break the flow
            return false;
        }
    }

    /**
     * Delete an order from Bling
     * @param {number} blingOrderId - Bling order ID
     * @returns {boolean} - Success status
     */
    async deleteOrder(blingOrderId) {
        try {
            const token = await this.getValidToken();

            console.log(`[BlingService] Deleting order ${blingOrderId}...`);

            await this._sleep(350);

            await axios.delete(
                `${this.baseUrl}/pedidos/vendas/${blingOrderId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            console.log(`[BlingService] ✓ Order ${blingOrderId} deleted`);
            return true;
        } catch (error) {
            console.error(`[BlingService] Failed to delete order:`, error.response?.data || error.message);
            return false;
        }
    }
}

module.exports = new BlingService();
