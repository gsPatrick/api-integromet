const whatsappService = require('../services/whatsapp.service');
const webhookController = require('./webhook.controller');

class ImportController {

    async importHistory(req, res) {
        try {
            const allowedGroupIds = process.env.ALLOWED_GROUP_ID ? process.env.ALLOWED_GROUP_ID.split(',') : [];

            if (allowedGroupIds.length === 0) {
                return res.status(400).json({ error: 'ALLOWED_GROUP_ID not configured.' });
            }

            console.log(`[Import] Starting history import for groups: ${allowedGroupIds.join(', ')}...`);

            const results = [];
            const today = new Date().toISOString().split('T')[0];

            for (const groupId of allowedGroupIds) {
                console.log(`[Import] Fetching messages for group: ${groupId}...`);

                try {
                    // 1. Fetch last 100 messages
                    const messages = await whatsappService.getMessages(groupId, 100);

                    if (!messages || messages.length === 0) {
                        console.log(`[Import] No messages found for group ${groupId}.`);
                        continue;
                    }

                    // Process sequentially
                    for (const msg of messages) {
                        // Verify date
                        const msgDate = new Date(msg.momment || msg.timestamp * 1000);
                        const msgDateString = msgDate.toISOString().split('T')[0];

                        if (msgDateString === today) {
                            const mappedPayload = {
                                messageId: msg.messageId,
                                phone: msg.phone,
                                chatId: groupId,
                                senderName: msg.senderName,
                                text: msg.text ? { message: msg.text.message } : null,
                                image: msg.image ? { imageUrl: msg.image.imageUrl, caption: msg.image.caption } : null,
                                referenceMessageId: msg.referenceMessageId || null,
                                momment: msg.momment
                            };

                            console.log(`[Import] Processing ${msg.messageId} from ${groupId}...`);
                            const status = await webhookController.processMessagePayload(mappedPayload);
                            results.push({ id: msg.messageId, group: groupId, status });
                        }
                    }
                } catch (groupError) {
                    console.error(`[Import] Error importing from group ${groupId}:`, groupError.message);
                }
            }

            console.log(`[Import] Finished. Processed ${results.length} messages across ${allowedGroupIds.length} groups.`);
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
