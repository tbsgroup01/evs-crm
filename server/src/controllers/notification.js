const { Notification, User } = require('../models');

const getNotifications = async (req, res) => {
  try {
    const list = await Notification.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']]
    });
    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve notifications', errors: [error.message] });
  }
};

const markAsRead = async (req, res) => {
  try {
    const n = await Notification.findOne({
      where: { id: req.params.id, user_id: req.user.id }
    });
    if (!n) return res.status(404).json({ success: false, message: 'Notification not found' });

    await n.update({ is_read: true });
    return res.status(200).json({ success: true, data: n });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to mark notification as read', errors: [error.message] });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await Notification.update(
      { is_read: true },
      { where: { user_id: req.user.id } }
    );
    return res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to mark notifications as read', errors: [error.message] });
  }
};

const sendNotification = async (req, res) => {
  try {
    const { userIds, allUsers, title, message, type = 'SYSTEM_ALERT' } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }

    let targetUserIds = [];

    if (allUsers) {
      const activeUsers = await User.findAll({ where: { status: 'ACTIVE' } });
      targetUserIds = activeUsers.map(u => u.id);
    } else if (Array.isArray(userIds) && userIds.length > 0) {
      targetUserIds = userIds;
    } else {
      return res.status(400).json({ success: false, message: 'Please specify userIds or select allUsers' });
    }

    if (targetUserIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No target users found' });
    }

    const records = targetUserIds.map(uid => ({
      user_id: uid,
      type,
      title,
      message,
      is_read: false
    }));

    await Notification.bulkCreate(records);

    return res.status(201).json({ success: true, message: `Notification successfully sent to ${targetUserIds.length} users` });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to send notifications', errors: [error.message] });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  sendNotification
};
