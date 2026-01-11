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
     * Create payment link (cobrança) in Asaas
     * @param {string} customerId - Asaas customer ID (cus_xxx)
     * @param {number} orderId - Local order ID (for externalReference)
     * @param {number} value - Payment value
     * @param {string} description - Payment description
     * @returns {object} - { id, invoiceUrl }
     */
    async createPaymentLink(customerId, orderId, value, description) {
        try {
            const headers = await this.getHeaders();

            // Calculate due date (3 days from now)
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 3);
            const dueDateStr = dueDate.toISOString().split('T')[0]; // YYYY-MM-DD

            const payload = {
                customer: customerId,
                billingType: 'UNDEFINED', // Allow PIX, Card, Boleto
                value: parseFloat(value),
                dueDate: dueDateStr,
                description: description || `Pedido #${orderId}`,
                externalReference: String(orderId) // Critical: links Asaas to our Order.id
            };

            console.log(`[Asaas] Creating payment: R$ ${value} for customer ${customerId}`);

            const response = await axios.post(
                `${this.baseUrl}/payments`,
                payload,
                { headers }
            );

            console.log(`[Asaas] Payment created: ${response.data.id} - ${response.data.invoiceUrl}`);

            return {
                id: response.data.id,           // pay_xxx
                invoiceUrl: response.data.invoiceUrl, // Link to send to customer
                status: response.data.status
            };
        } catch (error) {
            console.error('[Asaas] Error creating payment:', error.response?.data || error.message);
            throw new Error('Falha ao criar link de pagamento: ' + (error.response?.data?.errors?.[0]?.description || error.message));
        }
    }

    /**
     * Complete flow: upsert customer and create payment link
     * @param {object} orderData - Order data containing customer info and value
     * @returns {object} - { asaasId, paymentLink }
     */
    async generatePaymentLink(orderData) {
        const { customerName, customerPhone, orderId, totalValue, description } = orderData;

        // 1. Upsert customer
        const customerId = await this.upsertCustomer(customerName, customerPhone);

        // 2. Create payment
        const payment = await this.createPaymentLink(
            customerId,
            orderId,
            totalValue,
            description || `Pedido #${orderId} - ${customerName}`
        );

        return {
            asaasId: payment.id,
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
