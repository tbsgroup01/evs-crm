const bcrypt = require('bcrypt');
const { User, Role, Lead, Case, ActivityLog } = require('../models');

const getUsers = async (req, res) => {
  try {
    const list = await User.findAll({
      attributes: { exclude: ['password_hash'] },
      include: [
        { model: Role, as: 'role', attributes: ['id', 'name'] },
        { model: Lead, as: 'assignedLeads', attributes: ['id'] },
        { model: Case, as: 'managedCases', attributes: ['id'] }
      ],
      order: [['name', 'ASC']]
    });

    const formatted = list.map(u => {
      const data = u.toJSON();
      return {
        id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        role: data.role ? data.role.name : 'N/A',
        assignedLeadsCount: data.assignedLeads ? data.assignedLeads.length : 0,
        assignedCasesCount: data.managedCases ? data.managedCases.length : 0,
        status: data.status,
        last_login: data.last_login,
        created_at: data.created_at
      };
    });

    return res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve users', errors: [error.message] });
  }
};

const createUser = async (req, res) => {
  try {
    const { name, email, phone, password, role_id, status } = req.body;
    if (!name || !email || !password || !role_id) {
      return res.status(400).json({ success: false, message: 'Name, email, password, and role are required' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already in use' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      phone,
      password_hash: passwordHash,
      role_id,
      status: status || 'ACTIVE'
    });

    await ActivityLog.create({
      user_id: req.user.id,
      entity_type: 'User',
      entity_id: user.id,
      action: 'USER_CREATED',
      description: `User ${name} (${email}) created by ${req.user.name}`,
      ip_address: req.ip
    });

    return res.status(201).json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        status: user.status
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create user', errors: [error.message] });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password_hash'] },
      include: [{ model: Role, as: 'role', attributes: ['id', 'name'] }]
    });

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch user details', errors: [error.message] });
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const { name, email, phone, role_id } = req.body;
    await user.update({ name, email, phone, role_id });

    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update user', errors: [error.message] });
  }
};

const toggleUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    await user.update({ status });

    await ActivityLog.create({
      user_id: req.user.id,
      entity_type: 'User',
      entity_id: user.id,
      action: 'USER_DISABLED',
      description: `User status changed to ${status} for user ${user.name} (${user.email}) by admin ${req.user.name}`,
      ip_address: req.ip
    });

    return res.status(200).json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update user status', errors: [error.message] });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ success: false, message: 'Password is required' });

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const passwordHash = await bcrypt.hash(password, 10);
    await user.update({ password_hash: passwordHash });

    await ActivityLog.create({
      user_id: req.user.id,
      entity_type: 'User',
      entity_id: user.id,
      action: 'USER_PASSWORD_RESET',
      description: `Password reset for user ${user.name} (${user.email}) by admin ${req.user.name}`,
      ip_address: req.ip
    });

    return res.status(200).json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to reset password', errors: [error.message] });
  }
};

const getUserActivity = async (req, res) => {
  try {
    const logs = await ActivityLog.findAll({
      where: { user_id: req.params.id },
      order: [['created_at', 'DESC']],
      limit: 100
    });
    return res.status(200).json({ success: true, data: logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve user activities', errors: [error.message] });
  }
};

module.exports = {
  getUsers,
  createUser,
  getUserById,
  updateUser,
  toggleUserStatus,
  resetPassword,
  getUserActivity
};
