const MessageLog = require('../models/MessageLog');
const Order = require('../models/Order');
const MessageContext = require('../models/MessageContext');
const whatsappService = require('../services/whatsapp.service');
const aiService = require('../services/ai.service');
const sheetsService = require('../services/sheets.service');
const blingService = require('../services/bling.service');
const storageService = require('../services/storage.service');
const CatalogController = require('./catalog.controller');
const SettingsController = require('./settings.controller');
const Campaign = require('../models/Campaign');
const catalogAssistant = require('../services/catalogAssistant.service'); // Fallback

class WebhookController {
    // ... (rest of class)

    // ... (inside processMessagePayload loop)


    constructor() {
        this.handleWebhook = this.handleWebhook.bind(this);
        this.processMessagePayload = this.processMessagePayload.bind(this);
    }

    async handleWebhook(req, res) {
        try {
            const payload = req.body;
            console.log('---------------------------------------------------');

            // 1. DISCOVERY LOG
            const chatName = payload.chatName || payload.senderName || 'Desconhecido';
            const currentChatId = payload.chatId || payload.phone;
            console.log(`[NOVA MENSAGEM] Chat: "${chatName}" | ID: "${currentChatId}"`);

            // 2. SECURITY WHITELIST
            // 2. SECURITY WHITELIST
            const allowedGroupIds = process.env.ALLOWED_GROUP_ID ? process.env.ALLOWED_GROUP_ID.split(',') : [];

            if (allowedGroupIds.length > 0) {
                if (!allowedGroupIds.includes(currentChatId)) {
                    console.log(`[IGNORADO] Mensagem de chat não autorizado: ${currentChatId}`);
                    return res.status(200).send('IGNORED_UNAUTHORIZED');
                }
            } else {
                console.log('[DEBUG] ALLOWED_GROUP_ID não configurado. Aceitando todas as mensagens.');
            }

            console.log('[Webhook] Received payload:', JSON.stringify(payload, null, 2));

            // Delegate processing
            const result = await this.processMessagePayload(payload);

            return res.status(200).send(result);

        } catch (error) {
            console.error('[Webhook] Critical Error:', error);
            return res.status(500).send('ERROR');
        }
    }

