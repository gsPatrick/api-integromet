const axios = require('axios');
const fs = require('fs');
const path = require('path');
// No longer needed: const pdf = require('pdf-poppler');

class CatalogService {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY;
        this.apiUrl = 'https://api.openai.com/v1/chat/completions';
    }

    /**
     * Finds match via OpenAI Description + Search (Legacy/Fallback)
     * Now primarily handled by CatalogAssistantService directly querying PDF
     */
    async findVisualMatch(customerImageUrl) {
        // Implementation kept for reference if needed for other AI tasks
        return null;
    }
}

module.exports = new CatalogService();
