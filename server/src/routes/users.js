const express = require('express');
const {
  getUsers,
  createUser,
  getUserById,
  updateUser,
  toggleUserStatus,
  resetPassword,
  getUserActivity
} = require('../controllers/user');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../config/storage');

const router = express.Router();

router.get('/users', authenticate, authorize('ADMIN'), getUsers);
router.post('/users', authenticate, authorize('ADMIN'), upload.single('profile_image'), createUser);
router.get('/users/:id', authenticate, authorize('ADMIN'), getUserById);
router.put('/users/:id', authenticate, authorize('ADMIN'), upload.single('profile_image'), updateUser);
router.patch('/users/:id/status', authenticate, authorize('ADMIN'), toggleUserStatus);
router.post('/users/:id/reset-password', authenticate, authorize('ADMIN'), resetPassword);
router.get('/users/:id/activity', authenticate, authorize('ADMIN'), getUserActivity);

module.exports = router;
