const whatsappService = require('../services/whatsapp.service');
const webhookController = require('./webhook.controller');

class ImportController {

    async importHistory(req, res) {
        try {
            const allowedGroupId = process.env.ALLOWED_GROUP_ID;

            if (!allowedGroupId) {
                return res.status(400).json({ error: 'ALLOWED_GROUP_ID not configured.' });
            }

            console.log(`[Import] Starting history import for ${allowedGroupId}...`);

            // 1. Fetch last 100 messages
            const messages = await whatsappService.getMessages(allowedGroupId, 100);

            if (!messages || messages.length === 0) {
                return res.json({ message: 'No messages found to import.' });
            }

            // 2. Filter for "Today" (Local server time)
            const today = new Date().toISOString().split('T')[0];

            // Z-API timestamps might be moment or timestamp. Assuming standard ISO or compatible.
            // Adjust based on actual Z-API payload if needed. 
            // In the webhook log, we saw "momment": 1767709186001 (Timestamp ms)

            const processedCount = 0;
            const results = [];

            // Process sequentially to avoid rate limits / race conditions
            for (const msg of messages) {
                // Verify date
                const msgDate = new Date(msg.momment || msg.timestamp * 1000);
                const msgDateString = msgDate.toISOString().split('T')[0];

                if (msgDateString === today) {

                    // Map Z-API message object to Webhook Payload format
                    // Webhook payload usually wraps message in specific structure depending on type
                    // But processMessagePayload expects specific fields: messageId, phone, text, image...

                    // Simplified mapping:
                    const mappedPayload = {
                        messageId: msg.messageId,
                        phone: msg.phone, // sender phone
                        chatId: allowedGroupId, // The group we are scanning
                        senderName: msg.senderName,
                        text: msg.text ? { message: msg.text.message } : null,
                        image: msg.image ? { imageUrl: msg.image.imageUrl, caption: msg.image.caption } : null,
                        referenceMessageId: msg.referenceMessageId || null, // Check if Z-API returns this field in list
                        momment: msg.momment
                    };

                    console.log(`[Import] Processing ${msg.messageId}...`);
                    const status = await webhookController.processMessagePayload(mappedPayload);
                    results.push({ id: msg.messageId, status });
                }
            }

            console.log(`[Import] Finished. Processed ${results.length} messages.`);
            res.json({
                success: true,
                processed: results.length,
                details: results
            });

        } catch (error) {
            console.error('[Import] Failed:', error);
            res.status(500).json({ error: 'Import failed' });
        }
    }
}

module.exports = new ImportController();
