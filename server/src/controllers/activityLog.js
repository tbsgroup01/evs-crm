const { ActivityLog, User } = require('../models');

const getActivityLogs = async (req, res) => {
  try {
    const logs = await ActivityLog.findAll({
      order: [['created_at', 'DESC']],
      include: [{ model: User, attributes: ['id', 'name', 'email'] }]
    });
    return res.status(200).json({ success: true, data: logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve system activity logs', errors: [error.message] });
  }
};

module.exports = { getActivityLogs };
