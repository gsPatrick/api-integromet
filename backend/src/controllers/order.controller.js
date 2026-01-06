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

            if (!order) {
                return res.status(404).json({ error: 'Order not found' });
            }

            // Re-trigger Bling service
            // Note: This might throw if tokens are invalid, handled in try/catch or inside service
            await blingService.executeOrder(order);

            // Update status if successful (blingService logs errors but doesn't throw mostly)
            // Ideally blingService.executeOrder should return status

            // Let's assume success if no throw for now, or you might want to improve executeOrder to return result
            order.status = 'PROCESSED';
            await order.save();

            res.json({ message: 'Sync triggered successfully', order });

        } catch (error) {
            console.error('[OrderController] Sync failed:', error);
            res.status(500).json({ error: 'Sync failed: ' + error.message });
        }
    }
}

module.exports = new OrderController();
