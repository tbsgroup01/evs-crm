const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
// const rateLimit = require('express-rate-limit');
const path = require('path');
const logger = require('./utils/logger');
const authRoutes = require('./routes/auth');
const leadsRoutes = require('./routes/leads');
const casesRoutes = require('./routes/cases');
const dashboardRoutes = require('./routes/dashboard');
const usersRoutes = require('./routes/users');
const settingsRoutes = require('./routes/settings');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));

const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5505'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url} - IP: ${req.ip}`);
  next();
});

app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CRM API is running'
  });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', leadsRoutes);
app.use('/api/v1', casesRoutes);
app.use('/api/v1', dashboardRoutes);
app.use('/api/v1', usersRoutes);
app.use('/api/v1/settings', settingsRoutes);

app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.use((err, req, res, next) => {
  logger.error(`${err.message} - ${req.method} ${req.url} - Stack: ${err.stack}`);
  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : message,
    errors: err.errors || []
  });
});

module.exports = app;
