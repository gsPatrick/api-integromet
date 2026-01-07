const axios = require('axios');

class AiService {
    constructor() {
        this.apiKey = process.env.OPENAI_API_KEY;
        this.apiUrl = 'https://api.openai.com/v1/chat/completions';
    }

    /**
     * Analyzes image and text to:
     * 1. Determine if there's purchase intent
     * 2. Extract order details for ALL products the customer wants
     * @returns {Object} - { intencao_compra: boolean, produtos: [...] }
     */
    async analyzeMessage(imageUrl, userText) {
        console.log('[AiService] Analyzing message with AI...');

        try {
            const payload = {
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content: `Você é um assistente especializado em VENDAS COLETIVAS de roupas infantis via WhatsApp.

CONTEXTO IMPORTANTE:
- Você está analisando mensagens de um GRUPO DE VENDA COLETIVA de roupas
- Clientes enviam FOTOS DE CATÁLOGO que geralmente mostram MÚLTIPLOS PRODUTOS na mesma página
- Os produtos têm CÓDIGOS visíveis (ex: 46586, 46587, 00271)
- Os produtos têm PREÇOS por tamanho (1-3, 4-8, 10-12)
- Cliente pode querer APENAS 1 produto ou TODOS os produtos da página

TAREFA 1 - IDENTIFICAR PRODUTOS:
Analise a imagem e identifique TODOS os produtos visíveis com seus códigos e preços.

TAREFA 2 - DETECTAR INTENÇÃO:
Analise o texto do cliente para entender:
- Há intenção de compra? (ex: "quero", "manda", "reserva", "2 desse", "1 de cada")
- QUAL(IS) produto(s) ele quer? (pode ser 1, alguns ou todos)
- Qual tamanho? Qual cor? Quantas unidades de cada?

EXEMPLOS DE INTERPRETAÇÃO:
- "Quero esse no M" + imagem com 2 produtos → Cliente quer AMBOS? Ou o mais destacado? Analise o contexto.
- "Quero o 46586 no G" → Cliente quer SÓ o produto de código 46586
- "1 de cada" ou "os dois" → Cliente quer TODOS os produtos visíveis
- "2 do primeiro e 1 do segundo" → Cliente quer 2 do primeiro produto e 1 do segundo
- "Quero" sem especificar → Se há 1 produto, é esse. Se há 2+, provavelmente quer todos.

RETORNE ESTE JSON (ESTRITAMENTE):
{
  "intencao_compra": boolean,
  "produtos_identificados": number (quantos produtos distintos você vê na imagem),
  "produtos": [
    {
      "codigo": "string (código do produto se visível, ex: 46586)",
      "descricao": "string (descrição do produto)",
      "tamanho": "string ou null (P, M, G, 1-3, 4-8, etc)",
      "cor": "string ou null",
      "preco_catalogo": number ou null (preço para o tamanho especificado),
      "quantidade": number (quantas unidades o cliente quer deste produto)
    }
  ],
  "observacao": "string (sua interpretação do pedido, dúvidas)"
}

REGRAS:
- Se o cliente quer MÚLTIPLOS produtos, inclua TODOS no array "produtos"
- Se o cliente não especificou tamanho/cor, deixe null
- O preço deve corresponder ao tamanho pedido (ex: se pediu 4-8, pegue o preço de 4-8)
- Se não houver intenção de compra, ainda identifique os produtos (útil para catálogo)
- Retorne APENAS o JSON, nada mais.`
                    },
                    {
                        role: "user",
                        content: [
                            { type: "text", text: userText || "(Cliente enviou apenas a imagem, sem texto)" },
                            {
                                type: "image_url",
                                image_url: { url: imageUrl }
                            }
                        ]
                    }
                ],
                max_tokens: 800,
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
