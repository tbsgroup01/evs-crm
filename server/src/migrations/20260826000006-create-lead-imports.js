'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('lead_imports', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      file_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      file_type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      total_rows: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      successful_rows: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      failed_rows: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      duplicate_rows: {
        type: Sequelize.INTEGER,
        defaultValue: 0
      },
      imported_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      status: {
        type: Sequelize.ENUM('PROCESSING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED'),
        defaultValue: 'PROCESSING'
      },
      error_file_path: {
        type: Sequelize.STRING,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('lead_imports');
  }
};
