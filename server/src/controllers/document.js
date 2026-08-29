const fs = require('fs');
const path = require('path');
const { Document, Case, DocumentType, ActivityLog, Notification, User } = require('../models');
const { createNotification } = require('../services/notificationService');

const uploadDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const { case_id, document_type_id } = req.body;
    if (!case_id || !document_type_id) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'case_id and document_type_id are required' });
    }

    const singleCase = await Case.findByPk(case_id);
    if (!singleCase) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    if (req.user.role.name === 'CASE_MANAGER' && singleCase.case_manager_id !== req.user.id) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(403).json({ success: false, message: 'Access denied to this case' });
    }

    const document = await Document.create({
      case_id,
      document_type_id,
      file_name: req.file.originalname,
      file_path: req.file.path,
      mime_type: req.file.mimetype,
      file_size: req.file.size,
      uploaded_by: req.user.id,
      status: 'UPLOADED'
    });

    await ActivityLog.create({
      user_id: req.user.id,
      entity_type: 'Case',
      entity_id: case_id,
      action: 'DOCUMENT_UPLOADED',
      description: `Document ${req.file.originalname} uploaded for case ${singleCase.case_number}`,
      ip_address: req.ip
    });

    return res.status(201).json({ success: true, data: document });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ success: false, message: 'Failed to upload document', errors: [error.message] });
  }
};

const getDocuments = async (req, res) => {
  try {
    const { status, document_type_id, case_id } = req.query;
    const where = {};

    if (status) where.status = status;
    if (document_type_id) where.document_type_id = document_type_id;
    if (case_id) where.case_id = case_id;

    const caseInclude = {
      model: Case,
      attributes: ['id', 'case_number', 'case_manager_id']
    };

    if (req.user.role.name === 'CASE_MANAGER') {
      caseInclude.where = { case_manager_id: req.user.id };
    }

    const list = await Document.findAll({
      where,
      include: [
        caseInclude,
        { model: DocumentType, attributes: ['id', 'name', 'is_required'] },
        { model: User, as: 'uploader', attributes: ['id', 'name'] }
      ],
      order: [['created_at', 'DESC']]
    });

    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve documents', errors: [error.message] });
  }
};

const downloadDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const document = await Document.findByPk(id, {
      include: [{ model: Case, attributes: ['id', 'case_manager_id'] }]
    });

    if (!document) return res.status(404).json({ success: false, message: 'Document not found' });

    if (req.user.role.name === 'CASE_MANAGER') {
      if (document.Case.case_manager_id !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Access denied to this file' });
      }
    }

    const absolutePath = path.resolve(document.file_path);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ success: false, message: 'Physical file not found on server disk' });
    }

    return res.sendFile(absolutePath);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to download document', errors: [error.message] });
  }
};

const updateDocumentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejection_reason } = req.body;

    if (!['VERIFIED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid verification status' });
    }

    const document = await Document.findByPk(id, { include: [Case] });
    if (!document) return res.status(404).json({ success: false, message: 'Document not found' });

    if (req.user.role.name === 'CASE_MANAGER' && document.Case.case_manager_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const oldStatus = document.status;
    await document.update({
      status,
      verified_by: req.user.id,
      verified_at: new Date(),
      rejection_reason: status === 'REJECTED' ? rejection_reason : null
    });

    await ActivityLog.create({
      user_id: req.user.id,
      entity_type: 'Case',
      entity_id: document.case_id,
      action: status === 'VERIFIED' ? 'DOCUMENT_VERIFIED' : 'DOCUMENT_REJECTED',
      description: `Document ${document.file_name} status updated from ${oldStatus} to ${status}. Reason: ${rejection_reason || 'N/A'}`,
      ip_address: req.ip
    });

    await createNotification({
      userId: document.uploaded_by,
      type: status === 'VERIFIED' ? 'DOCUMENT_VERIFIED' : 'DOCUMENT_REJECTED',
      title: status === 'VERIFIED' ? 'Document Verified' : 'Document Rejected',
      message: `Your uploaded document ${document.file_name} was ${status.toLowerCase()}`,
      entityType: 'Case',
      entityId: document.case_id
    });

    return res.status(200).json({ success: true, data: document });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update document verification status', errors: [error.message] });
  }
};

const replaceDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded for replacement' });

    const { id } = req.params;
    const document = await Document.findByPk(id, { include: [Case] });
    if (!document) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    if (req.user.role.name === 'CASE_MANAGER' && document.Case.case_manager_id !== req.user.id) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const oldFilePath = document.file_path;
    if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);

    await document.update({
      file_name: req.file.originalname,
      file_path: req.file.path,
      mime_type: req.file.mimetype,
      file_size: req.file.size,
      status: 'UPLOADED',
      rejection_reason: null
    });

    await ActivityLog.create({
      user_id: req.user.id,
      entity_type: 'Case',
      entity_id: document.case_id,
      action: 'DOCUMENT_REPLACED',
      description: `Document ${document.file_name} replaced with ${req.file.originalname}`,
      ip_address: req.ip
    });

    return res.status(200).json({ success: true, data: document });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(500).json({ success: false, message: 'Failed to replace document', errors: [error.message] });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const document = await Document.findByPk(id, { include: [Case] });
    if (!document) return res.status(404).json({ success: false, message: 'Document not found' });

    if (req.user.role.name === 'CASE_MANAGER' && document.Case.case_manager_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const filePath = document.file_path;
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await document.destroy();
    return res.status(200).json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete document', errors: [error.message] });
  }
};

module.exports = {
  uploadDocument,
  getDocuments,
  downloadDocument,
  updateDocumentStatus,
  replaceDocument,
  deleteDocument
};
