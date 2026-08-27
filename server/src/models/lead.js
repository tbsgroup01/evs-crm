const { Model, DataTypes } = require('sequelize');

class Lead extends Model {
  static associate(models) {
    Lead.belongsTo(models.User, { foreignKey: 'counselor_id', as: 'counselor' });
    Lead.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });
    Lead.hasMany(models.LeadInteraction, { foreignKey: 'lead_id', as: 'interactions' });
    Lead.hasMany(models.LeadFollowUp, { foreignKey: 'lead_id', as: 'followUps' });
    Lead.hasOne(models.Case, { foreignKey: 'lead_id', as: 'case' });
  }
}

module.exports = (sequelize) => {
  Lead.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    lead_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    client_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    mobile: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: { isEmail: true }
    },
    country: {
      type: DataTypes.STRING,
      allowNull: true
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true
    },
    requirement: {
      type: DataTypes.STRING,
      allowNull: true
    },
    service_required: {
      type: DataTypes.STRING,
      allowNull: true
    },
    lead_source: {
      type: DataTypes.STRING,
      allowNull: true
    },
    estimated_budget: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true
    },
    requirement_details: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('NEW', 'INTERESTED', 'FOLLOW_UP', 'NOT_INTERESTED', 'COLD_LEAD', 'CONVERTED'),
      defaultValue: 'NEW'
    },
    counselor_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    follow_up_date: {
      type: DataTypes.DATE,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    remarks: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Lead',
    tableName: 'leads',
    underscored: true,
    paranoid: true,
    indexes: [
      { unique: true, fields: ['lead_number'] },
      { fields: ['mobile'] },
      { fields: ['email'] },
      { fields: ['status'] },
      { fields: ['counselor_id'] },
      { fields: ['follow_up_date'] },
      { fields: ['created_at'] }
    ]
  });
  return Lead;
};
