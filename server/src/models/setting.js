const { Model, DataTypes } = require('sequelize');

class Setting extends Model {}

module.exports = (sequelize) => {
  Setting.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    group: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'general'
    }
  }, {
    sequelize,
    modelName: 'Setting',
    tableName: 'settings',
    underscored: true
  });
  return Setting;
};
