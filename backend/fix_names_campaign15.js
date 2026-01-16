const axios = require('axios');

// Configuration for Campaign 15
const TARGET_CAMPAIGN_ID = 15;
const CORRECT_SUFFIX = 'Skip Hop Jan 26';

const API_URL = 'https://n8n-apintegromat.r954jc.easypanel.host';
const API_TOKEN = '123456';

async function fixNamesViaApi() {
    try {
        console.log('--- Fixing Product Names for Campaign 15 ---');
        console.log(`Campaign ID: ${TARGET_CAMPAIGN_ID}`);
        console.log(`Correct Suffix: "${CORRECT_SUFFIX}"`);

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

            // Check if name is dirty (has " ou " concatenations or wrong campaign names)
            const dirty = order.productRaw.includes(' ou ') ||
                order.productRaw.toLowerCase().includes('campanha teste') ||
                order.productRaw.includes('Lili Sampedro') ||
                order.productRaw.includes('Pronta Entrega');

            if (dirty) {
                let newName = order.productRaw;

                // Strategy: Split by " - " to get base product info, then reconstruct
                // OR: Remove all " ou [anything]" patterns and keep first campaign mention

                // Approach: Remove all " ou [Campaign Name]" patterns
                // Common wrong patterns:
                // " ou Skip Hop Jan 26"
                // " ou Lili Sampedro Jan 26"
                // " ou Pronta Entrega"
                // " ou campanha teste"

                // Remove ALL " ou [anything that looks like campaign]"
                newName = newName.replace(/ ou Skip Hop Jan 26/gi, '');
                newName = newName.replace(/ ou Lili Sampedro Jan 26/gi, '');
                newName = newName.replace(/ ou Pronta Entrega/gi, '');
                newName = newName.replace(/ ou campanha teste/gi, '');

                // Remove standalone wrong suffixes at the end
                newName = newName.replace(/ - Lili Sampedro Jan 26$/gi, '');
                newName = newName.replace(/ - Pronta Entrega$/gi, '');
                newName = newName.replace(/ - campanha teste$/gi, '');

                // If name doesn't end with correct suffix, check if we need to add/replace
                // First, let's check if it has " - Skip Hop Jan 26" at the end
                if (!newName.endsWith(CORRECT_SUFFIX)) {
                    // Maybe it has wrong suffix, let's find last " - " and check
                    const lastDashIndex = newName.lastIndexOf(' - ');
                    if (lastDashIndex > 0) {
                        const possibleSuffix = newName.substring(lastDashIndex + 3);
                        // Check if this suffix is a wrong campaign name
                        const wrongSuffixes = ['Lili Sampedro Jan 26', 'Pronta Entrega', 'campanha teste', 'Fada Lulu'];
                        if (wrongSuffixes.some(ws => possibleSuffix.toLowerCase().includes(ws.toLowerCase()))) {
                            // Replace suffix
                            newName = newName.substring(0, lastDashIndex) + ' - ' + CORRECT_SUFFIX;
                        }
                    }
                }

                // Clean double dashes
                newName = newName.replace(/ - - /g, ' - ');
                newName = newName.replace(/  /g, ' ');

                // Trim
                newName = newName.trim();

                if (newName !== order.productRaw) {
                    console.log(`[Order ${order.id}] Renaming:`);
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
        }

        console.log('-----------------------------------');
        console.log(`Total Updates: ${updatedCount}`);

    } catch (error) {
        console.error('Script failed:', error.response?.data || error.message);
    }
}

fixNamesViaApi();
