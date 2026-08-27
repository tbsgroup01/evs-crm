const { DocumentType, Document } = require('../models');

const getDocumentTypes = async (req, res) => {
  try {
    const list = await DocumentType.findAll({ order: [['name', 'ASC']] });
    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve document types', errors: [error.message] });
  }
};

const createDocumentType = async (req, res) => {
  try {
    const { name, description, is_required, status } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' });

    const dt = await DocumentType.create({ name, description, is_required, status });
    return res.status(201).json({ success: true, data: dt });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create document type', errors: [error.message] });
  }
};

const updateDocumentType = async (req, res) => {
  try {
    const { id } = req.params;
    const dt = await DocumentType.findByPk(id);
    if (!dt) return res.status(404).json({ success: false, message: 'Document type not found' });

    await dt.update(req.body);
    return res.status(200).json({ success: true, data: dt });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update document type', errors: [error.message] });
  }
};

const deleteDocumentType = async (req, res) => {
  try {
    const { id } = req.params;
    const dt = await DocumentType.findByPk(id);
    if (!dt) return res.status(404).json({ success: false, message: 'Document type not found' });

    const inUseCount = await Document.count({ where: { document_type_id: id } });
    if (inUseCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete document category because it is currently assigned to ${inUseCount} uploaded document(s).`
      });
    }

    await dt.destroy();
    return res.status(200).json({ success: true, message: 'Document type deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete document type', errors: [error.message] });
  }
};

module.exports = {
  getDocumentTypes,
  createDocumentType,
  updateDocumentType,
  deleteDocumentType
};
