const { Model, DataTypes } = require('sequelize');

class LeadFollowUp extends Model {
  static associate(models) {
    LeadFollowUp.belongsTo(models.Lead, { foreignKey: 'lead_id' });
    LeadFollowUp.belongsTo(models.User, { foreignKey: 'assigned_to', as: 'assignedUser' });
  }
}

module.exports = (sequelize) => {
  LeadFollowUp.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    lead_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    assigned_to: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    follow_up_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'COMPLETED'),
      defaultValue: 'PENDING'
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'LeadFollowUp',
    tableName: 'lead_follow_ups',
    underscored: true
  });
  return LeadFollowUp;
};