    async processMessagePayload(payload) {
        // ---------------------------------------------------------
        // 1. BASIC VALIDATION & LOGGING
        // ---------------------------------------------------------
        if (!payload.messageId || !payload.phone) {
            console.warn('[Webhook] Ignoring invalid payload (missing ID or phone)');
            return 'IGNORED';
        }

        // Duplicate check
        const existing = await MessageLog.findByPk(payload.messageId);
        if (existing) {
            console.log('[Webhook] Duplicate message ignored:', payload.messageId);
            return 'DUPLICATE';
        }

        // Save to MessageLog (Historical)
        await MessageLog.create({
            messageId: payload.messageId,
            chatId: payload.chatId || payload.phone,
            senderPhone: payload.phone,
            content: payload.text ? payload.text.message : (payload.image ? payload.image.caption : null),
            imageUrl: payload.image ? payload.image.imageUrl : null,
            hasImage: !!payload.image,
            jsonPayload: payload
        });
        console.log('[Webhook] Message logged to DB.');

        // ---------------------------------------------------------
        // 2. SAVE TO CONTEXT
        // ---------------------------------------------------------
        await MessageContext.create({
            customerPhone: payload.phone,
            groupId: payload.chatId !== payload.phone ? payload.chatId : null,
            messageId: payload.messageId,
            messageType: payload.image ? 'image' : 'text',
            textContent: payload.text ? payload.text.message : (payload.image ? payload.image.caption : null),
            imageUrl: payload.image ? payload.image.imageUrl : null,
            quotedMessageId: payload.context ? payload.context.quotedMessageId : null
        });
        console.log('[Webhook] Message saved to Context DB.');

        // ---------------------------------------------------------
        // 3. DETERMINE PROCESSING STRATEGY
        // ---------------------------------------------------------
        let aiResult = null;
        let targetImageUrl = null;
        const userText = payload.text ? payload.text.message : (payload.image ? payload.image.caption : '');

        // CASE A: Direct Image (with or without caption)
        if (payload.image) {
            targetImageUrl = payload.image.imageUrl;
            console.log('[Webhook] Processing IMAGE message...');
            aiResult = await aiService.analyzeMessage(targetImageUrl, userText);
        }
        // CASE B: Text Message (Standalone or Reply)
        else if (payload.text) {
            console.log('[Webhook] Processing TEXT message...');

            // Fetch recent context (last 5 messages)
            const contextMessages = await MessageContext.getRecentContext(payload.phone, 5);

            aiResult = await aiService.analyzeTextOrder(userText, contextMessages);

            // If it refers to previous image, we need that image URL for order record
            if (aiResult.referencia_imagem_anterior) {
                const lastImage = contextMessages.find(m => m.imageUrl && m.messageType !== 'text');
                if (lastImage) {
                    targetImageUrl = lastImage.imageUrl;
                    console.log('[Webhook] Associated with previous image:', targetImageUrl);
                }
            }
        } else {
            console.log('[Webhook] Unknown message type. Skipping.');
            return 'SKIPPED_UNKNOWN_TYPE';
        }

        // ---------------------------------------------------------
        // 4. CHECK INTENT & PROCESS ORDERS
        // ---------------------------------------------------------
        if (!aiResult || !aiResult.intencao_compra) {
            console.log('[Webhook] AI detected NO purchase intent. Finished.');
            return 'OK_NO_INTENT';
        }

        console.log('[Webhook] AI detected PURCHASE INTENT!');
        console.log('[Webhook] AI observation:', aiResult.observacao || 'N/A');

        const produtos = aiResult.produtos || [];

        if (produtos.length === 0) {
            console.log('[Webhook] No products in AI response. Skipping.');
            return 'OK_NO_PRODUCTS';
        }

        console.log(`[Webhook] Creating ${produtos.length} order(s)...`);

        // ---------------------------------------------------------
        // 5. RESOLVE CAMPAIGN & CONTEXT
        // ---------------------------------------------------------
        const chatTargetId = payload.chatId || payload.phone;
        const candidates = await this._getActiveCampaigns(chatTargetId);

        // Strategy: Default to the most recently created candidate for "General Context"
        // But for each product, we might try to be more specific if possible.
        // For now, we'll use the Primary Candidate (index 0, sorted by ID DESC) for Markup/Collection Name

        let primaryCampaign = null;
        let campaignId = null;
        let markupPercentage = 35;
        let collectionName = '';

        if (candidates.length > 0) {
            primaryCampaign = candidates[0]; // Most recent
            campaignId = primaryCampaign.id;
            markupPercentage = primaryCampaign.markupPercentage ?? 35;
            collectionName = primaryCampaign.name;

            if (candidates.length > 1) {
                console.log(`[Webhook] ⚠️ Multiple Active Campaigns found for ${chatTargetId}: [${candidates.map(c => c.name).join(', ')}]`);

                // Fallback Logic requested by User: Default to Campaign ID 18 if ambiguous
                console.log(`[Webhook] Ambiguity detected. Defaulting to Campaign ID 18 (Safe Harbor).`);

                campaignId = 18;
                const safeCampaign = await Campaign.findByPk(18);
                if (safeCampaign) {
                    collectionName = safeCampaign.name;
                    markupPercentage = safeCampaign.markupPercentage ?? 35;
                } else {
                    collectionName = 'Campanha Padrão (18)';
                    markupPercentage = 35;
                }

                // Still use the candidate names for AI Context to help identification
                const candidatesNames = candidates.map(c => c.name).join(' ou ');
                collectionName = `${collectionName} (Contexto: ${candidatesNames})`;

            } else {
                console.log(`[Webhook] Active Campaign: "${primaryCampaign.name}" (ID: ${primaryCampaign.id})`);
            }
        } else {
            // No matching active campaign - try to find default "Pronta Entrega" campaign
            console.log(`[Webhook] No Active Campaign for ${chatTargetId}. Looking for default campaign...`);

            const defaultCampaign = await Campaign.findOne({ where: { isDefault: true } });

            if (defaultCampaign) {
                primaryCampaign = defaultCampaign;
                campaignId = defaultCampaign.id;
                markupPercentage = defaultCampaign.markupPercentage ?? 35;
                collectionName = defaultCampaign.name;
                console.log(`[Webhook] Using default campaign: "${defaultCampaign.name}" (ID: ${defaultCampaign.id})`);
            } else {
                // Final fallback to Global Settings
                markupPercentage = await SettingsController.getValue('markup_percentage', 35);
                collectionName = await SettingsController.getValue('campaign_description', '');
                console.log(`[Webhook] No default campaign found. Using Global Settings.`);
            }
        }

        const markup = 1 + (Number(markupPercentage) / 100);

        const createdOrders = [];

        for (const produto of produtos) {
            let catalogPrice = produto.preco_catalogo ? parseFloat(produto.preco_catalogo) : null;

            // If no price from AI (or text-only), try to find in our catalog by product code
            // Note: For text-only lists, AI might not extract code unless user typed it
            // We can improve this later with search by name
            if (!catalogPrice && produto.codigo) {
                // If we have candidates, try to find strictly in their catalogs first
                // If multiple candidates, we iterate? Or just pass "null" campaignId to search ALL?
                // Ideally search specifically.

                if (candidates.length > 0) {
                    for (const cand of candidates) {
                        console.log(`[Webhook] Looking up code ${produto.codigo} in Campaign "${cand.name}" (ID: ${cand.id})...`);
                        const lookup = await CatalogController.getProductPrice(produto.codigo, produto.tamanho, cand.id);
                        if (lookup) {
                            catalogPrice = parseFloat(lookup);
                            campaignId = cand.id; // Correctly assign order to THIS campaign
                            markupPercentage = cand.markupPercentage ?? 35; // Update markup to match this campaign
                            console.log(`[Webhook] Found in Campaign "${cand.name}"! Price: R$${catalogPrice}`);
                            break; // Stop looking
                        }
                    }
                } else {
                    // Global lookup
                    console.log(`[Webhook] Looking up code ${produto.codigo} globally...`);
                    const lookup = await CatalogController.getProductPrice(produto.codigo, produto.tamanho);
                    if (lookup) catalogPrice = parseFloat(lookup);
                }
            }

            // 2. Fallback: Ask OpenAI Assistant (PDF Search)
            // Trigger if: No price locally OR We suspect missing color details (have color name but no code)
            const needsAssistant = !catalogPrice || (!produto.codigo_cor && (produto.cor || produto.tamanho));

            if (needsAssistant) {
                let query = produto.codigo ? `Código ${produto.codigo}` : produto.descricao;
                if (produto.codigo_cor) query += ` cor ${produto.codigo_cor}`;
                if (produto.tamanho) query += ` tamanho ${produto.tamanho}`;

                console.log(`[Webhook] Needs more info (Price/ColorCode). Asking Assistant about "${query}" in context of "${collectionName}"...`);

                try {
                    const assistResult = await catalogAssistant.searchCatalog(query, collectionName);
                    if (assistResult.encontrado && assistResult.produtos && assistResult.produtos.length > 0) {
                        const bestMatch = assistResult.produtos[0];

                        // Use size-specific price if available
                        if (!catalogPrice) {
                            if (bestMatch.tamanhos_precos && produto.tamanho) {
                                // Simple logic to match size (can be improved)
                                const sizeKey = Object.keys(bestMatch.tamanhos_precos).find(k => k.includes(produto.tamanho));
                                if (sizeKey) {
                                    catalogPrice = bestMatch.tamanhos_precos[sizeKey];
                                } else {
                                    catalogPrice = bestMatch.preco;
                                }
                            } else {
                                catalogPrice = bestMatch.preco;
                            }
                        }

                        // Update metadata if missing
                        if (!produto.codigo && bestMatch.codigo) produto.codigo = bestMatch.codigo;
                        if (!produto.descricao && bestMatch.nome) produto.descricao = bestMatch.nome;

                        // Capture Color Code if AI found it
                        if (!produto.codigo_cor && bestMatch.codigo_cor) {
                            produto.codigo_cor = bestMatch.codigo_cor;
                            console.log(`[Webhook] Assistant found Color Code: ${produto.codigo_cor}`);
                        }

                        // RE-VERIFY CAMPAIGN IF CODE FOUND
                        // If AI found a code that we didn't have, check which campaign it belongs to
                        if (bestMatch.codigo && candidates.length > 0) {
                            for (const cand of candidates) {
                                // Light check against local DB to see if this code exists in this campaign
                                const exists = await CatalogController.getProductPrice(bestMatch.codigo, null, cand.id);
                                if (exists) {
                                    campaignId = cand.id;
                                    markupPercentage = cand.markupPercentage ?? 35;
                                    collectionName = cand.name;
                                    console.log(`[Webhook] AI matched product code ${bestMatch.codigo} validated in Campaign "${cand.name}". Switching context.`);
                                    break;
                                }
                            }
                        }

                        console.log(`[Webhook] Assistant found product! Price: R$${catalogPrice}`);
                    } else {
                        console.log('[Webhook] Assistant could not find the product.');
                    }
                } catch (err) {
                    console.error('[Webhook] Assistant search error:', err.message);
                }
            }

            let sellPrice = null;
            if (catalogPrice) {
                // Re-calculate markup in case it changed due to campaign switching above
                const finalMarkup = 1 + (Number(markupPercentage) / 100);
                sellPrice = catalogPrice * finalMarkup;
                sellPrice = Math.round(sellPrice * 100) / 100;
            }

            // Build product description
            // Format: 2000711 - Jaqueta Nylon (Tam: 2),(Cor: 0452 Off White) - Milon Inverno Jan 26
            // collectionName is already resolved from Campaign or Settings above
            let productDescription = '';

            if (produto.codigo) {
                productDescription += `${produto.codigo} - `;
            }

            productDescription += produto.descricao || 'Produto WhatsApp';

            if (produto.tamanho) {
                productDescription += ` (Tam: ${produto.tamanho})`;
            }

            const colorParts = [];
            if (produto.codigo_cor) colorParts.push(produto.codigo_cor);
            if (produto.cor) colorParts.push(produto.cor);

            if (colorParts.length > 0) {
                productDescription += `,(Cor: ${colorParts.join(' ')})`;
            }

            if (collectionName) {
                productDescription += ` - ${collectionName}`;
            }

            // Create order
            const newOrder = await Order.create({
                customerName: payload.senderName || 'Unknown',
                customerPhone: payload.participantPhone || payload.phone,
                productRaw: productDescription,
                extractedSize: produto.tamanho,
                extractedColor: produto.cor,
                extractedColorCode: produto.codigo_cor,
                catalogPrice: catalogPrice,
                sellPrice: sellPrice,
                quantity: produto.quantidade || 1,
                originalMessage: userText,
                campaignId: campaignId,
                status: 'PENDING'
            });

            createdOrders.push(newOrder);
            console.log(`[Webhook] Order #${newOrder.id} created for: ${productDescription} | Price: ${catalogPrice ? 'R$' + catalogPrice : 'N/A'}`);
        }

        // Download and save image locally (only if there IS an image associated)
        if (targetImageUrl && createdOrders.length > 0) {
            const localImagePath = await storageService.downloadAndSaveImage(targetImageUrl, createdOrders[0].id);
            if (localImagePath) {
                // Update all orders with the same local image path
                for (const order of createdOrders) {
                    await order.update({ imageUrl: localImagePath });
                }
                console.log(`[Webhook] Image saved locally: ${localImagePath}`);
            }
        }

        // ---------------------------------------------------------
        // 5. INTEGRATIONS 
        // ---------------------------------------------------------
        for (const order of createdOrders) {
            try {
                await sheetsService.appendOrder(order);
            } catch (sheetError) {
                console.warn('[Webhook] Sheets integration failed (non-blocking):', sheetError.message);
            }
        }

        return `ORDERS_CREATED:${createdOrders.length}`;
    }

