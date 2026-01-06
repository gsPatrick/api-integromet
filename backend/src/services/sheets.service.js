const { google } = require('googleapis');

class SheetsService {
    constructor() {
        this.spreadsheetId = process.env.GOOGLE_SHEET_ID;
        this.scopes = ['https://www.googleapis.com/auth/spreadsheets'];

        // In a real scenario, you might load these from a file or env var JSON
        this.auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Handle escaped newlines
            },
            scopes: this.scopes,
        });

        this.sheets = google.sheets({ version: 'v4', auth: this.auth });
    }

    /**
     * Appends a new order row to the sheet
     * @param {Object} orderData 
     */
    async appendOrder(orderData) {
        if (!this.spreadsheetId) {
            console.warn('[SheetsService] No Spreadsheet ID configured. Skipping.');
            return;
        }

        try {
            console.log('[SheetsService] Appending row...');

            const values = [[
                new Date().toISOString(),
                orderData.id,
                orderData.customerName,
                orderData.customerPhone,
                orderData.productRaw,
                orderData.extractedSize,
                orderData.extractedColor,
                orderData.catalogPrice,
                orderData.sellPrice,
                orderData.status
            ]];

            await this.sheets.spreadsheets.values.append({
                spreadsheetId: this.spreadsheetId,
                range: 'A:J', // Adjust range/sheet name as needed
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: values
                }
            });

            console.log('[SheetsService] Row appended successfully.');

        } catch (error) {
            console.error('[SheetsService] Error appending to sheet:', error.message);
            // Non-blocking error
        }
    }
}

module.exports = new SheetsService();
