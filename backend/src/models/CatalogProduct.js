const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Catalog Product Model
 * Stores products imported from PDF catalogs for price reference
 */
const CatalogProduct = sequelize.define('CatalogProduct', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    code: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Product code (e.g., 46586, 46587)'
    },
    name: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Product name/description'
    },
    category: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Product category (e.g., Blusa, Conjunto, etc.)'
    },
    price_1_3: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Price for size 1-3'
    },
    price_4_8: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Price for size 4-8'
    },
    price_10_12: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Price for size 10-12'
    },
    catalogName: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Name of the catalog this product belongs to'
    },
    pageNumber: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Page number in the catalog'
    },
    imageUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Reference image URL if available'
    },
    rawText: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Raw text extracted from catalog for this product'
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'catalog_products',
    timestamps: true
});

module.exports = CatalogProduct;
