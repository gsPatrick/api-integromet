const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * CustomerBlingMapping
 * Maps local customer phone to Bling client ID
 * Once mapped, all orders from this phone will use this Bling client
 */
const CustomerBlingMapping = sequelize.define('CustomerBlingMapping', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    customerPhone: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        comment: 'Phone number (normalized, without country code 55)'
    },
    blingClientId: {
        type: DataTypes.BIGINT,
        allowNull: false,
        comment: 'Bling client ID (e.g. 17793209101)'
    },
    blingClientName: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Bling client name for reference'
    },
    blingClientCpfCnpj: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Bling client CPF/CNPJ for reference'
    }
}, {
    tableName: 'customer_bling_mappings',
    timestamps: true
});

module.exports = CustomerBlingMapping;
