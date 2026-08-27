const { Model, DataTypes } = require('sequelize');

class Role extends Model {
  static associate(models) {
    Role.hasMany(models.User, { foreignKey: 'role_id', as: 'users' });
  }
}

module.exports = (sequelize) => {
  Role.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.ENUM('ADMIN', 'LEAD_MANAGER', 'COUNSELOR', 'CASE_MANAGER'),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'Role',
    tableName: 'roles',
    underscored: true
  });
  return Role;
};
