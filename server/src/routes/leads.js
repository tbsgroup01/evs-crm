const express = require('express');
const {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  deleteLead,
  bulkDeleteLeads,
  updateLeadStatus,
  exportLeads,
  getLeadInteractions,
  createLeadInteraction,
  getLeadsStats
} = require('../controllers/lead');
const {
  getUnassignedLeads,
  assignLead,
  reassignLead,
  bulkAssignLeads,
  getCounselorWorkload
} = require('../controllers/assignment');
const {
  getFollowUps,
  createFollowUp,
  updateFollowUp,
  completeFollowUp
} = require('../controllers/followUp');
const {
  parseImportFile,
  parsePdfImport,
  confirmImportLeads,
  getImportHistory,
  getImportById
} = require('../controllers/import');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../config/storage');

const router = express.Router();

router.post('/leads', authenticate, createLead);
router.get('/leads', authenticate, getLeads);
router.get('/leads/export', authenticate, exportLeads);
router.get('/leads/unassigned', authenticate, authorize('ADMIN', 'LEAD_MANAGER'), getUnassignedLeads);
router.get('/leads/stats', authenticate, getLeadsStats);
router.get('/leads/:id', authenticate, getLeadById);
router.put('/leads/:id', authenticate, updateLead);
router.delete('/leads/:id', authenticate, deleteLead);
router.post('/leads/bulk-delete', authenticate, authorize('ADMIN', 'LEAD_MANAGER'), bulkDeleteLeads);
router.patch('/leads/:id/status', authenticate, updateLeadStatus);

router.post('/leads/:id/assign', authenticate, authorize('ADMIN', 'LEAD_MANAGER'), assignLead);
router.post('/leads/:id/reassign', authenticate, authorize('ADMIN', 'LEAD_MANAGER'), reassignLead);
router.post('/leads/bulk-assign', authenticate, authorize('ADMIN', 'LEAD_MANAGER'), bulkAssignLeads);

router.get('/counselors/workload', authenticate, authorize('ADMIN', 'LEAD_MANAGER'), getCounselorWorkload);

router.get('/leads/:id/interactions', authenticate, getLeadInteractions);
router.post('/leads/:id/interactions', authenticate, createLeadInteraction);

router.get('/follow-ups', authenticate, getFollowUps);
router.post('/leads/:id/follow-up', authenticate, createFollowUp);
router.put('/follow-ups/:id', authenticate, updateFollowUp);
router.patch('/follow-ups/:id/complete', authenticate, completeFollowUp);

router.post('/leads/import/parse', authenticate, authorize('ADMIN', 'LEAD_MANAGER'), upload.single('file'), parseImportFile);
router.post('/leads/import/pdf', authenticate, authorize('ADMIN', 'LEAD_MANAGER'), upload.single('file'), parsePdfImport);
router.post('/leads/import/confirm', authenticate, authorize('ADMIN', 'LEAD_MANAGER'), confirmImportLeads);
router.get('/leads/imports', authenticate, authorize('ADMIN', 'LEAD_MANAGER'), getImportHistory);
router.get('/leads/imports/:id', authenticate, authorize('ADMIN', 'LEAD_MANAGER'), getImportById);

module.exports = router;
