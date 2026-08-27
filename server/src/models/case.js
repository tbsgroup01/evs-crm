const { Model, DataTypes } = require('sequelize');

class Case extends Model {
  static associate(models) {
    Case.belongsTo(models.Lead, { foreignKey: 'lead_id' });
    Case.belongsTo(models.User, { foreignKey: 'case_manager_id', as: 'caseManager' });
    Case.hasMany(models.CaseAssignment, { foreignKey: 'case_id', as: 'assignments' });
    Case.hasMany(models.Document, { foreignKey: 'case_id', as: 'documents' });
    Case.hasMany(models.CasePackage, { foreignKey: 'case_id', as: 'casePackages' });
    Case.hasMany(models.Payment, { foreignKey: 'case_id', as: 'payments' });
  }
}

module.exports = (sequelize) => {
  Case.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    case_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    lead_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    case_manager_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('NEW', 'ACTIVE', 'PENDING', 'ON_HOLD', 'COMPLETED'),
      defaultValue: 'NEW'
    },
    opened_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Case',
    tableName: 'cases',
    underscored: true,
    paranoid: true
  });
  return Case;
};
