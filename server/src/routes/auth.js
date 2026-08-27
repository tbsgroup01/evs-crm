const express = require('express');
const { login, logout, me, refresh, forgotPassword, resetPassword, registerAdmin } = require('../controllers/auth');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/login', login);
router.post('/register-admin', registerAdmin);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, me);
router.post('/refresh', refresh);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;
