const Order = require('../models/Order');
const blingService = require('../services/bling.service');
const { Op, Sequelize } = require('sequelize');

class CustomerController {

    /**
     * List unique customers with order stats
     * GET /customers
     */
    async listCustomers(req, res) {
        try {
            // We group by phone since it's the unique identifier for WhatsApp
            const customers = await Order.findAll({
                attributes: [
                    'customerPhone',
                    [Sequelize.fn('MAX', Sequelize.col('customerName')), 'name'], // Get most recent name
                    [Sequelize.fn('COUNT', Sequelize.col('id')), 'totalOrders'],
                    [Sequelize.fn('SUM', Sequelize.literal("CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END")), 'pendingOrders'],
                    [Sequelize.fn('MAX', Sequelize.col('createdAt')), 'lastOrderDate']
                ],
                group: ['customerPhone'],
                order: [[Sequelize.literal('"lastOrderDate"'), 'DESC']]
            });

            res.json(customers);
        } catch (error) {
            console.error('[CustomerController] Error listing customers:', error);
            res.status(500).json({ error: 'Failed to list customers' });
        }
    }

    /**
     * Get all orders for a specific customer
     * GET /customers/:phone/orders
     */
    async getCustomerOrders(req, res) {
        try {
            const { phone } = req.params;
            // Decode phone because it might come encoded
            const decodedPhone = decodeURIComponent(phone);

            const orders = await Order.findAll({
                where: { customerPhone: decodedPhone },
                order: [['createdAt', 'DESC']]
            });

            res.json(orders);
        } catch (error) {
            console.error('[CustomerController] Error getting customer orders:', error);
            res.status(500).json({ error: 'Failed' });
        }
    }

    /**
     * Sync ALL pending orders for a customer to Bling
     * POST /customers/:phone/sync
     */
    async syncCustomerOrders(req, res) {
        try {
            const { phone } = req.params;
            const decodedPhone = decodeURIComponent(phone);

            // Find all PENDING orders
            const pendingOrders = await Order.findAll({
                where: {
                    customerPhone: decodedPhone,
                    status: 'PENDING'
                }
            });

            if (pendingOrders.length === 0) {
                return res.status(400).json({ error: 'No pending orders to sync for this customer.' });
            }

            // Sync using existing service (it handles array logic now!)
            // blingService.executeOrder accepts an array and groups them into one Sales Order
            await blingService.executeOrder(pendingOrders);

            // Update statuses
            for (const order of pendingOrders) {
                order.status = 'PROCESSED';
                await order.save();
            }

            res.json({
                success: true,
                message: `Synced ${pendingOrders.length} orders successfully.`,
                count: pendingOrders.length
            });

        } catch (error) {
            console.error('[CustomerController] Sync failed:', error);
            res.status(500).json({ error: 'Sync failed: ' + error.message });
        }
    }
}

module.exports = new CustomerController();
