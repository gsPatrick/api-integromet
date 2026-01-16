const axios = require('axios');

// Buscar cliente no Bling via API do sistema
const API_URL = 'https://n8n-apintegromat.r954jc.easypanel.host';
const API_TOKEN = '123456';
const PHONE_TO_SEARCH = '556198510713';

async function findClientViaDashboard() {
    try {
        console.log('--- Buscando Cliente no Sistema ---');
        console.log(`Telefone: ${PHONE_TO_SEARCH}`);

        // 1. Buscar pedidos deste cliente no sistema
        const response = await axios.get(`${API_URL}/orders?limit=100`, {
            headers: { 'x-api-token': API_TOKEN }
        });

        const orders = response.data.data || [];

        // Filtrar pedidos desta cliente
        const clientOrders = orders.filter(o =>
            o.customerPhone && o.customerPhone.includes('98510713')
        );

        if (clientOrders.length === 0) {
            console.log('Nenhum pedido encontrado para este telefone.');
            return;
        }

        console.log(`\nEncontrados ${clientOrders.length} pedidos para este cliente:\n`);

        clientOrders.forEach(order => {
            console.log(`Order #${order.id}:`);
            console.log(`  Nome: ${order.customerName}`);
            console.log(`  Telefone: ${order.customerPhone}`);
            console.log(`  Produto: ${order.productRaw}`);
            console.log(`  Status: ${order.status}`);
            console.log(`  Bling ID: ${order.blingId || 'Não sincronizado'}`);
            console.log('');
        });

        // 2. Se tiver blingId, o cliente foi criado/encontrado no Bling
        const syncedOrders = clientOrders.filter(o => o.blingId);
        if (syncedOrders.length > 0) {
            console.log(`✓ ${syncedOrders.length} pedidos sincronizados com Bling.`);
            console.log('O cliente existe no Bling (foi encontrado ou criado durante sync).');
        } else {
            console.log('✗ Nenhum pedido deste cliente foi sincronizado com Bling ainda.');
        }

    } catch (error) {
        console.error('Erro:', error.response?.data || error.message);
    }
}

findClientViaDashboard();
