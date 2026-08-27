const { Model, DataTypes } = require('sequelize');

class LeadImport extends Model {
  static associate(models) {
    LeadImport.belongsTo(models.User, { foreignKey: 'imported_by', as: 'importer' });
  }
}

module.exports = (sequelize) => {
  LeadImport.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    file_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    file_type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    total_rows: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    successful_rows: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    failed_rows: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    duplicate_rows: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    imported_by: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('PROCESSING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED'),
      defaultValue: 'PROCESSING'
    },
    error_file_path: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'LeadImport',
    tableName: 'lead_imports',
    underscored: true
  });
  return LeadImport;
};
