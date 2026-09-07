const express = require('express');
const {
  convertLeadToCase,
  getCases,
  getCaseById,
  updateCase,
  deleteCase,
  bulkDeleteCases,
  updateCaseStatus,
  addCaseNote,
  exportCases,
  getCaseInteractions,
  addCaseInteraction
} = require('../controllers/case');
const {
  getUnassignedCases,
  assignCase,
  bulkAssignCases,
  getCaseManagerWorkload
} = require('../controllers/caseAssignment');
const {
  getDocumentTypes,
  createDocumentType,
  updateDocumentType,
  deleteDocumentType
} = require('../controllers/documentType');
const {
  uploadDocument,
  getDocuments,
  downloadDocument,
  updateDocumentStatus,
  replaceDocument,
  deleteDocument
} = require('../controllers/document');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../config/storage');

const router = express.Router();

router.post('/leads/:id/convert', authenticate, authorize('ADMIN', 'LEAD_MANAGER', 'COUNSELOR'), convertLeadToCase);

router.get('/cases', authenticate, authorize('ADMIN', 'LEAD_MANAGER', 'CASE_MANAGER', 'COUNSELOR'), getCases);
router.get('/cases/export', authenticate, authorize('ADMIN', 'LEAD_MANAGER', 'CASE_MANAGER', 'COUNSELOR'), exportCases);
router.get('/cases/unassigned', authenticate, authorize('ADMIN', 'LEAD_MANAGER'), getUnassignedCases);
router.get('/case-managers/workload', authenticate, authorize('ADMIN', 'LEAD_MANAGER'), getCaseManagerWorkload);
router.get('/cases/:id', authenticate, authorize('ADMIN', 'LEAD_MANAGER', 'CASE_MANAGER', 'COUNSELOR'), getCaseById);
router.put('/cases/:id', authenticate, updateCase);
router.delete('/cases/:id', authenticate, authorize('ADMIN', 'LEAD_MANAGER'), deleteCase);
router.post('/cases/bulk-delete', authenticate, authorize('ADMIN', 'LEAD_MANAGER'), bulkDeleteCases);
router.patch('/cases/:id/status', authenticate, updateCaseStatus);
router.post('/cases/:id/assign', authenticate, authorize('ADMIN', 'LEAD_MANAGER'), assignCase);
router.post('/cases/bulk-assign', authenticate, authorize('ADMIN', 'LEAD_MANAGER'), bulkAssignCases);
router.post('/cases/:id/notes', authenticate, addCaseNote);
router.get('/cases/:id/interactions', authenticate, getCaseInteractions);
router.post('/cases/:id/interactions', authenticate, addCaseInteraction);

router.get('/document-types', authenticate, getDocumentTypes);
router.post('/document-types', authenticate, authorize('ADMIN'), createDocumentType);
router.put('/document-types/:id', authenticate, authorize('ADMIN'), updateDocumentType);
router.delete('/document-types/:id', authenticate, authorize('ADMIN'), deleteDocumentType);

router.get('/documents', authenticate, getDocuments);
router.post('/documents/upload', authenticate, upload.single('file'), uploadDocument);
router.get('/documents/:id/download', authenticate, downloadDocument);
router.patch('/documents/:id/status', authenticate, authorize('ADMIN'), updateDocumentStatus);
router.post('/documents/:id/replace', authenticate, upload.single('file'), replaceDocument);
router.delete('/documents/:id', authenticate, deleteDocument);

module.exports = router;
