const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Campaign = sequelize.define('Campaign', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.STRING,
        allowNull: true
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    startDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    endDate: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    targetGroups: {
        type: DataTypes.JSON, // Array of group IDs: ["12...-group", "12...-group"]
        defaultValue: [],
        allowNull: false
    },
    // Catalog Integration Fields
    markupPercentage: {
        type: DataTypes.FLOAT,
        defaultValue: 0.0
    },
    visualPdfPath: {
        type: DataTypes.STRING, // Path to uploaded visual catalog
        allowNull: true
    },
    pricePdfPaths: {
        type: DataTypes.TEXT, // JSON string of array of paths
        allowNull: true,
        get() {
            const rawValue = this.getDataValue('pricePdfPaths');
            return rawValue ? JSON.parse(rawValue) : [];
        },
        set(value) {
            this.setDataValue('pricePdfPaths', JSON.stringify(value));
        }
    },
    finalPdfPath: {
        type: DataTypes.STRING, // Path to generated/final PDF
        allowNull: true
    }
}, {
    tableName: 'campaigns',
    timestamps: true
});

module.exports = Campaign;
