const blingService = require('../services/bling.service');

class BlingController {

    /**
     * Endpoint to handle the callback from Bling or manual code entry.
     * GET /setup/bling?code=...
     */
    async handleSetup(req, res) {
        const { code } = req.query;

        if (!code) {
            return res.status(400).send('Missing "code" query parameter. Please authorize via Bling first.');
        }

        try {
            await blingService.handleInitialAuth(code);
            return res.status(200).send('<h1>Bling Setup Successful!</h1><p>Tokens saved. You can now close this window.</p>');
        } catch (error) {
            console.error('[BlingController] Setup failed:', error);
            return res.status(500).send(`<h1>Setup Failed</h1><p>${error.message}</p>`);
        }
    }
}

module.exports = new BlingController();
