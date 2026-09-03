const { Model, DataTypes } = require('sequelize');

class User extends Model {
  static associate(models) {
    User.belongsTo(models.Role, { foreignKey: 'role_id', as: 'role' });
    User.hasMany(models.Lead, { foreignKey: 'counselor_id', as: 'assignedLeads' });
    User.hasMany(models.Lead, { foreignKey: 'created_by', as: 'createdLeads' });
    User.hasMany(models.LeadInteraction, { foreignKey: 'user_id', as: 'interactions' });
    User.hasMany(models.Case, { foreignKey: 'case_manager_id', as: 'managedCases' });
    User.hasMany(models.CaseAssignment, { foreignKey: 'case_manager_id', as: 'caseAssignments' });
    User.hasMany(models.Payment, { foreignKey: 'created_by', as: 'createdPayments' });
    User.hasMany(models.Notification, { foreignKey: 'user_id', as: 'notifications' });
    User.hasMany(models.ActivityLog, { foreignKey: 'user_id', as: 'activityLogs' });
  }
}

module.exports = (sequelize) => {
  User.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true }
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    mobile_1: {
      type: DataTypes.STRING,
      allowNull: true
    },
    mobile_2: {
      type: DataTypes.STRING,
      allowNull: true
    },
    extension: {
      type: DataTypes.STRING,
      allowNull: true
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    profile_image: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'INACTIVE'),
      defaultValue: 'ACTIVE'
    },
    last_login: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    underscored: true,
    paranoid: true
  });
  return User;
};
