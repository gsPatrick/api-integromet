const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BlingToken = sequelize.define('BlingToken', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    accessToken: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    refreshToken: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    expiresIn: {
        type: DataTypes.BIGINT, // Seconds
        allowNull: false
    },
    expiresAt: {
        type: DataTypes.DATE, // Calculated expiration date for easier querying
        allowNull: false
    }
}, {
    tableName: 'bling_tokens',
    timestamps: true // Adds createdAt and updatedAt
});

module.exports = BlingToken;