    // ==========================================================================
    // ASAAS WEBHOOK - Payment Confirmation
    // ==========================================================================

    /**
     * Handle Asaas payment webhooks
     * POST /webhook/asaas
     * Events: PAYMENT_RECEIVED, PAYMENT_CONFIRMED
     */
    async handleAsaasWebhook(req, res) {
        const asaasService = require('../services/asaas.service');
        const blingService = require('../services/bling.service');
        const SettingsController = require('./settings.controller');

        try {
            const { event, payment } = req.body;

            console.log(`[AsaasWebhook] Received event: ${event}`);
            console.log(`[AsaasWebhook] Payment ID: ${payment?.id}, Reference: ${payment?.externalReference}`);

            // Validate webhook token (optional but recommended)
            const receivedToken = req.headers['asaas-access-token'];
            if (receivedToken) {
                const isValid = await asaasService.validateWebhookToken(receivedToken);
                if (!isValid) {
                    console.warn('[AsaasWebhook] Invalid token received');
                    return res.status(401).json({ error: 'Unauthorized' });
                }
            }

            // Only process payment confirmation events
            if (event !== 'PAYMENT_RECEIVED' && event !== 'PAYMENT_CONFIRMED') {
                console.log(`[AsaasWebhook] Ignoring event: ${event}`);
                return res.status(200).json({ received: true });
            }

            // Extract order ID from externalReference
            const orderId = payment?.externalReference;

            if (!orderId) {
                console.warn('[AsaasWebhook] No externalReference in payment');
                return res.status(200).json({ received: true, warning: 'No externalReference' });
            }

            // Find order(s) with multiple strategies:

            // 1. Try by direct Charge ID (pay_...) - stored in asaasId
            let orders = await Order.findAll({
                where: { asaasId: payment.id }
            });

            // 2. If valid paymentLink ID exists (lpg_...) - stored in asaasId
            if (orders.length === 0 && payment.paymentLink) {
                console.log(`[AsaasWebhook] Searching by Payment Link ID: ${payment.paymentLink}`);
                orders = await Order.findAll({
                    where: { asaasId: payment.paymentLink } // We stored lpg_xxx here
                });
            }

            // 3. Try by externalReference (Order ID)
            if (orders.length === 0 && orderId) {
                console.log(`[AsaasWebhook] Searching by externalReference: ${orderId}`);
                const order = await Order.findByPk(orderId);
                if (order) {
                    orders = [order];
                }
            }

            // 4. Fallback: Try regex on Description (Pedido #123) details
            if (orders.length === 0 && payment.description) {
                const match = payment.description.match(/Pedido #(\d+)/);
                if (match) {
                    const extractedId = match[1];
                    console.log(`[AsaasWebhook] Searching by Description RegEx: ${extractedId}`);
                    const order = await Order.findByPk(extractedId);
                    if (order) {
                        orders = [order];
                    }
                }
            }

            if (orders.length === 0) {
                console.warn(`[AsaasWebhook] No orders found for reference: ${orderId}`);
                return res.status(200).json({ received: true, warning: 'Order not found' });
            }

            console.log(`[AsaasWebhook] Found ${orders.length} order(s) to update`);

            // Update orders to PAID
            for (const order of orders) {
                order.status = 'PAID';
                await order.save();
                console.log(`[AsaasWebhook] Order #${order.id} marked as PAID`);

                // Update Bling status if we have blingId
                if (order.blingId) {
                    const blingStatusPaid = await SettingsController.getValue('bling_id_status_paid', 'Atendido');

                    try {
                        await blingService.updateOrderStatus(order.blingId, blingStatusPaid);
                        console.log(`[AsaasWebhook] Bling order ${order.blingId} updated to ${blingStatusPaid}`);
                    } catch (blingError) {
                        console.error(`[AsaasWebhook] Failed to update Bling:`, blingError.message);
                        // Continue - Bling update failure shouldn't break the flow
                    }
                }
            }

            res.status(200).json({
                received: true,
                ordersUpdated: orders.length,
                event: event
            });

        } catch (error) {
            console.error('[AsaasWebhook] Error:', error);
            res.status(500).json({ error: 'Internal error' });
        }
    }
    /**
     * Helper to find active campaigns for a specific chat ID (Group or Private)
     */
    async _getActiveCampaigns(targetId) {
        try {
            const allActive = await Campaign.findAll({
                where: { isActive: true },
                order: [['id', 'DESC']] // Most recent first
            });

            // Filter in memory because targetGroups is JSON
            const matched = allActive.filter(c => {
                const groups = c.targetGroups;

                // If targetGroups is null/empty, we treat it as Global/All ?? 
                // Or maybe strictly for no-group? 
                // User requirement: "escolher o grupo". If none selected, assume Global?
                // Let's assume: If groups is empty, it applies to ALL (Global fallback).
                // OR: If user didn't select groups, maybe it's legacy/global.

                if (!groups || !Array.isArray(groups) || groups.length === 0) return true;

                return groups.includes(targetId);
            });

            return matched;

        } catch (error) {
            console.error('[Webhook] Error getting active campaigns:', error);
            return [];
        }
    }

}

module.exports = new WebhookController();
