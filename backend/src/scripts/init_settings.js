const sequelize = require('../config/database');
const Setting = require('../models/Setting');

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
            description: 'Texto adicionado ao final da descrição do produto (Coleção)'
        });

        console.log('Settings initialized.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

initSettings();
