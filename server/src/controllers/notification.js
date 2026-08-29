const { Notification, User, Lead } = require('../models');
const { broadcastNotification, sendLeadEmailBroadcast } = require('../services/notificationService');

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
    const { userIds, allUsers, targetType = 'ALL', targetRole, title, message, type = 'SYSTEM_ALERT' } = req.body;

    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }

    let finalTargetType = targetType;
    if (allUsers) {
      finalTargetType = 'ALL';
    } else if (targetRole) {
      finalTargetType = 'ROLE';
    } else if (Array.isArray(userIds) && userIds.length > 0) {
      finalTargetType = 'SPECIFIC';
    }

    const result = await broadcastNotification({
      targetType: finalTargetType,
      targetRole,
      userIds,
      title,
      message,
      type
    });

    return res.status(201).json({
      success: true,
      message: result.message,
      count: result.count
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to send notifications', errors: [error.message] });
  }
};

const sendLeadsBroadcastEmail = async (req, res) => {
  try {
    const { leadIds, allLeads = false, statusFilter = 'ALL', subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ success: false, message: 'Subject and message are required fields' });
    }

    if (!allLeads && (!Array.isArray(leadIds) || leadIds.length === 0)) {
      return res.status(400).json({ success: false, message: 'Please select target leads or check all leads' });
    }

    const result = await sendLeadEmailBroadcast({
      leadIds,
      allLeads,
      statusFilter,
      subject,
      message,
      senderUserId: req.user.id
    });

    return res.status(200).json({
      success: true,
      message: result.message,
      count: result.count
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to send broadcast email to leads' });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  sendNotification,
  sendLeadsBroadcastEmail
};
