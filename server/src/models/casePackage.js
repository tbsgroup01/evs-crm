const { Model, DataTypes } = require('sequelize');

class CasePackage extends Model {
  static associate(models) {
    CasePackage.belongsTo(models.Case, { foreignKey: 'case_id' });
    CasePackage.belongsTo(models.Package, { foreignKey: 'package_id' });
  }
}

module.exports = (sequelize) => {
  CasePackage.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    case_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    package_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    package_amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    assigned_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'CasePackage',
    tableName: 'case_packages',
    underscored: true
  });
  return CasePackage;
};
