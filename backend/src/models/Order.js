const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Order = sequelize.define('Order', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    customerName: {
        type: DataTypes.STRING,
        allowNull: true
    },
    customerPhone: {
        type: DataTypes.STRING,
        allowNull: false
    },
    productRaw: {
        type: DataTypes.STRING,
        allowNull: true
    },
    extractedSize: {
        type: DataTypes.STRING,
        allowNull: true
    },
    extractedColor: {
        type: DataTypes.STRING,
        allowNull: true
    },
    extractedColorCode: {
        type: DataTypes.STRING,
        allowNull: true
    },
    catalogPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    sellPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'PROCESSED', 'ERROR', 'PENDING_PAYMENT', 'PAID'),
        defaultValue: 'PENDING'
    },
    imageUrl: {
        type: DataTypes.TEXT, // Long URL or local path
        allowNull: true
    },
    quantity: {
        type: DataTypes.INTEGER,
        defaultValue: 1
    },
    originalMessage: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    blingSyncedAt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    // Asaas Integration Fields
    paymentLink: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL do link de pagamento Asaas'
    },
    asaasId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'ID da cobrança no Asaas (pay_...)'
    },
    blingId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'ID do pedido retornado pelo Bling'
    }
}, {
    tableName: 'orders',
    timestamps: true // Adds createdAt and updatedAt
});

module.exports = Order;

