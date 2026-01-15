const sequelize = require('../config/database');
const Setting = require('../models/Setting');
const Campaign = require('../models/Campaign');

async function initSettings() {
    try {
        await sequelize.authenticate();
        await sequelize.sync(); // Create tables if missing

        await Setting.upsert({
            key: 'markup_percentage',
            value: '35',
            description: 'Percentual de lucro sobre o preço de catálogo'
        });

        await Setting.upsert({
            key: 'group_orders',
            value: 'false',
            description: 'Agrupar pedidos do mesmo cliente ao sincronizar'
        });

        // Asaas Integration Settings
        await Setting.upsert({
            key: 'asaas_api_key',
            value: '',
            description: 'API Key do Asaas (Produção ou Sandbox)'
        });

        await Setting.upsert({
            key: 'bling_id_status_paid',
            value: 'Atendido',
            description: 'Status/Situação no Bling quando pedido é pago (ex: Atendido)'
        });

        await Setting.upsert({
            key: 'campaign_description',
            value: 'Milon Inverno Jan 26',
            description: 'Sufixo para descrição dos produtos (ex: coleção/campanha)'
        });

        // Create default "Pronta Entrega" campaign if it doesn't exist
        const [defaultCampaign, created] = await Campaign.findOrCreate({
            where: { isDefault: true },
            defaults: {
                name: 'Pronta Entrega',
                description: 'Campanha padrão para pedidos que não pertencem a nenhuma campanha ativa',
                isActive: true,
                isDefault: true,
                markupPercentage: 35,
                targetGroups: [] // Global - applies to all groups
            }
        });

        if (created) {
            console.log('✅ Default "Pronta Entrega" campaign created (ID:', defaultCampaign.id, ')');
        } else {
            console.log('ℹ️ Default "Pronta Entrega" campaign already exists (ID:', defaultCampaign.id, ')');
        }

        console.log('Settings initialized.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

initSettings();

