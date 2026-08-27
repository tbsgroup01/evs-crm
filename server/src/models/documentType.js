const { Model, DataTypes } = require('sequelize');

class DocumentType extends Model {
  static associate(models) {
    DocumentType.hasMany(models.Document, { foreignKey: 'document_type_id' });
  }
}

module.exports = (sequelize) => {
  DocumentType.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true
    },
    is_required: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'DocumentType',
    tableName: 'document_types',
    underscored: true
  });
  return DocumentType;
};
