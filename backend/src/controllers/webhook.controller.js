const MessageLog = require('../models/MessageLog');
const Order = require('../models/Order');
const whatsappService = require('../services/whatsapp.service');
const aiService = require('../services/ai.service');
const sheetsService = require('../services/sheets.service');
const blingService = require('../services/bling.service');

class WebhookController {

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

            // ---------------------------------------------------------
            // 3. INGESTION & LOGGING (Vital)
            // ---------------------------------------------------------
            // Ensure we have a message ID and phone, otherwise ignore
            if (!payload.messageId || !payload.phone) {
                console.warn('[Webhook] Ignoring invalid payload (missing ID or phone)');
                return res.status(200).send('IGNORED');
            }

            // Check if duplicate (Z-API might retry)
            const existing = await MessageLog.findByPk(payload.messageId);
            if (existing) {
                console.log('[Webhook] Duplicate message ignored:', payload.messageId);
                return res.status(200).send('DUPLICATE');
            }

            // Save to MessageLog
            await MessageLog.create({
                messageId: payload.messageId,
                chatId: payload.chatId || payload.phone, // fallback
                senderPhone: payload.phone,
                content: payload.text ? payload.text.message : (payload.image ? payload.image.caption : null),
                imageUrl: payload.image ? payload.image.imageUrl : null,
                hasImage: !!payload.image,
                jsonPayload: payload
            });
            console.log('[Webhook] Message logged to DB.');

            // ---------------------------------------------------------
            // 2. IDENTIFY PURCHASE INTENT
            // ---------------------------------------------------------
            // Definition of intent:
            // - Has image (Admin posting catalog? Maybe not a purchase *req* but we log it. We don't process it as an ORDER yet usually)
            // - OR Is a reply (referenceMessageId)
            // - OR Contains keywords like "quero", "vou querer", "reservar"

            const textMessage = payload.text ? payload.text.message.toLowerCase() : '';
            const isReply = !!payload.referenceMessageId;
            const keywords = ['quero', 'compra', 'pedido', 'reservar', 'tenho interesse', 'qual valor'];
            const hasKeyword = keywords.some(k => textMessage.includes(k));

            // NOTE: We only process as an ORDER if it seems like a customer reaction.
            // If it's just an image upload without text, it might be the admin posting the catalog.
            // We generally want to react to REPLIES or SPECIFIC TEXT intentions.

            if (!isReply && !hasKeyword) {
                console.log('[Webhook] No purchase intent detected. Finished.');
                return res.status(200).send('OK');
            }

            console.log('[Webhook] Purchase intent detected! Starting processing...');

            // ---------------------------------------------------------
            // 3. CONTEXT RESOLUTION
            // ---------------------------------------------------------
            const targetImageUrl = await whatsappService.resolveImageContext(payload);

            if (!targetImageUrl) {
                console.warn('[Webhook] could not resolve an image context. Aborting order processing.');
                // Potentially notify admin?
                return res.status(200).send('NO_IMAGE_CONTEXT');
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
                // Round to 2 decimals
                sellPrice = Math.round(sellPrice * 100) / 100;
            }

            // Create Order
            const newOrder = await Order.create({
                customerName: payload.senderName || 'Unknown',
                customerPhone: payload.phone,
                productRaw: aiResult.produto,
                extractedSize: aiResult.tamanho,
                extractedColor: aiResult.cor,
                catalogPrice: catalogPrice,
                sellPrice: sellPrice,
                status: catalogPrice ? 'PROCESSED' : 'PENDING' // Pending review if no price found
            });

            console.log(`[Webhook] Order #${newOrder.id} created.`);

            // ---------------------------------------------------------
            // 6. INTEGRATIONS (Sheets & Bling)
            // ---------------------------------------------------------
            // Fire and forget (don't block response) or await if critical
            // Using await here for safer sequential processing in this prototype

            await sheetsService.appendOrder(newOrder);

            if (newOrder.status === 'PROCESSED') {
                const result = await blingService.executeOrder(newOrder);
            } else {
                console.log('[Webhook] Skipping Bling integration (Order PENDING/Missing Price).');
            }

            return res.status(200).send('ORDER_PROCESSED');

        } catch (error) {
            console.error('[Webhook] Critical Error:', error);
            return res.status(500).send('ERROR');
        }
    }
}

module.exports = new WebhookController();
