const { Model, DataTypes } = require('sequelize');

class Payment extends Model {
  static associate(models) {
    Payment.belongsTo(models.Case, { foreignKey: 'case_id' });
    Payment.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });
  }
}

module.exports = (sequelize) => {
  Payment.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    case_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    payment_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    payment_method: {
      type: DataTypes.STRING,
      allowNull: false
    },
    transaction_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    receipt_path: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Payment',
    tableName: 'payments',
    underscored: true
  });
  return Payment;
};
