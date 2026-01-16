const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const SettingsController = require('../controllers/settings.controller');

class CatalogAssistantService {
    constructor() {
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        this.assistantId = null;
        this.vectorStoreId = null;
    }

    /**
     * Initializes the Assistant if not already created
     */
    async initialize() {
        // Load IDs from settings DB
        this.assistantId = await SettingsController.getValue('openai_assistant_id', process.env.OPENAI_ASSISTANT_ID);
        this.vectorStoreId = await SettingsController.getValue('openai_vector_store_id', process.env.OPENAI_VECTOR_STORE_ID);

        if (this.assistantId && this.vectorStoreId) return;

        console.log('[CatalogAssistant] Initializing OpenAI Assistant...');

        // 1. Create Vector Store
        if (!this.vectorStoreId) {
            // FIX: Check where vectorStores lives (root or beta)
            const vsApi = this.openai.beta.vectorStores || this.openai.vectorStores;

            if (!vsApi) {
                throw new Error('OpenAI Client does not support Vector Stores (neither in beta nor root)');
            }

            const vectorStore = await vsApi.create({
                name: "Catalogos de Vendas"
            });
            this.vectorStoreId = vectorStore.id;
            console.log('[CatalogAssistant] Vector Store created:', this.vectorStoreId);

            // Persist for future restarts
            await SettingsController.updateValue('openai_vector_store_id', this.vectorStoreId);
        }

        // 2. Create Assistant
        const instructions = `Você é um assistente especializado em vendas de moda.
                Sua função é identificar produtos, preços e códigos a partir de catálogos PDF.

                CENÁRIO ARQUIVOS MÚLTIPLOS:
                Você pode ter acesso a dois tipos de arquivos simultaneamente:
                1. **CATÁLOGO DE IMAGENS**: Contém fotos, códigos (ref) e tamanhos, mas muitas vezes SEM PREÇO.
                2. **TABELA DE PREÇOS**: Contém códigos e os preços correspondentes.

                SEU OBJETIVO:
                1. Identificar o produto no catálogo visual (pela imagem ou busca de texto).
                2. Capturar o CÓDIGO (Ref) deste produto.
                3. Usar esse CÓDIGO para buscar o PREÇO na tabela de preços (se o preço não estiver direto no catálogo).
                4. Retornar todas as informações consolidadas.

                REGRAS:
                - Se encontrar o produto mas sem preço, BUSQUE O CÓDIGO nos outros arquivos para achar o preço.
                - Se houver variação de preço por tamanho, liste todos.
                - Priorize a precisão do código.`;

        if (!this.assistantId) {
            const assistant = await this.openai.beta.assistants.create({
                name: "Assistente de Catálogo",
                instructions: instructions,
                model: "gpt-4o",
                tools: [{ type: "file_search" }],
                tool_resources: {
                    file_search: {
                        vector_store_ids: [this.vectorStoreId]
                    }
                }
            });
            this.assistantId = assistant.id;
            console.log('[CatalogAssistant] Assistant created:', this.assistantId);

            // Persist for future restarts
            await SettingsController.updateValue('openai_assistant_id', this.assistantId);
        } else {
            // Update existing assistant with new instructions
            try {
                await this.openai.beta.assistants.update(this.assistantId, {
                    instructions: instructions,
                    model: "gpt-4o" // Ensure using capable model
                });
                console.log('[CatalogAssistant] Assistant instructions updated with Dual PDF capabilities');
            } catch (e) {
                console.warn('[CatalogAssistant] Failed to update instructions:', e.message);
            }
        }
    }

    /**
     * Uploads a PDF to the vector store
     */
    async uploadCatalogPdf(filePath, fileName) {
        await this.initialize();
        console.log(`[CatalogAssistant] Uploading ${fileName} to Vector Store...`);

        const fileStream = fs.createReadStream(filePath);

        // Upload file to OpenAI
        const file = await this.openai.files.create({
            file: fileStream,
            purpose: "assistants",
        });

        // Add to Vector Store
        // FIX: Check where vectorStores lives
        const vsFilesApi = (this.openai.beta.vectorStores && this.openai.beta.vectorStores.files) ||
            (this.openai.vectorStores && this.openai.vectorStores.files);

        if (!vsFilesApi) {
            throw new Error('OpenAI Client does not support Vector Store Files');
        }

        await vsFilesApi.create(
            this.vectorStoreId,
            {
                file_id: file.id
            }
        );

        console.log('[CatalogAssistant] File uploaded and indexed:', file.id);
        return file.id;
    }

