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
        console.log('[CatalogAssistant] OpenAI client keys:', Object.keys(this.openai));
        if (this.openai.beta) {
            console.log('[CatalogAssistant] OpenAI.beta keys:', Object.keys(this.openai.beta));
        } else {
            console.error('[CatalogAssistant] OpenAI.beta is UNDEFINED!');
        }

        // 1. Create Vector Store
        if (!this.vectorStoreId) {
            const vectorStore = await this.openai.beta.vectorStores.create({
                name: "Catalogos de Vendas"
            });
            this.vectorStoreId = vectorStore.id;
            console.log('[CatalogAssistant] Vector Store created:', this.vectorStoreId);

            // Persist for future restarts
            await SettingsController.updateValue('openai_vector_store_id', this.vectorStoreId);
        }

        // 2. Create Assistant
        if (!this.assistantId) {
            const assistant = await this.openai.beta.assistants.create({
                name: "Assistente de Catálogo",
                instructions: `Você é um assistente especializado em consultar catálogos de produtos em PDF.
                Sua função é fornecer o PREÇO e CÓDIGO de produtos quando solicitado.
                
                Sempre que perguntado sobre um produto:
                1. Busque no PDF usando file_search.
                2. Retorne o Código, Descrição Completa e Preço (identificando variações por tamanho se houver).
                3. Se não encontrar, diga claramente que não achou.`,
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
        await this.openai.beta.vectorStores.files.create(
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
    async searchCatalog(query) {
        await this.initialize();
        console.log('[CatalogAssistant] Searching catalog for:', query);

        // Create a thread
        const thread = await this.openai.beta.threads.create({
            messages: [
                {
                    role: "user",
                    content: `Busque no catálogo e me informe o preço e código para: "${query}".
                    Retorne APENAS um JSON no formato:
                    {
                        "encontrado": boolean,
                        "produtos": [
                            { "codigo": "string", "nome": "string", "preco": number, "tamanhos_precos": { "1-3": 0, "4-8": 0 } }
                        ]
                    }`
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
}

module.exports = new CatalogAssistantService();
