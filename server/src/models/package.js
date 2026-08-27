const { Model, DataTypes } = require('sequelize');

class Package extends Model {
  static associate(models) {
    Package.hasMany(models.CasePackage, { foreignKey: 'package_id' });
  }
}

module.exports = (sequelize) => {
  Package.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    amount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false
    },
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'Package',
    tableName: 'packages',
    underscored: true,
    paranoid: true
  });
  return Package;
};
