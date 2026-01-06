const blingService = require('../services/bling.service');
const BlingToken = require('../models/BlingToken');

class AuthController {

  /**
   * GET /auth/bling/start
   * Redirects user to Bling Authorization URL
   */
  startBlingAuth(req, res) {
    const clientId = process.env.BLING_CLIENT_ID;
    const callbackUrl = process.env.BLING_CALLBACK_URL;
    const state = 'setup_bling_v3'; // Optional state check

    if (!clientId || !callbackUrl) {
      return res.status(500).send('Missing BLING_CLIENT_ID or BLING_CALLBACK_URL in server environment.');
    }

    const authUrl = `https://www.bling.com.br/Api/v3/oauth/authorize?response_type=code&client_id=${clientId}&state=${state}`;

    // Redirect the user's browser to Bling
    res.redirect(authUrl);
  }

  /**
   * GET /auth/bling/callback
   * Handles return from Bling with `code`
   */
  async handleBlingCallback(req, res) {
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).send('Error: Missing authorization code from Bling.');
    }

    try {
      // Exchange code for tokens
      await blingService.handleInitialAuth(code);

      // Return success HTML
      // Note: In production you might want to redirect to frontend URL from ENV
      const frontendUrl = 'http://localhost:3001/configuracoes';

      res.send(`
        <html>
          <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #f0fdf4;">
            <h1 style="color: #166534;">Integração Realizada com Sucesso! 🎉</h1>
            <p>O Bling foi conectado ao seu sistema.</p>
            <a href="${frontendUrl}" style="padding: 10px 20px; background: #166534; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px;">Voltar para Configurações</a>
            <script>
              setTimeout(() => { window.location.href = '${frontendUrl}'; }, 5000);
            </script>
          </body>
        </html>
      `);

    } catch (error) {
      console.error('[Auth] Bling callback failed:', error);
      res.status(500).send(`
        <html>
          <body style="font-family: sans-serif; color: #991b1b; text-align: center; padding: 50px;">
            <h1>Erro na Integração</h1>
            <p>${error.message}</p>
            <button onclick="window.history.back()">Tentar Novamente</button>
          </body>
        </html>
      `);
    }
  }

  /**
   * GET /integrations/status
   * Checks if we have valid tokens
   */
  async getIntegrationStatus(req, res) {
    try {
      const token = await BlingToken.findOne({ order: [['id', 'DESC']] });

      const isConnected = !!token && !!token.accessToken;

      res.json({ blingConnected: isConnected });
    } catch (error) {
      console.error('[Auth] Status check failed:', error);
      res.status(500).json({ blingConnected: false, error: 'Failed to check status' });
    }
  }

  /**
   * DELETE /auth/bling/disconnect
   * Removes all Bling tokens
   */
  async disconnectBling(req, res) {
    try {
      await BlingToken.destroy({ where: {} });
      console.log('[Auth] Bling disconnected (tokens cleared).');
      res.json({ success: true, message: 'Disconnected' });
    } catch (error) {
      console.error('[Auth] Disconnect failed:', error);
      res.status(500).json({ error: 'Failed to disconnect' });
    }
  }
}

module.exports = new AuthController();
