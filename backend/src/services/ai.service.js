const axios = require('axios');

class AiService {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY;
        this.apiUrl = 'https://api.openai.com/v1/chat/completions';
    }

    /**
     * Extracts order details from image and text using GPT-4o
     * @param {string} imageUrl - URL of the product image
     * @param {string} userText - User's message text
     * @returns {Object} - Extracted JSON data
     */
    async extractOrderDetails(imageUrl, userText) {
        console.log('[AiService] Sending request to OpenAI...');

        try {
            const payload = {
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: `Analise a imagem (que pode conter o preço visualmente) e o texto do usuário. 
            O contexto é uma venda de roupas via WhatsApp.
            Extraia os dados em estrito JSON: 
            { 
              "produto": string, 
              "tamanho": string (ex: P, M, G, 38, 40), 
              "cor": string, 
              "preco_catalogo": number (ou null se ilegível), 
              "quantidade": number (default 1 se não especificado)
            }.
            Se o texto do usuário especificar tamanho/cor, priorize o texto.
            Retorne APENAS o JSON.`
                    },
                    {
                        role: "user",
                        content: [
                            { type: "text", text: userText || "Interesse no produto" },
                            {
                                type: "image_url",
                                image_url: {
                                    url: imageUrl
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 300,
                response_format: { type: "json_object" }
            };

            const response = await axios.post(
                this.apiUrl,
                payload,
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    }
                }
            );

            const content = response.data.choices[0].message.content;
            console.log('[AiService] Response:', content);
            return JSON.parse(content);

        } catch (error) {
            console.error('[AiService] Error processing AI request:', error.response?.data || error.message);
            throw new Error('Failed to extract order details via AI');
        }
    }
}

module.exports = new AiService();
