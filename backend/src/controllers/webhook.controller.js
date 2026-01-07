const MessageLog = require('../models/MessageLog');
const Order = require('../models/Order');
const whatsappService = require('../services/whatsapp.service');
const aiService = require('../services/ai.service');
const sheetsService = require('../services/sheets.service');
const blingService = require('../services/bling.service');
const storageService = require('../services/storage.service');

class WebhookController {

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

        // Save to MessageLog
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
        // 2. CONTEXT RESOLUTION (Need Image to Send to AI)
        // ---------------------------------------------------------
        const targetImageUrl = await whatsappService.resolveImageContext(payload);

        if (!targetImageUrl) {
            console.log('[Webhook] No image context. Skipping AI analysis.');
            return 'OK_NO_IMAGE';
        }

        // ---------------------------------------------------------
        // 3. AI-BASED INTENT DETECTION & EXTRACTION
        // ---------------------------------------------------------
        const textMessage = payload.text ? payload.text.message :
            (payload.image && payload.image.caption ? payload.image.caption : '');

        console.log('[Webhook] Sending to AI for analysis...');
        const aiResult = await aiService.analyzeMessage(targetImageUrl, textMessage);

        // Check if AI detected purchase intent
        if (!aiResult.intencao_compra) {
            console.log('[Webhook] AI detected NO purchase intent. Finished.');
            console.log('[Webhook] AI identified', aiResult.produtos_identificados || 0, 'products in image');
            return 'OK_NO_INTENT';
        }

        console.log('[Webhook] AI detected PURCHASE INTENT!');
        console.log('[Webhook] AI observation:', aiResult.observacao || 'N/A');

        // ---------------------------------------------------------
        // 4. CREATE ORDERS FOR EACH PRODUCT
        // ---------------------------------------------------------
        const produtos = aiResult.produtos || [];

        if (produtos.length === 0) {
            console.log('[Webhook] No products in AI response. Skipping.');
            return 'OK_NO_PRODUCTS';
        }

        console.log(`[Webhook] Creating ${produtos.length} order(s)...`);

        // Fetch markup setting
        const SettingsController = require('./settings.controller');
        const markupPercentage = await SettingsController.getValue('markup_percentage', 35);
        const markup = 1 + (Number(markupPercentage) / 100);

        const createdOrders = [];

        for (const produto of produtos) {
            const catalogPrice = produto.preco_catalogo ? parseFloat(produto.preco_catalogo) : null;
            let sellPrice = null;

            if (catalogPrice) {
                sellPrice = catalogPrice * markup;
                sellPrice = Math.round(sellPrice * 100) / 100;
            }

            // Build product description with code if available
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
                catalogPrice: catalogPrice,
                sellPrice: sellPrice,
                imageUrl: targetImageUrl, // Will be updated below
                quantity: produto.quantidade || 1,
                originalMessage: textMessage,
                status: catalogPrice ? 'PENDING' : 'PENDING'
            });

            createdOrders.push(newOrder);
            console.log(`[Webhook] Order #${newOrder.id} created for: ${productDescription}`);
        }

        // Download and save image locally (once, for the first order - all share same image)
        if (createdOrders.length > 0) {
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
        // 5. INTEGRATIONS (Sheets only - Bling is manual via Dashboard)
        // ---------------------------------------------------------
        for (const order of createdOrders) {
            try {
                await sheetsService.appendOrder(order);
            } catch (sheetError) {
                console.warn('[Webhook] Sheets integration failed (non-blocking):', sheetError.message);
            }
        }

        // NOTE: Bling sync removed from here. 
        // User will approve and sync manually via Dashboard > "Sincronizar com Bling"

        return `ORDERS_CREATED:${createdOrders.length}`;
    }
}

module.exports = new WebhookController();
