const MessageLog = require('../models/MessageLog');
const Order = require('../models/Order');
const whatsappService = require('../services/whatsapp.service');
const aiService = require('../services/ai.service');
const sheetsService = require('../services/sheets.service');
const blingService = require('../services/bling.service');

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
            return 'OK_NO_INTENT';
        }

        console.log('[Webhook] AI detected PURCHASE INTENT! Creating order...');

        // ---------------------------------------------------------
        // 4. CALCULATIONS & SAVING
        // ---------------------------------------------------------
        const catalogPrice = aiResult.preco_catalogo ? parseFloat(aiResult.preco_catalogo) : null;
        let sellPrice = null;

        if (catalogPrice) {
            sellPrice = catalogPrice * 1.35;
            sellPrice = Math.round(sellPrice * 100) / 100;
        }

        const newOrder = await Order.create({
            customerName: payload.senderName || 'Unknown',
            customerPhone: payload.participantPhone || payload.phone,
            productRaw: aiResult.produto,
            extractedSize: aiResult.tamanho,
            extractedColor: aiResult.cor,
            catalogPrice: catalogPrice,
            sellPrice: sellPrice,
            imageUrl: targetImageUrl,
            quantity: aiResult.quantidade || 1,
            status: catalogPrice ? 'PROCESSED' : 'PENDING'
        });

        console.log(`[Webhook] Order #${newOrder.id} created.`);

        // ---------------------------------------------------------
        // 5. INTEGRATIONS (Sheets only - Bling is manual via Dashboard)
        // ---------------------------------------------------------
        try {
            await sheetsService.appendOrder(newOrder);
        } catch (sheetError) {
            console.warn('[Webhook] Sheets integration failed (non-blocking):', sheetError.message);
        }

        // NOTE: Bling sync removed from here. 
        // User will approve and sync manually via Dashboard > "Sincronizar com Bling"

        return 'ORDER_PROCESSED';
    }
}

module.exports = new WebhookController();
