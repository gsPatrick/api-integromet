const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Message Context Model
 * Stores recent messages from each customer for context awareness
 */
const MessageContext = sequelize.define('MessageContext', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    customerPhone: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Customer phone number'
    },
    groupId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Group ID if message is from a group'
    },
    messageId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'WhatsApp message ID'
    },
    messageType: {
        type: DataTypes.ENUM('text', 'image', 'image_with_text'),
        defaultValue: 'text'
    },
    textContent: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Text content of the message'
    },
    imageUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Image URL if present'
    },
    quotedMessageId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'If this message quotes another, store that ID'
    },
    processed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Whether this message was processed into an order'
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'message_contexts',
    timestamps: true,
    indexes: [
        { fields: ['customerPhone'] },
        { fields: ['messageId'] },
        { fields: ['createdAt'] }
    ]
});

/**
 * Static helper to get recent context for a customer
 */
MessageContext.getRecentContext = async function (customerPhone, limit = 10) {
    return await this.findAll({
        where: { customerPhone },
        order: [['createdAt', 'DESC']],
        limit
    });
};

/**
 * Static helper to get the last image sent by customer
 */
MessageContext.getLastImage = async function (customerPhone, withinMinutes = 30) {
    const cutoff = new Date(Date.now() - withinMinutes * 60 * 1000);
    return await this.findOne({
        where: {
            customerPhone,
            imageUrl: { [require('sequelize').Op.not]: null },
            createdAt: { [require('sequelize').Op.gt]: cutoff }
        },
        order: [['createdAt', 'DESC']]
    });
};

/**
 * Static helper to find quoted message
 */
MessageContext.findByMessageId = async function (messageId) {
    return await this.findOne({ where: { messageId } });
};

module.exports = MessageContext;
