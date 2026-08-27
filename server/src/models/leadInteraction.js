const { Model, DataTypes } = require('sequelize');

class LeadInteraction extends Model {
  static associate(models) {
    LeadInteraction.belongsTo(models.Lead, { foreignKey: 'lead_id' });
    LeadInteraction.belongsTo(models.User, { foreignKey: 'user_id' });
  }
}

module.exports = (sequelize) => {
  LeadInteraction.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    lead_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    interaction_type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    interaction_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    old_status: {
      type: DataTypes.STRING,
      allowNull: true
    },
    new_status: {
      type: DataTypes.STRING,
      allowNull: true
    },
    next_followup_date: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'LeadInteraction',
    tableName: 'lead_interactions',
    underscored: true
  });
  return LeadInteraction;
};
