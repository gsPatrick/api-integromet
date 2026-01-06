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

        console.log('Settings initialized.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

initSettings();
