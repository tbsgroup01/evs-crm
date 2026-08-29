const express = require('express');
const {
  getSummary,
  getLeadStatus,
  getConversionRate,
  getPaymentOverview,
  getMonthlyGrowth,
  getRecentActivity
} = require('../controllers/dashboard');
const {
  getLeadsReport,
  getCasesReport,
  getPaymentsReport,
  getDocumentsReport
} = require('../controllers/report');
const { globalSearch } = require('../controllers/search');
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  sendNotification,
  sendLeadsBroadcastEmail
} = require('../controllers/notification');
const { getActivityLogs } = require('../controllers/activityLog');
const {
  getPackages,
  createPackage,
  getPackageById,
  updatePackage,
  deletePackage,
  updatePackageStatus,
  assignCasePackage,
  getCasePackage
} = require('../controllers/package');
const {
  getPayments,
  getCasePayments,
  getCasePaymentSummary,
  addPayment,
  downloadPaymentReceipt
} = require('../controllers/payment');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../config/storage');

const router = express.Router();

router.get('/dashboard/summary', authenticate, getSummary);
router.get('/dashboard/lead-status', authenticate, getLeadStatus);
router.get('/dashboard/conversion', authenticate, getConversionRate);
router.get('/dashboard/payments', authenticate, getPaymentOverview);
router.get('/dashboard/monthly-growth', authenticate, getMonthlyGrowth);
router.get('/dashboard/recent-activity', authenticate, getRecentActivity);

router.get('/reports/leads', authenticate, authorize('ADMIN', 'LEAD_MANAGER'), getLeadsReport);
router.get('/reports/cases', authenticate, authorize('ADMIN', 'LEAD_MANAGER'), getCasesReport);
router.get('/reports/payments', authenticate, authorize('ADMIN'), getPaymentsReport);
router.get('/reports/documents', authenticate, authorize('ADMIN'), getDocumentsReport);

router.get('/search', authenticate, globalSearch);

router.get('/notifications', authenticate, getNotifications);
router.patch('/notifications/:id/read', authenticate, markAsRead);
router.patch('/notifications/read-all', authenticate, markAllAsRead);
router.post('/notifications/send', authenticate, authorize('ADMIN', 'LEAD_MANAGER'), sendNotification);
router.post('/notifications/send-leads', authenticate, authorize('ADMIN', 'LEAD_MANAGER'), sendLeadsBroadcastEmail);

router.get('/activity', authenticate, authorize('ADMIN'), getActivityLogs);

router.get('/packages', authenticate, getPackages);
router.post('/packages', authenticate, authorize('ADMIN'), createPackage);
router.get('/packages/:id', authenticate, getPackageById);
router.put('/packages/:id', authenticate, authorize('ADMIN'), updatePackage);
router.delete('/packages/:id', authenticate, authorize('ADMIN'), deletePackage);
router.patch('/packages/:id/status', authenticate, authorize('ADMIN'), updatePackageStatus);
router.post('/cases/:id/package', authenticate, authorize('ADMIN', 'LEAD_MANAGER'), assignCasePackage);
router.get('/cases/:id/package', authenticate, getCasePackage);

router.get('/payments', authenticate, getPayments);
router.get('/cases/:id/payments', authenticate, getCasePayments);
router.post('/cases/:id/payments', authenticate, upload.single('file'), addPayment);
router.get('/payments/:id/download', authenticate, downloadPaymentReceipt);
router.get('/cases/:id/payment-summary', authenticate, getCasePaymentSummary);

module.exports = router;
