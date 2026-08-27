const { Model, DataTypes } = require('sequelize');

class ActivityLog extends Model {
  static associate(models) {
    ActivityLog.belongsTo(models.User, { foreignKey: 'user_id' });
  }
}

module.exports = (sequelize) => {
  ActivityLog.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    entity_type: {
      type: DataTypes.STRING,
      allowNull: true
    },
    entity_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    action: {
      type: DataTypes.STRING,
      allowNull: false
    },
    old_value: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    new_value: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    ip_address: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'ActivityLog',
    tableName: 'activity_logs',
    underscored: true,
    updatedAt: false
  });
  return ActivityLog;
};
