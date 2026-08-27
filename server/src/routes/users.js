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

const router = express.Router();

router.use(authenticate, authorize('ADMIN'));

router.get('/users', getUsers);
router.post('/users', createUser);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.patch('/users/:id/status', toggleUserStatus);
router.post('/users/:id/reset-password', resetPassword);
router.get('/users/:id/activity', getUserActivity);

module.exports = router;
