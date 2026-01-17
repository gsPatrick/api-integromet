'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.changeColumn('orders', 'blingId', {
            type: Sequelize.BIGINT,
            allowNull: true,
            comment: 'ID do pedido retornado pelo Bling'
        });
    },

    down: async (queryInterface, Sequelize) => {
        // Note: This might fail if data is too large for INTEGER
        await queryInterface.changeColumn('orders', 'blingId', {
            type: Sequelize.INTEGER,
            allowNull: true,
            comment: 'ID do pedido retornado pelo Bling'
        });
    }
};
