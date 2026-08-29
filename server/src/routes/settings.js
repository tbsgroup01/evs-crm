const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getSettings, updateSettings, sendTestEmail } = require('../controllers/setting');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({ storage });

router.get('/', authenticate, getSettings);
router.put(
  '/',
  authenticate,
  authorize('ADMIN'),
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'favicon', maxCount: 1 }
  ]),
  updateSettings
);
router.post('/test-email', authenticate, authorize('ADMIN'), sendTestEmail);

module.exports = router;
