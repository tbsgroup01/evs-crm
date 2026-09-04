const fs = require('fs');
const path = require('path');
const { Document, Case, DocumentType, ActivityLog, Notification, User, Lead } = require('../models');
const { createNotification } = require('../services/notificationService');
const { logAudit } = require('../utils/auditLogger');

const getRoleLabel = (user) => {
  const name = user?.role?.name || user?.role || 'User';
  if (name === 'ADMIN') return 'Admin';
  if (name === 'LEAD_MANAGER' || name === 'MANAGER') return 'Manager';
  if (name === 'CASE_MANAGER') return 'Case Manager';
  if (name === 'COUNSELOR') return 'Counselor';
  return name;
};

const uploadDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const { case_id, document_type_id } = req.body;
    if (!case_id || !document_type_id) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: 'case_id and document_type_id are required' });
    }

    const singleCase = await Case.findByPk(case_id, { include: [{ model: Lead }] });
    if (!singleCase) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    const roleName = req.user.role?.name || req.user.role;

    if (roleName === 'CASE_MANAGER' && singleCase.case_manager_id !== req.user.id) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(403).json({ success: false, message: 'Access denied to this case' });
    }

    if (roleName === 'COUNSELOR' && singleCase.Lead?.counselor_id !== req.user.id) {
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

    const roleLabel = getRoleLabel(req.user);
    await logAudit({
      req,
      entityType: 'Case',
      entityId: case_id,
      leadId: singleCase.lead_id,
      action: 'DOCUMENT_UPLOADED',
      description: `${roleLabel} ${req.user.name} uploaded document "${req.file.originalname}" for Case ${singleCase.case_number}`
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
      attributes: ['id', 'case_number', 'case_manager_id', 'lead_id']
    };

    const roleName = req.user.role?.name || req.user.role;

    if (roleName === 'CASE_MANAGER') {
      caseInclude.where = { case_manager_id: req.user.id };
    } else if (roleName === 'COUNSELOR') {
      caseInclude.include = [{
        model: Lead,
        where: { counselor_id: req.user.id },
        attributes: ['id', 'counselor_id']
      }];
      caseInclude.required = true;
    }

    const list = await Document.findAll({
      where,
      include: [
        caseInclude,
        { model: DocumentType, attributes: ['id', 'name', 'is_required'] },
        { model: User, as: 'uploader', attributes: ['id', 'name'] },
        { model: User, as: 'verifier', attributes: ['id', 'name'] }
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
    const roleName = req.user.role?.name || req.user.role;
    const document = await Document.findByPk(id, {
      include: [{ model: Case, attributes: ['id', 'case_manager_id', 'lead_id'], include: [{ model: Lead }] }]
    });

    if (!document) return res.status(404).json({ success: false, message: 'Document not found' });

    if (roleName === 'CASE_MANAGER') {
      if (document.Case.case_manager_id !== req.user.id) {
        return res.status(403).json({ success: false, message: 'Access denied to this file' });
      }
    }

    if (roleName === 'COUNSELOR') {
      if (document.uploaded_by !== req.user.id && document.Case?.Lead?.counselor_id !== req.user.id) {
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

    if (!['VERIFIED', 'REJECTED', 'UPLOADED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid verification status' });
    }

    const document = await Document.findByPk(id, { include: [Case] });
    if (!document) return res.status(404).json({ success: false, message: 'Document not found' });

    if (req.user.role.name !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Access denied. Only Admin can verify or reject documents' });
    }

    const oldStatus = document.status;
    await document.update({
      status,
      verified_by: req.user.id,
      verified_at: new Date(),
      rejection_reason: status === 'REJECTED' ? rejection_reason : null
    });

    const roleLabel = getRoleLabel(req.user);
    const desc = status === 'VERIFIED'
      ? `${roleLabel} ${req.user.name} verified document "${document.file_name}"`
      : `${roleLabel} ${req.user.name} rejected document "${document.file_name}" (Reason: ${rejection_reason || 'N/A'})`;

    await logAudit({
      req,
      entityType: 'Case',
      entityId: document.case_id,
      leadId: document.Case?.lead_id,
      action: status === 'VERIFIED' ? 'DOCUMENT_VERIFIED' : 'DOCUMENT_REJECTED',
      oldValue: oldStatus,
      newValue: status,
      description: desc
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

    const roleLabel = getRoleLabel(req.user);
    await logAudit({
      req,
      entityType: 'Case',
      entityId: document.case_id,
      leadId: document.Case?.lead_id,
      action: 'DOCUMENT_REPLACED',
      description: `${roleLabel} ${req.user.name} replaced document "${document.file_name}" with "${req.file.originalname}"`
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
