const fs = require('fs');
const pdf = require('pdf-parse');

async function checkPdf(path) {
    const dataBuffer = fs.readFileSync(path);
    const data = await pdf(dataBuffer);
    console.log(`\n--- CONTENT OF ${path.split('/').pop()} (First 500 chars) ---`);
    console.log(data.text.substring(0, 500));
    console.log('\n--- SEARCHING FOR "R$" ---');
    console.log(data.text.includes('R$') ? 'Found R$' : 'No R$ found');
    console.log('\n--- SEARCHING FOR CODES (Example) ---');
    const codes = data.text.match(/\d{4,6}/g);
    console.log('Potential codes found:', codes ? codes.slice(0, 5) : 'None');
}

(async () => {
    await checkPdf('/Users/patricksiqueira/Integromat/backend/MI26_CA ANTECIPADO (1).pdf');
    await checkPdf('/Users/patricksiqueira/Integromat/backend/Catalogo Milon Inverno 2026 - Pg Dupla Baixa (1).pdf');
})();
