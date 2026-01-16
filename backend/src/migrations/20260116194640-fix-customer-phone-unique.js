'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Ensure column is the right type
      await queryInterface.changeColumn('customer_bling_mappings', 'customerPhone', {
        type: Sequelize.STRING(255),
        allowNull: false
      }, { transaction });

      // 2. Remove constraint safely using Raw SQL (Postgres specific) to avoid transaction aborts
      await queryInterface.sequelize.query(
        'ALTER TABLE "customer_bling_mappings" DROP CONSTRAINT IF EXISTS "unique_customer_phone_mapping";',
        { transaction }
      );

      // 3. Add Unique Constraint
      await queryInterface.addConstraint('customer_bling_mappings', {
        fields: ['customerPhone'],
        type: 'unique',
        name: 'unique_customer_phone_mapping',
        transaction
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error('Migration failed:', error);

      // If error is strictly about duplicate objects despite our best efforts, we warn but don't fail hard to allow start?
      // No, let's fail to ensure integrity, user can manual fix if needed.
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint('customer_bling_mappings', 'unique_customer_phone_mapping');
  }
};
