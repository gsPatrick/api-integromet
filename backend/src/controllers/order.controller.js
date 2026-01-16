const Order = require('../models/Order');
const blingService = require('../services/bling.service');
const catalogAssistant = require('../services/catalogAssistant.service');

class OrderController {

    /**
     * List orders with pagination
     * GET /orders?page=1&limit=20&campaignId=X
     * If campaignId is provided, filter by that campaign
     * Otherwise, show orders from ALL active campaigns
     */
    async listOrders(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const offset = (page - 1) * limit;
            const campaignIdFilter = req.query.campaignId;

            const Campaign = require('../models/Campaign');
            const { Op } = require('sequelize');

            let whereClause = {};

            if (campaignIdFilter) {
                // Filter by specific campaign
                whereClause.campaignId = parseInt(campaignIdFilter);
                console.log(`[OrderController] Filtering orders by campaignId: ${campaignIdFilter}`);
            } else {
                // Get ALL active campaigns and show their orders
                const activeCampaigns = await Campaign.findAll({ where: { isActive: true } });

                if (activeCampaigns.length === 0) {
                    return res.json({
                        total: 0,
                        pages: 0,
                        currentPage: page,
                        data: []
                    });
                }

                const activeCampaignIds = activeCampaigns.map(c => c.id);
                whereClause.campaignId = { [Op.in]: activeCampaignIds };
                console.log(`[OrderController] Showing orders from ${activeCampaigns.length} active campaign(s): [${activeCampaigns.map(c => c.name).join(', ')}]`);
            }

            const { count, rows } = await Order.findAndCountAll({
                where: whereClause,
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

            if (updates.sellPrice !== undefined) {
                let price = updates.sellPrice;
                if (typeof price === 'string') {
                    price = price.trim() === '' ? 0 : parseFloat(price.replace(',', '.'));
                }
                allowedUpdates.sellPrice = isNaN(price) ? 0 : price;
            }

            if (updates.quantity !== undefined) {
                let qty = updates.quantity;
                if (typeof qty === 'string') {
                    qty = qty.trim() === '' ? 1 : parseInt(qty, 10);
                }
                allowedUpdates.quantity = isNaN(qty) ? 1 : qty;
            }

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
     * Generate Payment Link (Asaas) and Sync to Bling
     * POST /orders/generate-link-sync
     * Body: { orderIds: [1, 2, 3] }
     */
    async generateLinkSync(req, res) {
        const asaasService = require('../services/asaas.service');
        const SettingsController = require('./settings.controller');

        try {
            const { orderIds } = req.body;

            if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
                return res.status(400).json({ error: 'No orderIds provided' });
            }

            // 1. Fetch orders
            const orders = await Order.findAll({
                where: {
                    id: { [require('sequelize').Op.in]: orderIds }
                }
            });

            if (orders.length === 0) {
                return res.status(404).json({ error: 'No orders found' });
            }

            // 2. Calculate total value
            const totalValue = orders.reduce((sum, o) => {
                const price = parseFloat(o.sellPrice || 0);
                const qty = o.quantity || 1;
                return sum + (price * qty);
            }, 0);

            if (totalValue <= 0) {
                return res.status(400).json({ error: 'Total value must be greater than 0' });
            }

            // 3. Get customer info from first order
            const mainOrder = orders[0];
            const customerName = mainOrder.customerName || 'Cliente WhatsApp';
            const customerPhone = mainOrder.customerPhone;

            console.log(`[OrderController] Generating payment link for ${orders.length} orders, total: R$ ${totalValue.toFixed(2)}`);

            // 4. Sync to Bling first (if not already synced)
            let blingId = null;
            const unsyncedOrders = orders.filter(o => !o.blingSyncedAt);

            if (unsyncedOrders.length > 0) {
                try {
                    const blingResult = await blingService.executeOrder(orders);

                    // Extract Bling order ID if available
                    if (blingResult && blingResult.data && blingResult.data.id) {
                        blingId = blingResult.data.id;
                    }

                    // Mark as synced
                    for (const o of orders) {
                        o.blingSyncedAt = new Date();
                        if (blingId) o.blingId = blingId;
                        await o.save();
                    }

                    console.log(`[OrderController] Bling sync completed. Order ID: ${blingId}`);
                } catch (blingError) {
                    console.error('[OrderController] Bling sync failed (continuing anyway):', blingError.message);
                    // Continue even if Bling fails - payment link is priority
                }
            }

            // 5. Generate Asaas payment link
            // 5. Generate Asaas payment link
            const campaignDescription = await SettingsController.getValue('campaign_description', '');

            // Build detailed description with product names
            const productNames = orders.map(o => {
                // Remove campaign suffix if present to save space
                let name = o.productRaw || 'Produto';
                if (campaignDescription && name.includes(campaignDescription)) {
                    name = name.replace(` - ${campaignDescription}`, '').trim();
                }
                const qty = o.quantity > 1 ? `(${o.quantity}x) ` : '';
                return `${qty}${name}`;
            }).join(', ');

            let description = productNames;

            // Fallback or prefix if empty
            if (!description) {
                description = `Pedido ${campaignDescription || 'WhatsApp'} - ${customerName}`;
            } else {
                // Add customer ref if needed or just keep products. User asked for "nome do produto".
                // Asaas description usually appears in the invoice.
                // Limit length (Asaas limit is 255 chars usually, check API)
                if (description.length > 250) {
                    description = description.substring(0, 247) + '...';
                }
            }

            const asaasResult = await asaasService.generatePaymentLink({
                customerName,
                customerPhone,
                orderId: mainOrder.id, // Use first order ID as reference
                totalValue,
                description
            });

            // 6. Update all orders with payment info
            for (const order of orders) {
                order.paymentLink = asaasResult.paymentLink;
                order.asaasId = asaasResult.asaasId;
                order.status = 'PENDING_PAYMENT';
                await order.save();
            }

            console.log(`[OrderController] Payment link generated: ${asaasResult.paymentLink}`);

            res.json({
                success: true,
                paymentLink: asaasResult.paymentLink,
                asaasId: asaasResult.asaasId,
                blingId: blingId,
                totalValue: totalValue.toFixed(2),
                ordersCount: orders.length
            });

        } catch (error) {
            console.error('[OrderController] generateLinkSync failed:', error);
            res.status(500).json({ error: 'Failed to generate payment link: ' + error.message });
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
            const { orderIds, preview, customMessage } = req.body;
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

            // If PREVIEW: Generate message for the first group (assuming bulk action usually for one client context in preview, or return array of previews?
            // User usually selects one client's orders.
            // If multiple clients selected, previewing is tricky.
            // Requirement says "Enviar para o privado". Usually per client.
            // For now, let's assume if Preview is requested, we return the generated message for the FIRST client found.

            if (preview) {
                const firstPhone = Object.keys(grouped)[0];
                if (!firstPhone) return res.status(400).json({ error: 'No valid phone numbers found in selection' });

                const group = grouped[firstPhone];
                const generatedMsg = await this._generateMessage(group, campaignDescription);

                return res.json({
                    preview: true,
                    message: generatedMsg,
                    phone: firstPhone,
                    customerName: group.customerName
                });
            }

            let sentCount = 0;
            const errors = [];

            // Process each customer group
            for (const [phone, group] of Object.entries(grouped)) {
                try {
                    // Use Custom Message if provided, otherwise generate
                    const message = customMessage || await this._generateMessage(group, campaignDescription);

                    // Send via Z-API
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

    /**
     * Helper to generate the text message
     */
    async _generateMessage(group, campaignDescription) {
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
        return `Olá, tudo bem?

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
    }


    /**
     * Move orders to another campaign
     * PUT /orders/move
     * Body: { orderIds: [1, 2, ...], targetCampaignId: 15 }
     */
    async moveOrders(req, res) {
        try {
            const { orderIds, targetCampaignId } = req.body;

            if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
                return res.status(400).json({ error: 'Lista de pedidos inválida (orderIds).' });
            }
            if (!targetCampaignId) {
                return res.status(400).json({ error: 'Campanha de destino não informada.' });
            }

            const Campaign = require('../models/Campaign');
            const targetCampaign = await Campaign.findByPk(targetCampaignId);
            if (!targetCampaign) {
                return res.status(404).json({ error: 'Campanha de destino não encontrada.' });
            }

            // Update orders
            const { Op } = require('sequelize');
            // Update returns [numberOfAffectedRows]
            const [updatedCount] = await Order.update(
                { campaignId: targetCampaignId },
                {
                    where: {
                        id: { [Op.in]: orderIds }
                    }
                }
            );

            console.log(`[OrderController] Moved ${updatedCount} orders to campaign ${targetCampaignId} (${targetCampaign.name}).`);

            return res.json({
                success: true,
                message: `${updatedCount} pedidos movidos com sucesso.`,
                movedCount: updatedCount,
                targetCampaignName: targetCampaign.name
            });

        } catch (error) {
            console.error('[OrderController] Error moving orders:', error);
            return res.status(500).json({ error: 'Erro ao mover pedidos: ' + error.message });
        }
    }
    /**
     * Valida um pedido usando a IA e o catálogo
     * POST /orders/:id/validate
     */
    async validateOrder(req, res) {
        try {
            const { id } = req.params;
            const order = await Order.findByPk(id);

            if (!order) {
                return res.status(404).json({ error: 'Pedido não encontrado' });
            }

            console.log(`[OrderValidator] Validating Order #${id} - ${order.customerName}`);

            // Context determination
            let context = '';
            if (order.campaignId === 12) context = 'Fantástico Planeta Precoce';

            // Call AI with full analysis context
            // Pass original message and product raw
            const aiResult = await catalogAssistant.analyzeOrder(
                order.originalMessage || '',
                order.productRaw || '',
                context
            );

            const updates = {};
            const logs = [];

            if (aiResult.found && aiResult.product) {
                const p = aiResult.product;
                logs.push(`AI: ${p.code} - ${p.name} | R$ ${p.price}`);
                if (p.size) logs.push(` Tamanho: ${p.size}`);
                if (p.color) logs.push(` Cor: ${p.color}`);

                // 1. Validate Price
                const currentPrice = parseFloat(order.sellPrice || 0);
                const catalogPrice = parseFloat(p.price || 0);

                if (catalogPrice > 0 && Math.abs(currentPrice - catalogPrice) > 0.01) {
                    updates.sellPrice = catalogPrice;
                    updates.catalogPrice = catalogPrice;
                    logs.push(`Preço corrigido: R$ ${currentPrice} -> R$ ${catalogPrice}`);
                }

                // 2. Validate Name/Code
                const currentName = order.productRaw || '';
                // If AI returns a code, ensure it's in the name
                if (p.code && !currentName.includes(p.code)) {
                    updates.productRaw = `${p.code} - ${p.name || currentName}`;
                    logs.push(`Nome normalizado: ${updates.productRaw}`);
                } else if (p.name && (!currentName || currentName.length < 5 || currentName.includes('WhatsApp'))) {
                    updates.productRaw = `${p.code ? p.code + ' - ' : ''}${p.name}`;
                }

                // 3. Validate Variables (Size/Color)
                if (p.size && p.size !== order.extractedSize) {
                    updates.extractedSize = p.size;
                    logs.push(`Tamanho: ${order.extractedSize || '(vazio)'} -> ${p.size}`);
                }

                if (p.color && p.color !== order.extractedColor) {
                    updates.extractedColor = p.color;
                    logs.push(`Cor: ${order.extractedColor || '(vazio)'} -> ${p.color}`);
                }

                if (p.colorCode && p.colorCode !== order.extractedColorCode) {
                    updates.extractedColorCode = p.colorCode;
                }

                if (Object.keys(updates).length > 0) {
                    await order.update(updates);
                    return res.json({
                        success: true,
                        updated: true,
                        logs,
                        order: await order.reload()
                    });
                } else {
                    return res.json({
                        success: true,
                        updated: false,
                        logs: ['Dados validados e já estavam corretos.'],
                        order
                    });
                }
            } else {
                return res.json({
                    success: false,
                    updated: false,
                    logs: ['Produto não identificado no catálogo com confiança suficiente.'],
                    aiResponse: aiResult
                });
            }

        } catch (error) {
            console.error('Error validating order:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    /**
     * Fix Lili Sampedro Campaign Orders (Ad-hoc fix)
     * POST /admin/fix-lili
     */
    async fixLili(req, res) {
        try {
            const { Op } = require('sequelize');
            const Campaign = require('../models/Campaign');
            const Order = require('../models/Order');

            const CAMPAIGN_ID = 11;
            const CAMPAIGN_NAME = 'Lili Sampedro Jan 26';

            // 1. Rename Campaign
            await Campaign.update({ name: CAMPAIGN_NAME }, { where: { id: CAMPAIGN_ID } });

            // 2. Find Orders
            const searchTerm = 'Lili Sampedro Jan 26';
            const orders = await Order.findAll({
                where: {
                    [Op.or]: [
                        { originalMessage: { [Op.iLike]: `%${searchTerm}%` } },
                        { productRaw: { [Op.iLike]: `%${searchTerm}%` } }
                    ]
                }
            });

            let movedCount = 0;
            let cleanedCount = 0;

            for (const order of orders) {
                let needsSave = false;

                if (order.campaignId !== CAMPAIGN_ID) {
                    order.campaignId = CAMPAIGN_ID;
                    needsSave = true;
                    movedCount++;
                }

                if (order.productRaw && order.productRaw.includes('ou Lili Sampedro Jan 26')) {
                    order.productRaw = order.productRaw.replace('ou Lili Sampedro Jan 26', '').trim();
                    if (order.productRaw.endsWith('-')) order.productRaw = order.productRaw.slice(0, -1).trim();
                    needsSave = true;
                    cleanedCount++;
                }

                if (needsSave) await order.save();
            }

            return res.json({
                success: true,
                message: `Campaign renamed. Orders processed.`,
                moved: movedCount,
                cleaned: cleanedCount
            });

        } catch (error) {
            console.error('Error fixing lili:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    /**
     * Delete multiple orders
     * DELETE /orders/bulk
     * Body: { ids: [1, 2, 3] }
     */
    async deleteOrders(req, res) {
        try {
            const { ids } = req.body;

            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({ error: 'No IDs provided' });
            }

            const Order = require('../models/Order');
            const { Op } = require('sequelize');

            const count = await Order.destroy({
                where: {
                    id: { [Op.in]: ids }
                }
            });

            console.log(`[OrderController] Deleted ${count} orders: [${ids.join(', ')}]`);
            res.json({ success: true, count, ids });
        } catch (error) {
            console.error('[OrderController] Error deleting orders:', error);
            res.status(500).json({ error: 'Failed to delete orders' });
        }
    }
}

module.exports = new OrderController();
