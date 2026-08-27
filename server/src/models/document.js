const { Model, DataTypes } = require('sequelize');

class Document extends Model {
  static associate(models) {
    Document.belongsTo(models.Case, { foreignKey: 'case_id' });
    Document.belongsTo(models.DocumentType, { foreignKey: 'document_type_id' });
    Document.belongsTo(models.User, { foreignKey: 'uploaded_by', as: 'uploader' });
    Document.belongsTo(models.User, { foreignKey: 'verified_by', as: 'verifier' });
  }
}

module.exports = (sequelize) => {
  Document.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    case_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    document_type_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    file_name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    file_path: {
      type: DataTypes.STRING,
      allowNull: false
    },
    mime_type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    file_size: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    uploaded_by: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'UPLOADED', 'VERIFIED', 'REJECTED'),
      defaultValue: 'PENDING'
    },
    verified_by: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    verified_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    rejection_reason: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Document',
    tableName: 'documents',
    underscored: true,
    paranoid: true
  });
  return Document;
};
