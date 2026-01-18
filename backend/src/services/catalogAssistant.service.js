const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const CatalogProduct = require('../models/CatalogProduct');
const SettingsController = require('../controllers/settings.controller');

class CatalogAssistantService {
    constructor() {
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        this.assistantId = null;
        this.vectorStoreId = null;
        this.isInitialized = false;
    }

    /**
     * Initializes the Assistant if not already created
     */
    async initialize() {
        if (this.isInitialized) return;

        // Load IDs from settings DB
        this.assistantId = await SettingsController.getValue('openai_assistant_id', process.env.OPENAI_ASSISTANT_ID);
        this.vectorStoreId = await SettingsController.getValue('openai_vector_store_id', process.env.OPENAI_VECTOR_STORE_ID);

        // REMOVED early return (bug fix for 404 verification)
        // if (this.assistantId && this.vectorStoreId) return;

        console.log('[CatalogAssistant] Initializing OpenAI Assistant...');

        // 1. Verify and Create Vector Store
        if (this.vectorStoreId) {
            try {
                // Verify if it still exists on OpenAI
                const vsApi = this.openai.beta.vectorStores || this.openai.vectorStores;
                await vsApi.retrieve(this.vectorStoreId);
            } catch (error) {
                console.warn(`[CatalogAssistant] Vector Store ${this.vectorStoreId} not found on OpenAI (404). Creating a new one...`);
                this.vectorStoreId = null; // Reset to force creation
            }
        }

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

            // Auto-Sync: Re-upload existing catalogs to the new store
            this.syncVectorStore();
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

        if (this.assistantId) {
            try {
                await this.openai.beta.assistants.retrieve(this.assistantId);
            } catch (error) {
                console.warn(`[CatalogAssistant] Assistant ${this.assistantId} not found on OpenAI (404). Creating a new one...`);
                this.assistantId = null;
            }
        }

        if (!this.assistantId) {
            const assistant = await this.openai.beta.assistants.create({
                name: "Assistente de Catálogo",
                instructions: instructions,
                model: "gpt-4o",
                model: "gpt-4o",
                tools: [{ type: "file_search" }, { type: "code_interpreter" }],
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
                    model: "gpt-4o", // Ensure using capable model
                    tools: [{ type: "file_search" }, { type: "code_interpreter" }]
                });
                console.log('[CatalogAssistant] Assistant instructions updated with Dual PDF capabilities + Code Interpreter');
            } catch (e) {
                console.warn('[CatalogAssistant] Failed to update instructions:', e.message);
            }
        }

