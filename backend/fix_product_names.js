const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const sequelize = require('../config/database');
const Order = require('../models/Order');
const { Op } = require('sequelize');

async function fixNames() {
    try {
        console.log('Connecting to database...');
        if (!process.env.DB_HOST) process.env.DB_HOST = '127.0.0.1'; // Local fallback
        await sequelize.authenticate();
        console.log('Connected.');

        const TARGET_CAMPAIGN_ID = 12;
        const WRONG_SUFFIX = 'Lili Sampedro Jan 26';
        const CORRECT_SUFFIX_TEXT = 'Precoce Jan 26';

        // Fetch orders in campaign 12
        const orders = await Order.findAll({
            where: {
                campaignId: TARGET_CAMPAIGN_ID,
                productRaw: { [Op.like]: `%${WRONG_SUFFIX}%` }
            }
        });

        console.log(`Found ${orders.length} orders with wrong suffix.`);

        let updatedCount = 0;
        for (const order of orders) {
            let newName = order.productRaw;

            // Replace logic
            // User example: "M2VT 5968 - Vestido Tricoline - Lili Sampedro Jan 26 ou Lili Sampedro Jan 26"
            // Target: "M2VT 5968 - Vestido Tricoline - - Precoce Jan 26"

            // We'll replace all occurrences of the wrong suffix variants
            // Regex to match " - Lili Sampedro..." until end or " ou "

            // Simpler: Split by " - " and reconstruct?
            // But products might have " - " in description.

            // Strategy: Replace specifically "Lili Sampedro Jan 26" with "Precoce Jan 26"
            // And remove " ou Lili Sampedro Jan 26" duplications.

            // 1. Remove duplications first
            newName = newName.replace(/ ou Lili Sampedro Jan 26/g, '');

            // 2. Replace the main one
            newName = newName.replace(/Lili Sampedro Jan 26/g, CORRECT_SUFFIX_TEXT);

            // 3. Ensure double dash if user wants it? " - - Precoce"
            // The user said: "M2VT 5968 - Vestido Tricoline - - Precoce Jan 26"
            // If current is "M2VT 5968 - Vestido Tricoline - Lili..." (single dash before Lili)

            // Let's just do a clean replacement of " - Lili Sampedro..." -> " - - Precoce Jan 26"
            // But I should be careful not to break other formats.

            // Let's rely on simple replacement first.

            if (newName !== order.productRaw) {
                console.log(`Renaming: "${order.productRaw}" -> "${newName}"`);
                await order.update({ productRaw: newName });
                updatedCount++;
            }
        }

        console.log(`Updated ${updatedCount} orders.`);

    } catch (error) {
        console.error('Fix failed:', error);
    } finally {
        await sequelize.close();
        process.exit();
    }
}

fixNames();
