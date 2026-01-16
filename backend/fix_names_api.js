const axios = require('axios');

// Configuration
const TARGET_CAMPAIGN_ID = 12;
const WRONG_SUFFIX = 'Lili Sampedro Jan 26';
const CORRECT_SUFFIX_TEXT = 'Precoce Jan 26';

const API_URL = 'https://n8n-apintegromat.r954jc.easypanel.host';
const API_TOKEN = '123456';

async function fixNamesViaApi() {
    try {
        console.log('--- Fixing Product Names via API ---');
        console.log(`Campaign ID: ${TARGET_CAMPAIGN_ID}`);
        console.log(`Replacing "${WRONG_SUFFIX}" with "${CORRECT_SUFFIX_TEXT}"...`);

        // 1. Fetch Orders in Campaign 12
        console.log('Fetching orders...');
        const response = await axios.get(`${API_URL}/orders?limit=1000&campaignId=${TARGET_CAMPAIGN_ID}`, {
            headers: { 'x-api-token': API_TOKEN }
        });

        const orders = response.data.data;
        console.log(`Fetched ${orders.length} orders in campaign.`);

        let updatedCount = 0;

        for (const order of orders) {
            if (!order.productRaw) continue;

            if (order.productRaw.includes(WRONG_SUFFIX)) {
                let newName = order.productRaw;

                // Correction Logic
                // 1. Remove recursive " ou Lili..."
                newName = newName.replace(/ ou campanha teste/gi, '');
                newName = newName.replace(/ ou Lili Sampedro Jan 26/g, '');
                // 2. Replace main occurrence
                newName = newName.replace(/Lili Sampedro Jan 26/g, CORRECT_SUFFIX_TEXT);

                if (newName !== order.productRaw) {
                    console.log(`[Order ${order.id}] Renaming: \n   FROM: ${order.productRaw}\n   TO:   ${newName}`);

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
        }

        console.log('-----------------------------------');
        console.log(`Total Updates: ${updatedCount}`);

    } catch (error) {
        console.error('Script failed:', error.response?.data || error.message);
    }
}

fixNamesViaApi();
