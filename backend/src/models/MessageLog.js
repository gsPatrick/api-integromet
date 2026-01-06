const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MessageLog = sequelize.define('MessageLog', {
    messageId: {
        type: DataTypes.STRING,
        primaryKey: true,
        unique: true,
        allowNull: false
    },
    chatId: {
        type: DataTypes.STRING,
        allowNull: true // Might not always be available or needed depending on context
    },
    senderPhone: {
        type: DataTypes.STRING,
        allowNull: false
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    imageUrl: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    hasImage: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    jsonPayload: {
        type: DataTypes.JSONB,
        allowNull: true
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'message_logs',
    timestamps: false // We use our own createdAt
});

module.exports = MessageLog;
