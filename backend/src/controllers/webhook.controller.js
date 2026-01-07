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
            const allowedGroupId = process.env.ALLOWED_GROUP_ID;
            if (allowedGroupId) {
                if (currentChatId !== allowedGroupId) {
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

        // Fetch markup setting
        const markupPercentage = await SettingsController.getValue('markup_percentage', 35);
        const markup = 1 + (Number(markupPercentage) / 100);

        const createdOrders = [];

        for (const produto of produtos) {
            let catalogPrice = produto.preco_catalogo ? parseFloat(produto.preco_catalogo) : null;

            // If no price from AI (or text-only), try to find in our catalog by product code
            // Note: For text-only lists, AI might not extract code unless user typed it
            // We can improve this later with search by name
            if (!catalogPrice && produto.codigo) {
                console.log(`[Webhook] No price. Looking up code ${produto.codigo} in catalog...`);
                const catalogLookup = await CatalogController.getProductPrice(produto.codigo, produto.tamanho);
                if (catalogLookup) {
                    catalogPrice = parseFloat(catalogLookup);
                    console.log(`[Webhook] Found price in catalog: R$${catalogPrice}`);
                }
            }

            // 2. Fallback: Ask OpenAI Assistant (PDF Search)
            // If still no price, or if no code but we have a description
            if (!catalogPrice) {
                const query = produto.codigo ? `Código ${produto.codigo}` : produto.descricao;
                console.log(`[Webhook] Price not found locally. Asking Assistant about "${query}"...`);

                try {
                    const assistResult = await catalogAssistant.searchCatalog(query);
                    if (assistResult.encontrado && assistResult.produtos && assistResult.produtos.length > 0) {
                        const bestMatch = assistResult.produtos[0];

                        // Use size-specific price if available
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

                        // Update metadata if missing
                        if (!produto.codigo && bestMatch.codigo) produto.codigo = bestMatch.codigo;
                        if (!produto.descricao && bestMatch.nome) produto.descricao = bestMatch.nome;

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
                sellPrice = catalogPrice * markup;
                sellPrice = Math.round(sellPrice * 100) / 100;
            }

            // Build product description
            let productDescription = produto.descricao || 'Produto WhatsApp';
            if (produto.codigo) {
                productDescription = `[${produto.codigo}] ${productDescription}`;
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
                imageUrl: targetImageUrl, // Can be null for text-only orders
                quantity: produto.quantidade || 1,
                originalMessage: userText,
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
}

module.exports = new WebhookController();
