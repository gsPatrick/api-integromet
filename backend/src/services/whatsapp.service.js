const axios = require('axios');
const MessageLog = require('../models/MessageLog');

// Z-API Configuration
const INSTANCE = process.env.ZAPI_INSTANCE_ID;
const TOKEN = process.env.ZAPI_TOKEN;
const CLIENT_TOKEN = process.env.ZAPI_CLIENT_TOKEN;
const BASE_URL = `https://api.z-api.io/instances/${INSTANCE}/token/${TOKEN}`;

class WhatsappService {

    /**
     * Fetches specific message details from Z-API
     * @param {string} phone - User phone number (55...)
     * @param {string} messageId - Message ID to find
     * @returns {Object|null} - Message object or null
     */
    async getMessageById(phone, messageId) {
        try {
            console.log(`[WhatsappService] Fetching message ${messageId} for phone ${phone}`);
            const response = await axios.get(
                `${BASE_URL}/chat-messages/${phone}`,
                {
                    params: {
                        amount: 50 // Fetch last 50 messages to find the specific one
                    },
                    headers: {
                        'Client-Token': CLIENT_TOKEN
                    }
                }
            );

            const messages = response.data;
            const foundMessage = messages.find(msg => msg.messageId === messageId);

            if (foundMessage) {
                console.log(`[WhatsappService] Message found: ${foundMessage.messageId}`);
            } else {
                console.warn(`[WhatsappService] Message ${messageId} not found in last 50 messages`);
            }

            return foundMessage || null;

        } catch (error) {
            console.error('[WhatsappService] Error fetching message:', error.response?.data || error.message);
            return null;
        }
    }

    /**
     * Resolves the image URL context for a given message payload.
     * Logic:
     * 1. If payload has image -> use it.
     * 2. If payload has referenceMessageId:
     *    a. Check MessageLog DB.
     *    b. If not in DB, fetch from Z-API.
     * @param {Object} payload - Webhook payload
     * @returns {string|null} - Image URL or null
     */
    async resolveImageContext(payload) {
        // Case 1: Message itself has an image
        if (payload.image && payload.image.imageUrl) {
            console.log('[WhatsappService] Found image in current message');
            return payload.image.imageUrl;
        }

        // Case 2: Message is a reply
        if (payload.referenceMessageId) {
            console.log(`[WhatsappService] Resolving context for reply to ${payload.referenceMessageId}`);

            // 2a. Check DB
            const loggedMessage = await MessageLog.findByPk(payload.referenceMessageId);
            if (loggedMessage && loggedMessage.imageUrl) {
                console.log('[WhatsappService] Found image in DB logs');
                return loggedMessage.imageUrl;
            }

            // 2b. Fetch from API (Fallback)
            console.log('[WhatsappService] Image not in DB, fetching from API...');
            const originalMessage = await this.getMessageById(payload.phone, payload.referenceMessageId);

            if (originalMessage && originalMessage.image && originalMessage.image.imageUrl) {
                // Optionally save this missing message to DB for future reference?
                // For now, just return valid URL
                console.log('[WhatsappService] Found image via API lookup');
                return originalMessage.image.imageUrl;
            }
        }

        console.warn('[WhatsappService] No image context resolved');
        return null;
    }
}

module.exports = new WhatsappService();
