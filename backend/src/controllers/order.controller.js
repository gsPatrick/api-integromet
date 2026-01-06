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
            if (updates.sellPrice !== undefined) allowedUpdates.sellPrice = updates.sellPrice;

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
}

module.exports = new OrderController();
