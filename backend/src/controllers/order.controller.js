const Order = require('../models/Order');
const blingService = require('../services/bling.service');

class OrderController {

    /**
     * List orders with pagination
     * GET /orders?page=1&limit=20
     */
    async listOrders(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const offset = (page - 1) * limit;

            const { count, rows } = await Order.findAndCountAll({
                order: [['createdAt', 'DESC']],
                limit: limit,
                offset: offset
            });

            res.json({
                total: count,
                pages: Math.ceil(count / limit),
                currentPage: page,
                data: rows
            });
        } catch (error) {
            console.error('[OrderController] Error listing orders:', error);
            res.status(500).json({ error: 'Failed to list orders' });
        }
    }

    /**
     * Get single order
     * GET /orders/:id
     */
    async getOrder(req, res) {
        try {
            const order = await Order.findByPk(req.params.id);
            if (!order) {
                return res.status(404).json({ error: 'Order not found' });
            }
            res.json(order);
        } catch (error) {
            console.error('[OrderController] Error getting order:', error);
            res.status(500).json({ error: 'Failed to get order' });
        }
    }

    /**
     * Update order details
     * PUT /orders/:id
     * Body: { productRaw, extractedSize, extractedColor, sellPrice }
     */
    async updateOrder(req, res) {
        try {
            const { id } = req.params;
            const updates = req.body;

            // Filter allowed fields
            const allowedUpdates = {};
            if (updates.productRaw !== undefined) allowedUpdates.productRaw = updates.productRaw;
            if (updates.extractedSize !== undefined) allowedUpdates.extractedSize = updates.extractedSize;
            if (updates.extractedColor !== undefined) allowedUpdates.extractedColor = updates.extractedColor;
            if (updates.extractedColorCode !== undefined) allowedUpdates.extractedColorCode = updates.extractedColorCode;
            if (updates.sellPrice !== undefined) allowedUpdates.sellPrice = updates.sellPrice;
            if (updates.quantity !== undefined) allowedUpdates.quantity = updates.quantity;

            const [updated] = await Order.update(allowedUpdates, { where: { id } });

            if (!updated) {
                return res.status(404).json({ error: 'Order not found or no changes made' });
            }

            const updatedOrder = await Order.findByPk(id);
            res.json(updatedOrder);

        } catch (error) {
            console.error('[OrderController] Error updating order:', error);
            res.status(500).json({ error: 'Failed to update order' });
        }
    }

    /**
     * Force sync to Bling
     * POST /orders/:id/sync-bling
     */
    async syncOrderToBling(req, res) {
        try {
            const { id } = req.params;
            const order = await Order.findByPk(id);
            const SettingsController = require('./settings.controller'); // Lazy load

            if (!order) {
                return res.status(404).json({ error: 'Order not found' });
            }

            // Check if Grouping is Enabled
            const groupOrders = await SettingsController.getValue('group_orders', false);

            let ordersToSync = [order];

            if (groupOrders && order.customerPhone) {
                // Find other PENDING orders for the same customer
                const siblings = await Order.findAll({
                    where: {
                        customerPhone: order.customerPhone,
                        status: 'PENDING',
                        id: { [require('sequelize').Op.ne]: order.id } // Exclude current one
                    }
                });

                if (siblings.length > 0) {
                    ordersToSync = [...ordersToSync, ...siblings];
                    console.log(`[Sync] Grouping enabled. Found ${siblings.length} siblings for phone ${order.customerPhone}`);
                }
            }

            // Pass ARRAY of orders to service
            // We need to update existing service to handle single order (wrap in array) or array
            await blingService.executeOrder(ordersToSync);

            // Update status for ALL synced orders
            for (const o of ordersToSync) {
                o.status = 'PROCESSED';
                o.blingSyncedAt = new Date();
                await o.save();
            }

            res.json({
                message: 'Sync triggered successfully',
                count: ordersToSync.length,
                grouped: ordersToSync.length > 1
            });

        } catch (error) {
            console.error('[OrderController] Sync failed:', error);
            res.status(500).json({ error: 'Sync failed: ' + error.message });
        }
    }
    /**
     * Send Confirmation Message to Customer via WhatsApp
     * POST /orders/send-confirmation
     * Body: { orderIds: [1, 2, 3] }
     */
    async sendConfirmation(req, res) {
        const WhatsappService = require('../services/whatsapp.service');
        const SettingsController = require('./settings.controller');

        try {
            const { orderIds } = req.body;
            if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
                return res.status(400).json({ error: 'No orderIds provided' });
            }

            // Fetch orders
            const orders = await Order.findAll({
                where: {
                    id: { [require('sequelize').Op.in]: orderIds }
                }
            });

            if (orders.length === 0) {
                return res.status(404).json({ error: 'No orders found' });
            }

            // Get Settings
            const campaignDescription = await SettingsController.getValue('campaign_description', '');

            // Group by Phone
            const grouped = {};
            for (const order of orders) {
                const phone = (order.customerPhone || '').replace(/\D/g, '');
                if (!phone) continue; // Skip orders without phone

                if (!grouped[phone]) {
                    grouped[phone] = {
                        customerName: order.customerName,
                        items: []
                    };
                }
                grouped[phone].items.push(order);
            }

            let sentCount = 0;
            const errors = [];

            // Process each customer group
            for (const [phone, group] of Object.entries(grouped)) {
                try {
                    // Build Item List
                    const itemLines = group.items.map(o => {
                        const qty = o.quantity || 1;
                        const price = parseFloat(o.sellPrice || 0).toFixed(2);
                        const cleanDesc = (o.productRaw || 'Produto').replace(/^\[[\w-]+\]\s*/, '');
                        const details = [];
                        if (o.extractedSize) details.push(`Tam: ${o.extractedSize}`);
                        if (o.extractedColor) details.push(`Cor: ${o.extractedColor}`);
                        const detailStr = details.length > 0 ? ` (${details.join(', ')})` : '';

                        return `• ${qty}x ${cleanDesc}${detailStr} - R$ ${price}`;
                    });

                    // Calculate Total
                    const totalVal = group.items.reduce((acc, curr) => acc + (parseFloat(curr.sellPrice || 0) * (curr.quantity || 1)), 0);
                    const totalStr = totalVal.toFixed(2).replace('.', ',');

                    // Build Message
                    const message = `Olá, tudo bem?

Aqui está um resumo do seu pedido da ${campaignDescription || 'Campanha'} 🥳

ATENÇÃO ⚠⚠

🚚 Estimativa de entrega:
15 dias úteis

✅ Confira o produto, a quantidade e o valor, pois não fazemos trocas. Caso esteja tudo correto, pedimos que faça a confirmação, o pagamento e nos envie o comprovante.

*O silêncio será considerado como aprovação*

💰 Pix:
51533293000103
Favorecido: Brinca Comigo Comércio de Brinquedos Ltda.

💳Se preferir, você pode pagar com cartão de crédito através de um link com acréscimo de 5% em até 3x, com parcelas mínimas de R$ 100,00.

O frete será cobrado separadamente, após a chegada dos produtos e alguns dias antes da rota do motoboy.

🛵 R$ 15,00 dentro de Brasília para pedidos que caibam no baú do motoboy.

🚗 R$ 20,00 quando for necessária entrega por carro (para pedidos maiores).

Ou retirada no Scia - seg a sexta de 9h às 16h (avisar com antecedência)

Caso o endereço de entrega seja diferente do registrado na Nota Fiscal, avise-nos com antecedência para que possamos corrigir a informação e evitar a cobrança de uma nova taxa de entrega.

RESUMO DO PEDIDO:
${itemLines.join('\n')}

*Total do Pedido: R$ ${totalStr}*`;

                    // Send via Z-API
                    // Phone needs to be formatted for Z-API? Usually just DDD+Number (e.g. 556199999999)
                    // My 'phone' key variable is stripped digits.
                    // If it doesn't start with country code, prepend 55 (assuming BR)
                    let sendPhone = phone;
                    if (!sendPhone.startsWith('55') && sendPhone.length <= 11) {
                        sendPhone = '55' + sendPhone;
                    }

                    await WhatsappService.sendText(sendPhone, message);
                    sentCount++;

                } catch (err) {
                    console.error(`Failed to send confirmation to ${phone}:`, err.message);
                    errors.push({ phone, error: err.message });
                }
            }

            res.json({
                message: 'Process completed',
                sent: sentCount,
                errors: errors
            });

        } catch (error) {
            console.error('[OrderController] Send Confirmation failed:', error);
            res.status(500).json({ error: 'Process failed' });
        }
    }
}

module.exports = new OrderController();
