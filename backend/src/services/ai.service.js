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
                        content: `Você é um assistente especializado em VENDAS COLETIVAS de roupas e produtos infantis via WhatsApp.

CONTEXTO IMPORTANTE:
- Você está analisando mensagens de um GRUPO DE VENDA COLETIVA
- Clientes enviam FOTOS DE CATÁLOGO que podem mostrar MÚLTIPLOS PRODUTOS na mesma página
- Os produtos têm CÓDIGOS visíveis (ex: 46586, 46587).
- As CORES podem ter CÓDIGOS específicos próximos à imagem (ex: 120722, 000271).
- PREÇOS: Frequentemente variam por tamanho (ex: 1-3 R$ X, 4-8 R$ Y). Extraia o PREÇO EXATO para o tamanho solicitado na imagem.
- Cliente pode querer APENAS 1 produto ou VÁRIOS produtos da página

REGRA ESPECIAL - IMAGEM SEM TEXTO:
- Se o cliente enviar APENAS a imagem (sem texto ou com texto vazio), considere como INTENÇÃO DE COMPRA
- Neste caso, o cliente quer 1 UNIDADE de CADA produto visível/marcado na imagem
- Isso é muito comum em grupos de venda coletiva

ATENÇÃO ESPECIAL - MARCAÇÕES VISUAIS:
- Clientes frequentemente CIRCULAM, DESTACAM ou MARCAM os produtos que querem
- Procure por: círculos, retângulos, setas, rabiscos, marcações coloridas
- Se houver marcações, considere que o cliente quer APENAS os produtos marcados
- Ignore produtos que NÃO estão marcados/circulados

TAREFA 1 - IDENTIFICAR PRODUTOS:
Analise a imagem e identifique:
- Quantos produtos estão visíveis no total
- Quais produtos estão MARCADOS/CIRCULADOS pelo cliente
- Códigos PRINCIPAIS (da referência)
- Códigos das CORES (números pequenos próximos à variante)
- Nomes, preços (específico do tamanho)

TAREFA 2 - DETECTAR INTENÇÃO:
Analise o texto do cliente para entender:
- Há intenção de compra? (ex: "quero", "manda", "reserva", "1 desse")
- QUAL(IS) produto(s) ele quer? Use o texto E as marcações visuais
- Qual tamanho? Qual cor e CÓDIGO DA COR associado? Quantas unidades de cada?

EXEMPLOS DE INTERPRETAÇÃO:
- Imagem com 3 produtos, 2 circulados + texto "quero esses" → 2 pedidos (só os circulados)
- Imagem com shampoo e condicionador circulados + "1 shampoo e 1 condicionador" → 2 pedidos
- "Quero o 46586 no G" → 1 pedido - SÓ o produto especificado
- "1 de cada" → Cliente quer TODOS os produtos marcados (ou todos se nada marcado)

RETORNE ESTE JSON (ESTRITAMENTE):
{
  "intencao_compra": boolean,
  "produtos_identificados": number (total de produtos VISÍVEIS na imagem),
  "produtos_marcados": number (quantos produtos estão CIRCULADOS/MARCADOS, 0 se nenhum),
  "produtos": [
    {
      "codigo": "string (código do produto se visível)",
      "descricao": "string (nome/descrição do produto)",
      "tamanho": "string ou null",
      "cor": "string ou null (nome da cor)",
      "codigo_cor": "string ou null (código numérico da cor, ex: 120722)",
      "preco_catalogo": number ou null (preço correspondente ao tamanho),
      "quantidade": number (quantas unidades o cliente quer)
    }
  ],
  "observacao": "string (sua interpretação, se viu marcações, códigos de cor, etc)"
}

REGRAS IMPORTANTES:
- Se há MARCAÇÕES VISUAIS, inclua APENAS os produtos marcados no array
- Se NÃO há marcações, use o texto para determinar quais produtos o cliente quer
- Tente extrair o CÓDIGO DA COR sempre que possível (geralmente 6 dígitos próximos à peça)
- O preço deve corresponder ao TAMANHO escolhido (olhe a tabela de preços na imagem)
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

    /**
     * Analyzes a TEXT-ONLY message, using recent conversation context
     * @param {string} userText - The current text message
     * @param {Array} contextMessages - Recent messages from MessageContext
     * @returns {Object} - Same format as analyzeMessage
     */
    async analyzeTextOrder(userText, contextMessages = []) {
        console.log('[AiService] Analyzing text order with context...');

        try {
            // Build context for AI
            const contextDescription = contextMessages.map(m => {
                const type = m.messageType;
                const content = type === 'text' ? m.textContent : `[Imagem enviada] ${m.textContent || ''}`;
                return `User (${m.createdAt}): ${content}`;
            }).join('\n');

            // Check if there is a recent image in context
            const lastImage = contextMessages.find(m => m.imageUrl && m.messageType !== 'text');

            const messages = [
                {
                    role: "system",
                    content: `Você é um assistente de vendas. O cliente mandou uma mensagem de TEXTO.
Analise se é um PEDIDO DE VENDA.

CENÁRIOS COMUNS:
1. Lista de produtos: "Quero 1 shampoo, 2 sabonetes"
2. Referência a imagem anterior: "1 de cada desse" (referindo-se à última foto enviada)
3. Resposta a uma cotação: "Pode fechar", "Vou querer"

CONTEXTO RECENTE:
${contextDescription}

Regras:
- Se o texto refere-se a "esse", "desse", "da foto", use a ÚLTIMA IMAGEM do contexto.
- Se for uma lista explícita (ex: "1 shampoo"), ignore a imagem e foque no texto.
- Extraia os produtos com a maior precisão possível.

RETORNE JSON:
{
  "intencao_compra": boolean,
  "referencia_imagem_anterior": boolean (se o pedido depende da foto anterior),
  "produtos": [
    {
      "descricao": "string",
      "quantidade": number,
      "tamanho": "string/null",
      "observacao": "string"
    }
  ]
}`
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: userText }
                    ]
                }
            ];

            // If there's a recent image, add it to the user message for context
            if (lastImage && lastImage.imageUrl) {
                messages[1].content.push({
                    type: "text",
                    text: "CONTEXTO VISUAL - Última imagem enviada pelo cliente:"
                });
                messages[1].content.push({
                    type: "image_url",
                    image_url: { url: lastImage.imageUrl }
                });
            }

            const response = await axios.post(
                this.apiUrl,
                {
                    model: "gpt-4o",
                    messages,
                    max_tokens: 800,
                    response_format: { type: "json_object" }
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    }
                }
            );

            const content = response.data.choices[0].message.content;
            console.log('[AiService] Text Context Response:', content);
            return JSON.parse(content);

        } catch (error) {
            console.error('[AiService] Error analyzing text context:', error.message);
            throw new Error('Failed to analyze text order');
        }
    }
}

module.exports = new AiService();