    /**
     * Queries the catalog for a product price/code
     */
    async searchCatalog(query, context = '') {
        await this.initialize();
        console.log('[CatalogAssistant] Searching catalog for:', query, '| Context:', context);

        const prompt = `Busque nos catálogos PDF e encontre informações sobre: "${query}".
                    ${context ? `CONTEXTO DA CAMPANHA: "${context}". Dê prioridade a produtos encontrados em arquivos que correspondam a este nome ou coleção.` : ''}
                    
                    IMPORTANTE:
                    - Busque por código, nome, descrição ou qualquer parte que coincida`;

        // Create a thread
        const thread = await this.openai.beta.threads.create({
            messages: [
                {
                    role: "user",
                    content: prompt + `
                    - Se encontrar algo parecido, retorne mesmo que não seja exato
                    - Procure em TODOS os catálogos disponíveis
                    - Se houver variação por tamanho, inclua todos os preços
                    - Preços podem estar em formatos como "R$ 99,90" ou "99.90"
                    
                    Retorne APENAS um JSON válido no formato:
                    {
                        "encontrado": true/false,
                        "produtos": [
                            { 
                                "codigo": "código do produto", 
                                "nome": "nome completo", 
                                "preco": 99.90, 
                                "tamanhos_precos": { "P": 89.90, "M": 99.90, "G": 109.90 }, 
                                "codigo_cor": "código da cor se houver",
                                "confianca": "alta/media/baixa"
                            }
                        ],
                        "observacao": "qualquer nota relevante"
                    }
                    
                    Se não encontrar NADA, retorne: {"encontrado": false, "produtos": [], "observacao": "motivo"}`
                }
            ]
        });

        // Run the assistant
        const run = await this.openai.beta.threads.runs.createAndPoll(
            thread.id,
            { assistant_id: this.assistantId }
        );

        if (run.status === 'completed') {
            const messages = await this.openai.beta.threads.messages.list(thread.id);
            const responseText = messages.data[0].content[0].text.value;

            // Clean up JSON response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            return { encontrado: false, raw: responseText };
        } else {
            console.error('[CatalogAssistant] Run failed:', run.status);
            return { encontrado: false, error: run.status };
        }
    }
    /**
     * Analyzes an order message against the catalog to extract standardized data
     */
    async analyzeOrder(message, productHint, context = '') {
        await this.initialize();
        console.log(`[CatalogAssistant] Analyzing order: "${message}" | Hint: ${productHint}`);

        const prompt = `CONTEXTO: Você é um especialista em pedidos de moda.
        PEDIDO DO CLIENTE: "${message}"
        PRODUTO INICIALMENTE IDENTIFICADO: "${productHint}"
        COLEÇÃO/CATÁLOGO ALVO: "${context}"

        TAREFA:
        1. Consulte os arquivos de catálogo (Vector Store) para identificar EXATAMENTE qual é o produto (Código e Nome).
           - Tente corrigir nomes incompletos.
           - Busque pelo código (ex: M2CJ 5958) se estiver disponível.
        2. Analise a mensagem do cliente para extrair TAMANHO e COR/VARIANTE desejados.
        3. Encontre o PREÇO correto para essa variante no catálogo. Se houver tabela de preços, use-a.

        Saída JSON Obrigatória:
        {
            "found": true,
            "product": {
                "code": "Código Ref (ex: M2CJ 5958)",
                "name": "Nome Oficial do Produto no Catálogo",
                "price": 123.45 (Number, use ponto para decimais),
                "size": "Tamanho padronizado (ex: 4, 6, P, M)",
                "color": "Cor extraída",
                "colorCode": "Código da cor (se houver)"
            },
            "confidence": "high/medium/low",
            "notes": "Explicação curta"
        }

        Se não encontrar o produto no catálogo com certeza, retorne "found": false.
        `;

        try {
            const thread = await this.openai.beta.threads.create({
                messages: [
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            });

            const run = await this.openai.beta.threads.runs.createAndPoll(
                thread.id,
                { assistant_id: this.assistantId }
            );

            if (run.status === 'completed') {
                const messages = await this.openai.beta.threads.messages.list(thread.id);
                const responseText = messages.data[0].content[0].text.value;

                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
            }
            return { found: false, error: run.status };
        } catch (e) {
            console.error('[CatalogAssistant] Analyze Error:', e);
            return { found: false, error: e.message };
        }
    }
}

module.exports = new CatalogAssistantService();
