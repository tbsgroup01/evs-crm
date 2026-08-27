const { Model, DataTypes } = require('sequelize');

class CaseAssignment extends Model {
  static associate(models) {
    CaseAssignment.belongsTo(models.Case, { foreignKey: 'case_id' });
    CaseAssignment.belongsTo(models.User, { foreignKey: 'case_manager_id', as: 'caseManager' });
    CaseAssignment.belongsTo(models.User, { foreignKey: 'assigned_by', as: 'assigner' });
  }
}

module.exports = (sequelize) => {
  CaseAssignment.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    case_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    case_manager_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    assigned_by: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    assigned_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'CaseAssignment',
    tableName: 'case_assignments',
    underscored: true,
    updatedAt: false
  });
  return CaseAssignment;
};
