const MessageLog = require('../models/MessageLog');
const Order = require('../models/Order');
const whatsappService = require('../services/whatsapp.service');
const aiService = require('../services/ai.service');
const sheetsService = require('../services/sheets.service');
const blingService = require('../services/bling.service');

class WebhookController {

    constructor() {
        // Bind methods to preserve `this` context when passed as callbacks
        this.handleWebhook = this.handleWebhook.bind(this);
        this.processMessagePayload = this.processMessagePayload.bind(this);
    }

    async handleWebhook(req, res) {
        try {
            const payload = req.body;
            console.log('---------------------------------------------------');

            // 1. DISCOVERY LOG (Vital for User Configuration)
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

    /**
     * Core logic to process a message payload (from Webhook or Import).
     * Returns a status string.
     */
    async processMessagePayload(payload) {
        // ---------------------------------------------------------
        // 1. INGESTION & LOGGING (Vital)
        // ---------------------------------------------------------
        if (!payload.messageId || !payload.phone) {
            console.warn('[Webhook/Import] Ignoring invalid payload (missing ID or phone)');
            return 'IGNORED';
        }

        // Check if duplicate
        const existing = await MessageLog.findByPk(payload.messageId);
        if (existing) {
            console.log('[Webhook/Import] Duplicate message ignored:', payload.messageId);
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
        console.log('[Webhook/Import] Message logged to DB.');

        // ---------------------------------------------------------
        // 2. IDENTIFY PURCHASE INTENT
        // ---------------------------------------------------------
        // Check caption from image OR text message
        const textMessage = payload.text ? payload.text.message.toLowerCase() :
            (payload.image && payload.image.caption ? payload.image.caption.toLowerCase() : '');
        const isReply = !!payload.referenceMessageId;
        const keywords = ['quero', 'compra', 'pedido', 'reservar', 'tenho interesse', 'qual valor', 'desse', 'esse'];
        const hasKeyword = keywords.some(k => textMessage.includes(k));

        // Also consider: Image with caption as potential order
        const hasImageWithCaption = payload.image && payload.image.caption;

        if (!isReply && !hasKeyword && !hasImageWithCaption) {
            console.log('[Webhook/Import] No purchase intent detected. Finished.');
            return 'OK_NO_INTENT';
        }

        console.log('[Webhook/Import] Purchase intent detected! Starting processing...');

        // ---------------------------------------------------------
        // 3. CONTEXT RESOLUTION
        // ---------------------------------------------------------
        const targetImageUrl = await whatsappService.resolveImageContext(payload);

        if (!targetImageUrl) {
            console.warn('[Webhook/Import] could not resolve an image context. Aborting order processing.');
            return 'NO_IMAGE_CONTEXT';
        }

        // ---------------------------------------------------------
        // 4. AI PROCESSING
        // ---------------------------------------------------------
        const aiResult = await aiService.extractOrderDetails(targetImageUrl, textMessage);

        // ---------------------------------------------------------
        // 5. CALCULATIONS & SAVING
        // ---------------------------------------------------------
        const catalogPrice = aiResult.preco_catalogo ? parseFloat(aiResult.preco_catalogo) : null;
        let sellPrice = null;

        // Markup logic: Price * 1.35
        if (catalogPrice) {
            sellPrice = catalogPrice * 1.35;
            sellPrice = Math.round(sellPrice * 100) / 100;
        }

        // Create Order
        const newOrder = await Order.create({
            customerName: payload.senderName || 'Unknown',
            customerPhone: payload.participantPhone || payload.phone, // Use participant phone for groups
            productRaw: aiResult.produto,
            extractedSize: aiResult.tamanho,
            extractedColor: aiResult.cor,
            catalogPrice: catalogPrice,
            sellPrice: sellPrice,
            imageUrl: targetImageUrl, // Save image URL for dashboard
            status: catalogPrice ? 'PROCESSED' : 'PENDING'
        });

        console.log(`[Webhook/Import] Order #${newOrder.id} created.`);

        // ---------------------------------------------------------
        // 6. INTEGRATIONS (Sheets & Bling)
        // ---------------------------------------------------------
        await sheetsService.appendOrder(newOrder);

        if (newOrder.status === 'PROCESSED') {
            await blingService.executeOrder(newOrder);
        } else {
            console.log('[Webhook/Import] Skipping Bling integration (Order PENDING/Missing Price).');
        }

        return 'ORDER_PROCESSED';
    }
}

module.exports = new WebhookController();