        this.isInitialized = true;
    }

    // ... uploadCatalogPdf ...

    // ... searchCatalog ...

    // ... analyzeOrder ...

    /**
     * Extracts ALL products from a specific file using Code Interpreter
     * Used for populating the database after upload
     */
    async extractAllProducts(fileId) {
        await this.initialize();
        console.log(`[CatalogAssistant] Extracting ALL products from Ref File: ${fileId}`);

        const prompt = `
        ANALISE O ARQUIVO ANEXADO (ID: ${fileId}).
        
        OBJETIVO:
        Extrair TODOS os produtos (Código/Ref e Preço) deste catálogo PDF.
        Catálogos podem ser visuais. Use Python (Code Interpreter) para ler texto e tabelas se necessário, ou File Search.

        SAÍDA OBRIGATÓRIA (JSON Puro):
        [
            { "code": "REF123", "price": 99.90, "name": "Nome Opcional" },
            { "code": "REF124", "price": 109.90 }
        ]
        
        Regras:
        1. Ignore símbolos de moeda (R$). Use ponto para decimais.
        2. Seja exaustivo. Tente listar TUDO o que encontrar.
        3. Se não encontrar nada, retorne [].
        `;

        try {
            const thread = await this.openai.beta.threads.create({
                messages: [
                    {
                        role: "user",
                        content: prompt,
                        attachments: [
                            { file_id: fileId, tools: [{ type: "code_interpreter" }, { type: "file_search" }] }
                        ]
                    }
                ]
            });

            // Start Run
            const run = await this.openai.beta.threads.runs.createAndPoll(
                thread.id,
                { assistant_id: this.assistantId }
            );

            if (run.status === 'completed') {
                const messages = await this.openai.beta.threads.messages.list(thread.id);
                const responseText = messages.data[0].content[0].text.value;

                // Extract JSON array
                const jsonMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
                if (jsonMatch) {
                    const products = JSON.parse(jsonMatch[0]);
                    console.log(`[CatalogAssistant] Extracted ${products.length} products via Assistant.`);
                    return products;
                }

                console.warn('[CatalogAssistant] No JSON array found in response:', responseText.substring(0, 100));
                return [];
            } else {
                console.error('[CatalogAssistant] Extraction run failed:', run.status);
                return [];
            }
        } catch (e) {
            console.error('[CatalogAssistant] Extraction Error:', e.message);
            return [];
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
                                "arquivo_origem": "Nome do arquivo PDF onde foi encontrado (Ex: catalogo_verao.pdf)",
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


    /**
     * Re-uploads all active catalogs from DB to the current Vector Store
     * Triggered automatically when a new Vector Store is created (e.g. key rotation)
     */
    async syncVectorStore() {
        try {
            console.log('[CatalogAssistant] Syncing catalogs to new Vector Store...');

            // Find all active catalog metadata
            const catalogs = await CatalogProduct.findAll({
                where: {
                    code: 'CATALOG_META',
                    isActive: true
                }
            });

            if (catalogs.length === 0) {
                console.log('[CatalogAssistant] No catalogs found to sync.');
                return;
            }

            console.log(`[CatalogAssistant] Found ${catalogs.length} catalogs to sync.`);

            for (const cat of catalogs) {
                if (cat.pdfPath && fs.existsSync(cat.pdfPath)) {
                    try {
                        console.log(`[CatalogAssistant] Auto-reuploading: ${cat.catalogName}`);
                        await this.uploadCatalogPdf(cat.pdfPath, cat.catalogName);
                    } catch (e) {
                        console.error(`[CatalogAssistant] Failed to sync ${cat.catalogName}:`, e.message);
                    }
                } else {
                    console.warn(`[CatalogAssistant] File not found for sync: ${cat.catalogName}`);
                }
            }

            console.log('[CatalogAssistant] Sync completed.');

        } catch (error) {
            console.error('[CatalogAssistant] Error running syncVectorStore:', error);
        }
    }

    /**
     * Extracts ALL products from a specific file using File Search (Faster)
     * Optmized for speed as per user request.
     */
    async extractAllProductsFast(fileId) {
        await this.initialize();
        console.log(`[CatalogAssistant] Extracting products from Ref File: ${fileId} using File Search (Optimized)...`);

        const prompt = `
        ANALISE O ARQUIVO ANEXADO (ID: ${fileId}).
        
        OBJETIVO:
        Extrair TODOS os produtos (mais de 60 itens esperados).
        
        IMPORTANTE:
        O método "File Search" falhou em pegar todos.
        POR FAVOR, USE **CODE INTERPRETER** (PYTHON) PARA:
        1. Ler o PDF página por página (biblioteca pypdf ou fitz).
        2. Extrair o texto de CADA página.
        3. Identificar padrões de PRODUTO + PREÇO.
           - Padrão comum: "NOME DO PRODUTO R$ 123,00" ou "REF123 ... R$ 99,90".
        4. Compilar uma lista EXAUSTIVA.
        
        SAÍDA (JSON Puro):
        [
            { "code": "REF ou NOME", "name": "Nome", "price": 99.90 },
            ...
        ]
        
        Regras:
        1. Se não houver código explícito, USE O NOME como code.
        2. Percorra TODAS as páginas. Não pule nenhuma.
        3. Ignore itens sem preço.
        `;

        try {
            const thread = await this.openai.beta.threads.create({
                messages: [
                    {
                        role: "user",
                        content: prompt,
                        attachments: [
                            { file_id: fileId, tools: [{ type: "code_interpreter" }] }
                        ]
                    }
                ]
            });

            // Start Run (Faster)
            const run = await this.openai.beta.threads.runs.createAndPoll(
                thread.id,
                { assistant_id: this.assistantId }
            );

            if (run.status === 'completed') {
                const messages = await this.openai.beta.threads.messages.list(thread.id);
                const responseText = messages.data[0].content[0].text.value;

                // Extract JSON array
                const jsonMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
                if (jsonMatch) {
                    const products = JSON.parse(jsonMatch[0]);
                    console.log(`[CatalogAssistant] Extracted ${products.length} products via File Search.`);
                    return products;
                }

                // Fallback attempt to parse loose format if JSON fails
                console.warn('[CatalogAssistant] No JSON array found in response:', responseText.substring(0, 100));
                return [];
            } else {
                console.error('[CatalogAssistant] Extraction run failed:', run.status);
                return [];
            }
        } catch (e) {
            console.error('[CatalogAssistant] Extraction Error:', e.message);
            return [];
        }
    }
}

module.exports = new CatalogAssistantService();
