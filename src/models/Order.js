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
    catalogPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    sellPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    status: {
        type: DataTypes.ENUM('PENDING', 'PROCESSED', 'ERROR'),
        defaultValue: 'PENDING'
    }
}, {
    tableName: 'orders',
    timestamps: true // Adds createdAt and updatedAt
});

module.exports = Order;
