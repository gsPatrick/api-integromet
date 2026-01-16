const axios = require('axios');

// Configuration for Campaign 15
const TARGET_CAMPAIGN_ID = 15;
const CORRECT_SUFFIX = ' - Skip Hop Jan 26';

const API_URL = 'https://n8n-apintegromat.r954jc.easypanel.host';
const API_TOKEN = '123456';

async function addSuffix() {
    try {
        console.log('--- Adding Suffix to Campaign 15 Orders ---');
        console.log(`Campaign ID: ${TARGET_CAMPAIGN_ID}`);
        console.log(`Suffix to add: "${CORRECT_SUFFIX}"`);

        // 1. Fetch Orders in Campaign 15
        console.log('Fetching orders...');
        const response = await axios.get(`${API_URL}/orders?limit=1000&campaignId=${TARGET_CAMPAIGN_ID}`, {
            headers: { 'x-api-token': API_TOKEN }
        });

        const orders = response.data.data;
        console.log(`Fetched ${orders.length} orders in campaign.`);

        let updatedCount = 0;

        for (const order of orders) {
            if (!order.productRaw) continue;

            // Check if it already ends with the correct suffix
            if (!order.productRaw.endsWith('Skip Hop Jan 26')) {
                const newName = order.productRaw + CORRECT_SUFFIX;

                console.log(`[Order ${order.id}] Adding suffix:`);
                console.log(`   FROM: ${order.productRaw}`);
                console.log(`   TO:   ${newName}`);

                try {
                    await axios.put(`${API_URL}/orders/${order.id}`, {
                        productRaw: newName
                    }, {
                        headers: { 'x-api-token': API_TOKEN }
                    });
                    updatedCount++;
                } catch (err) {
                    console.error(`Failed to update order ${order.id}:`, err.message);
                }
            }
        }

        console.log('-----------------------------------');
        console.log(`Total Updates: ${updatedCount}`);

    } catch (error) {
        console.error('Script failed:', error.response?.data || error.message);
    }
}

addSuffix();
