'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // First ensure the column is the right type
      await queryInterface.changeColumn('customer_bling_mappings', 'customerPhone', {
        type: Sequelize.STRING(255),
        allowNull: false
      }, { transaction });

      // Add unique constraint manually safely
      // We first try to remove it if it exists by a known name to ensure idempotency
      try {
        await queryInterface.removeConstraint('customer_bling_mappings', 'unique_customer_phone_mapping', { transaction });
      } catch (e) {
        // Ignore removal error
      }

      // Add it
      await queryInterface.addConstraint('customer_bling_mappings', {
        fields: ['customerPhone'],
        type: 'unique',
        name: 'unique_customer_phone_mapping',
        transaction
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      // If error is "relation already exists" or similar for constraint, we can maybe ignore
      // But let's throw to be safe unless it's strictly about existence
      if (error.original && error.original.code === '42710') { // duplicate_object
        console.warn('Constraint already exists, skipping.');
      } else {
        throw error;
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint('customer_bling_mappings', 'unique_customer_phone_mapping');
  }
};
