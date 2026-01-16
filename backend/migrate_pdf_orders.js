const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configuration
const PDF_FILENAME = 'Lookbook CP-Fantástico Planeta Precoce (5).pdf';
const TARGET_CAMPAIGN_ID = 12;
const API_URL = 'https://n8n-apintegromat.r954jc.easypanel.host';
const API_TOKEN = '123456';

async function run() {
    try {
        console.log('--- Starting Migration from PDF ---');
        console.log(`Target Campaign ID: ${TARGET_CAMPAIGN_ID}`);
        console.log(`PDF: ${PDF_FILENAME}`);

        // 1. Extract Codes from PDF
        const pdfPath = path.join(__dirname, PDF_FILENAME);
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const dataBuffer = new Uint8Array(fs.readFileSync(pdfPath));
        const pdf = await pdfjsLib.getDocument({ data: dataBuffer }).promise;

        const extractedCodes = new Set();
        const codeRegex = /\b[A-Z0-9]{2,}\s(\d{4})\b/; // Matches 'MVT 5934', 'M2CJ [5965]'

        console.log(`Scanning ${pdf.numPages} pages...`);

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const strings = textContent.items.map(item => item.str);

            strings.forEach(str => {
                const match = str.match(codeRegex);
                if (match) {
                    const code = match[1]; // The number part (e.g. 5934)
                    if (code !== '2026') { // Exclude year
                        extractedCodes.add(code);
                    }
                }
            });
        }

        const codeList = Array.from(extractedCodes);
        console.log(`Found ${codeList.length} unique codes.`);
        console.log('Samples:', codeList.slice(0, 10));

        if (codeList.length === 0) {
            console.log('No codes found. Aborting.');
            return;
        }

        // 2. Fetch All Orders
        console.log('Fetching orders from API...');
        const response = await axios.get(`${API_URL}/orders?limit=5000&status=PENDING`, {
            headers: { 'x-api-token': API_TOKEN }
        });

        // Note: The API returns { data: [...], ... } or just [...]?
        // Checking OrderController.listOrders: res.json({ data: orders, ... })
        const orders = response.data.data || [];
        console.log(`Fetched ${orders.length} pending orders.`);

        // 3. Find Matches
        const ordersToMove = [];

        orders.forEach(order => {
            if (!order.productRaw) return;
            // Check if productRaw contains any of the extracted codes
            // Simple string inclusion
            const matchedCode = codeList.find(c => order.productRaw.includes(c));

            if (matchedCode) {
                // Only move if not already in campaign 12
                if (order.campaignId !== TARGET_CAMPAIGN_ID) {
                    ordersToMove.push(order.id);
                }
            }
        });

        console.log(`Found ${ordersToMove.length} orders matching PDF codes (and not yet in campaign ${TARGET_CAMPAIGN_ID}).`);

        if (ordersToMove.length === 0) {
            console.log('No eligible orders found to move.');
            return;
        }

        // 4. Move Orders
        console.log(`Moving ${ordersToMove.length} orders to Campaign ${TARGET_CAMPAIGN_ID}...`);
        const moveResponse = await axios.put(`${API_URL}/orders/move`, {
            orderIds: ordersToMove,
            targetCampaignId: TARGET_CAMPAIGN_ID
        }, {
            headers: { 'x-api-token': API_TOKEN }
        });

        console.log('Success!', moveResponse.data);

    } catch (error) {
        console.error('Migration failed:', error.response?.data || error.message);
    }
}

run();
