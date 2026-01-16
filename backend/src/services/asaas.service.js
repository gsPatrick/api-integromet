/**
 * Asaas Payment Service
 * API v3 Integration for payment link generation
 * 
 * Endpoints:
 * - Production: https://api.asaas.com/v3
 * - Sandbox: https://sandbox.asaas.com/api/v3
 */

const axios = require('axios');
const SettingsController = require('../controllers/settings.controller');

class AsaasService {

    constructor() {
        // Default to production, can be changed to sandbox for testing
        this.baseUrl = process.env.ASAAS_SANDBOX === 'true'
            ? 'https://sandbox.asaas.com/api/v3'
            : 'https://api.asaas.com/v3';
    }

    /**
     * Get headers with API key from settings
     */
    async getHeaders() {
        const apiKey = await SettingsController.getValue('asaas_api_key', '');

        if (!apiKey) {
            throw new Error('API Key do Asaas não configurada. Configure em Configurações.');
        }

        return {
            'access_token': apiKey,
            'Content-Type': 'application/json'
        };
    }

    /**
     * Search for existing customer by phone number
     * @param {string} phone - Customer phone number
     * @returns {string|null} - Customer ID if found, null otherwise
     */
    async findCustomerByPhone(phone) {
        try {
            const headers = await this.getHeaders();

            // Clean phone number (remove non-digits)
            const cleanPhone = phone.replace(/\D/g, '');

            const response = await axios.get(
                `${this.baseUrl}/customers?mobilePhone=${cleanPhone}`,
                { headers }
            );

            if (response.data.totalCount > 0) {
                return response.data.data[0].id;
            }

            return null;
        } catch (error) {
            console.error('[Asaas] Error searching customer:', error.response?.data || error.message);
            return null;
        }
    }

    /**
     * Create a new customer in Asaas
     * @param {object} customerData - Customer data
     * @returns {string} - Customer ID
     */
    async createCustomer(customerData) {
        try {
            const headers = await this.getHeaders();

            // Build payload with available data
            const payload = {
                name: customerData.name,
                mobilePhone: customerData.phone?.replace(/\D/g, ''),
                notificationDisabled: false
            };

            // Add optional fields if available
            if (customerData.cpfCnpj) {
                payload.cpfCnpj = customerData.cpfCnpj.replace(/\D/g, '');
            }
            if (customerData.email) {
                payload.email = customerData.email;
            }

            const response = await axios.post(
                `${this.baseUrl}/customers`,
                payload,
                { headers }
            );

            console.log(`[Asaas] Customer created: ${response.data.id}`);
            return response.data.id;
        } catch (error) {
            console.error('[Asaas] Error creating customer:', error.response?.data || error.message);
            throw new Error('Falha ao criar cliente no Asaas: ' + (error.response?.data?.errors?.[0]?.description || error.message));
        }
    }

    /**
     * Upsert customer - find existing or create new
     * @param {string} name - Customer name
     * @param {string} phone - Customer phone
     * @param {string} cpfCnpj - CPF or CNPJ (optional)
     * @param {string} email - Email (optional)
     * @returns {string} - Customer ID
     */
    async upsertCustomer(name, phone, cpfCnpj = null, email = null) {
        console.log(`[Asaas] Upserting customer: ${name} - ${phone}`);

        // First, try to find existing customer by phone
        const existingId = await this.findCustomerByPhone(phone);

        if (existingId) {
            console.log(`[Asaas] Found existing customer: ${existingId}`);
            return existingId;
        }

        // If not found, create new
        return await this.createCustomer({ name, phone, cpfCnpj, email });
    }

    /**
     * Create payment link (Page Checkout) in Asaas
     * This method allows creating a payment link without a pre-existing validated customer (no CPF needed).
     * The customer fills their info at checkout.
     * @param {number} orderId - Local order ID
     * @param {number} value - Payment value
     * @param {string} name - Link name (e.g. Order #123)
     * @param {string} description - Description
     * @returns {object} - { id, invoiceUrl }
     */
    async createPaymentLink(orderId, value, name, description, maxInstallmentCount) {
        try {
            const headers = await this.getHeaders();
            const dueDateLimitDays = 3;

            const payload = {
                name: name || `Pedido #${orderId}`,
                description: description || `Pedido #${orderId}`,
                endDate: null,
                value: parseFloat(value),
                billingType: 'UNDEFINED',
                chargeType: 'DETACHED',   // One-time charge
                dueDateLimitDays: dueDateLimitDays,
                maxInstallmentCount: maxInstallmentCount || 1
            };

            console.log(`[Asaas] Creating Payment Link (Checkout V3): R$ ${value} - ${payload.name}`);

            const response = await axios.post(
                `${this.baseUrl}/paymentLinks`,
                payload,
                { headers }
            );

            console.log(`[Asaas] Payment Link created: ${response.data.id} - ${response.data.url}`);

            return {
                id: response.data.id,
                invoiceUrl: response.data.url,
                status: 'ACTIVE'
            };
        } catch (error) {
            console.error('[Asaas] Error creating payment link:', error.response?.data || error.message);
            throw new Error('Falha ao criar link de pagamento (NOVO V3): ' + (error.response?.data?.errors?.[0]?.description || error.message));
        }
    }

    /**
     * Complete flow: Create payment link (Checkout Page)
     * We SKIP upsertCustomer because we want to allow payment without knowing CPF.
     * @param {object} orderData - Order data
     * @returns {object} - { asaasId, paymentLink }
     */
    async generatePaymentLink(orderData) {
        const { customerName, orderId, totalValue, description, linkName } = orderData;

        // Direct call to createPaymentLink (Checkout Page)
        // Use provided linkName (title) or fallback
        const name = linkName || `Pedido #${orderId} - ${customerName}`;

        const payment = await this.createPaymentLink(
            orderId,
            totalValue,
            name,
            description || `Pedido no WhatsApp`,
            orderData.maxInstallmentCount
        );

        return {
            asaasId: payment.id,     // This will be the PAYMENT LINK ID now, not Charge ID.
            paymentLink: payment.invoiceUrl,
            status: payment.status
        };
    }

    /**
     * Validate webhook token
     * @param {string} receivedToken - Token from webhook header
     * @returns {boolean}
     */
    async validateWebhookToken(receivedToken) {
        const apiKey = await SettingsController.getValue('asaas_api_key', '');
        return receivedToken === apiKey;
    }
}

module.exports = new AsaasService();
