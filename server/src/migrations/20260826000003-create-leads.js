'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('leads', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      lead_number: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      client_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      mobile: {
        type: Sequelize.STRING,
        allowNull: false
      },
      email: {
        type: Sequelize.STRING,
        allowNull: true
      },
      country: {
        type: Sequelize.STRING,
        allowNull: true
      },
      city: {
        type: Sequelize.STRING,
        allowNull: true
      },
      requirement: {
        type: Sequelize.STRING,
        allowNull: true
      },
      service_required: {
        type: Sequelize.STRING,
        allowNull: true
      },
      lead_source: {
        type: Sequelize.STRING,
        allowNull: true
      },
      estimated_budget: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: true
      },
      requirement_details: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('NEW', 'INTERESTED', 'FOLLOW_UP', 'NOT_INTERESTED', 'COLD_LEAD', 'CONVERTED'),
        defaultValue: 'NEW'
      },
      counselor_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      follow_up_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      remarks: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true
      }
    });

    await queryInterface.addIndex('leads', ['mobile']);
    await queryInterface.addIndex('leads', ['email']);
    await queryInterface.addIndex('leads', ['status']);
    await queryInterface.addIndex('leads', ['counselor_id']);
    await queryInterface.addIndex('leads', ['follow_up_date']);
    await queryInterface.addIndex('leads', ['created_at']);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('leads');
  }
};
