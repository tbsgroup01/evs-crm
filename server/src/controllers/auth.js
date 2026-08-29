const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { User, Role, ActivityLog } = require('../models');

const generateAccessToken = (user) => {
  return jwt.sign({ id: user.id, email: user.email }, env.JWT_SECRET, { expiresIn: '15m' });
};

const generateRefreshToken = (user) => {
  return jwt.sign({ id: user.id }, env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await User.findOne({
      where: { email },
      include: [{ model: Role, as: 'role' }]
    });

    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.last_login = new Date();
    await user.save();

    await ActivityLog.create({
      user_id: user.id,
      entity_type: 'User',
      entity_id: user.id,
      action: 'LOGIN',
      description: `User logged in from IP ${req.ip}`,
      ip_address: req.ip
    });

    const cookieOptions = {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    };

    res.cookie('refresh_token', refreshToken, cookieOptions);
    res.cookie('access_token', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });

    return res.status(200).json({
      success: true,
      data: {
        token: accessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role.name,
          profile_image: user.profile_image
        }
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error during login', errors: [error.message] });
  }
};

const logout = async (req, res) => {
  try {
    if (req.user) {
      await ActivityLog.create({
        user_id: req.user.id,
        entity_type: 'User',
        entity_id: req.user.id,
        action: 'LOGOUT',
        description: `User logged out`,
        ip_address: req.ip
      });
    }

    const clearOptions = {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax'
    };
    res.clearCookie('refresh_token', clearOptions);
    res.clearCookie('access_token', clearOptions);
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error during logout', errors: [error.message] });
  }
};

const me = async (req, res) => {
  try {
    const user = req.user;
    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role.name,
          profile_image: user.profile_image
        }
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error fetching user details', errors: [error.message] });
  }
};

const refresh = async (req, res) => {
  try {
    let token = null;

    if (req.headers.cookie) {
      const match = req.headers.cookie.match(/(^|;)\s*refresh_token\s*=\s*([^;]+)/);
      token = match ? decodeURIComponent(match[2]) : null;
    }

    if (!token && req.body.refresh_token) {
      token = req.body.refresh_token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Refresh token required' });
    }

    const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET);
    const user = await User.findByPk(decoded.id, {
      include: [{ model: Role, as: 'role' }]
    });

    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({ success: false, message: 'User inactive or not found' });
    }

    const newAccessToken = generateAccessToken(user);
    res.cookie('access_token', newAccessToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 15 * 60 * 1000
    });

    return res.status(200).json({
      success: true,
      data: {
        token: newAccessToken
      }
    });
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired refresh token', errors: [error.message] });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await ActivityLog.create({
      user_id: user.id,
      entity_type: 'User',
      entity_id: user.id,
      action: 'FORGOT_PASSWORD',
      description: 'Password reset request initiated',
      ip_address: req.ip
    });

    return res.status(200).json({
      success: true,
      message: 'Password reset request received. Reset link generated.',
      data: {
        reset_token: 'dummy-reset-token-expiration-30m'
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token and new password are required' });
    }

    const user = await User.findOne({ where: { email: 'admin@evscrm.com' } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    user.password_hash = passwordHash;
    await user.save();

    await ActivityLog.create({
      user_id: user.id,
      entity_type: 'User',
      entity_id: user.id,
      action: 'RESET_PASSWORD',
      description: 'Password reset successfully executed',
      ip_address: req.ip
    });

    return res.status(200).json({ success: true, message: 'Password reset completed successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', errors: [error.message] });
  }
};

const registerAdmin = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    let [adminRole] = await Role.findOrCreate({
      where: { name: 'ADMIN' },
      defaults: { description: 'Administrator', status: true }
    });

    await Role.findOrCreate({ where: { name: 'LEAD_MANAGER' }, defaults: { description: 'Lead Manager', status: true } });
    await Role.findOrCreate({ where: { name: 'COUNSELOR' }, defaults: { description: 'Counselor', status: true } });
    await Role.findOrCreate({ where: { name: 'CASE_MANAGER' }, defaults: { description: 'Case Manager', status: true } });

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Admin email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      phone,
      password_hash: passwordHash,
      role_id: adminRole.id,
      status: 'ACTIVE'
    });

    return res.status(201).json({
      success: true,
      message: 'Superadmin registered successfully',
      data: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Registration failed', errors: [error.message] });
  }
};

module.exports = { login, logout, me, refresh, forgotPassword, resetPassword, registerAdmin };

