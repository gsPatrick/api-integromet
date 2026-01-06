const axios = require('axios');

class AiService {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY;
        this.apiUrl = 'https://api.openai.com/v1/chat/completions';
    }

    /**
     * Analyzes image and text to:
     * 1. Determine if there's purchase intent
     * 2. Extract order details if intent is detected
     * @returns {Object} - { intencao_compra: boolean, ...orderDetails }
     */
    async analyzeMessage(imageUrl, userText) {
        console.log('[AiService] Analyzing message with AI...');

        try {
            const payload = {
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: `Você é um assistente de vendas de uma loja de roupas via WhatsApp.
Analise a imagem (que pode conter o preço visualmente) e o texto do usuário.

TAREFA 1: Determine se há INTENÇÃO DE COMPRA. Exemplos de intenção:
- "Quero esse", "2 desse", "Tem no M?", "Reserva pra mim", "Quanto é?"
- Qualquer texto indicando interesse no produto
- Se só tem imagem sem texto ou com texto genérico, considere como catálogo (sem intenção)

TAREFA 2: Se houver intenção, extraia os detalhes do pedido.

Retorne ESTRITAMENTE o JSON:
{ 
  "intencao_compra": boolean,
  "produto": string (descrição do produto na imagem),
  "tamanho": string ou null (P, M, G, 38, 40, etc),
  "cor": string ou null,
  "preco_catalogo": number ou null (preço visível na imagem),
  "quantidade": number (default 1)
}

REGRAS:
- Se o texto especificar tamanho/cor, priorize o texto sobre a imagem.
- Se não houver intenção, ainda preencha produto/cor/preco se visíveis (útil para catálogo).
- Retorne APENAS o JSON, nada mais.`
                    },
                    {
                        role: "user",
                        content: [
                            { type: "text", text: userText || "(sem texto)" },
                            {
                                type: "image_url",
                                image_url: { url: imageUrl }
                            }
                        ]
                    }
                ],
                max_tokens: 400,
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
            console.log('[AiService] AI Response:', content);
            return JSON.parse(content);

        } catch (error) {
            console.error('[AiService] Error processing AI request:', error.response?.data || error.message);
            throw new Error('Failed to analyze message via AI');
        }
    }
}

module.exports = new AiService();
