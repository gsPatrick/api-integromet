const axios = require('axios');

// Test finding a client in Bling
const API_URL = 'https://n8n-apintegromat.r954jc.easypanel.host';
const API_TOKEN = '123456';

const PHONE_TO_SEARCH = '556198510713';

async function testFindClient() {
    try {
        console.log('--- Testing Bling Client Search ---');
        console.log(`Phone: ${PHONE_TO_SEARCH}`);

        // First, let's get details from one of the debug endpoints or directly call the Bling API
        // Since we don't have direct access to Bling tokens locally, let's create a test endpoint

        // For now, let's search using variations
        const variations = [
            PHONE_TO_SEARCH,                    // Full: 556198510713
            PHONE_TO_SEARCH.slice(2),           // Without country: 6198510713
            PHONE_TO_SEARCH.slice(4),           // Without country+state: 98510713
            '61' + PHONE_TO_SEARCH.slice(4),    // With DDD: 6198510713
            '(61) 98510-713',                   // Formatted
            '61985107130'                       // Common typo
        ];

        console.log('Phone variations to search:', variations);
        console.log('\nThis script needs to run on the server to access Bling tokens.');
        console.log('Creating a test endpoint instead...');

    } catch (error) {
        console.error('Error:', error.message);
    }
}

testFindClient();
