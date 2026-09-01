const nodemailer = require('nodemailer');
const { Notification, User, Role, Lead, LeadInteraction, Setting } = require('../models');
const logger = require('../utils/logger');

/**
 * Send an email notification to a user using SMTP configuration from system settings.
 */
async function sendNotificationEmail(userId, title, message) {
  try {
    const user = await User.findByPk(userId);
    if (!user || !user.email) return;

    // Fetch email settings from Setting model
    const settings = await Setting.findAll({ where: { group: 'email' } });
    const config = {};
    settings.forEach((s) => {
      config[s.key] = s.value;
    });

    const host = config.mail_host || process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = config.mail_port ? parseInt(config.mail_port, 10) : 587;
    const mailUser = config.mail_user || process.env.SMTP_USER;
    const pass = config.mail_pass || process.env.SMTP_PASS;
    const fromName = config.mail_from_name || 'EVG CRM System';

    // For Gmail SMTP, the envelope sender MUST match the authenticated user email for guaranteed delivery
    const fromAddress = (host.includes('gmail.com') || !config.mail_from_address) ? mailUser : config.mail_from_address;

    if (!mailUser || !pass) {
      logger.info(`[NotificationEmail] Skipped email to ${user.email} - SMTP credentials not configured.`);
      return;
    }

    const secure = port === 465;
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user: mailUser, pass },
      tls: { rejectUnauthorized: false }
    });

    await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      replyTo: config.mail_from_address || mailUser,
      to: user.email,
      subject: `[EVG CRM] ${title}`,
      text: `${title}\n\nHi ${user.name},\n\n${message}\n\nBest regards,\nEVG CRM Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff; margin: 0 auto;">
          <h2 style="color: #0f172a; margin-top: 0; font-size: 20px; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
            ${title}
          </h2>
          <p style="color: #334155; font-size: 15px; line-height: 1.6;">Hi <strong>${user.name}</strong>,</p>
          <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 14px 18px; margin: 18px 0; border-radius: 6px;">
            <p style="color: #1e293b; font-size: 14px; margin: 0; line-height: 1.6;">${message}</p>
          </div>
          <p style="color: #64748b; font-size: 13px; margin-top: 24px;">Log in to your EVG CRM dashboard to view details and manage your account.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">This is an automated notification from EVG CRM System.</p>
        </div>
      `
    });

    logger.info(`[NotificationEmail] Email notification sent successfully to ${user.email}`);
  } catch (error) {
    logger.error(`[NotificationEmail] Failed to send email to userId ${userId}: ${error.message}`);
  }
}

/**
 * Creates in-app Notification record AND triggers asynchronous email notification.
 */
async function createNotification({ userId, type = 'SYSTEM_ALERT', title, message, entityType = null, entityId = null }) {
  try {
    const notification = await Notification.create({
      user_id: userId,
      type,
      title,
      message,
      entity_type: entityType,
      entity_id: entityId,
      is_read: false
    });

    // Trigger email asynchronously in background
    sendNotificationEmail(userId, title, message).catch((err) => {
      logger.error(`[NotificationEmail] Async send error: ${err.message}`);
    });

    return notification;
  } catch (error) {
    logger.error(`[NotificationService] Error creating notification for user ${userId}: ${error.message}`);
    throw error;
  }
}

/**
 * Broadcasts notification to targeted user group or all active staff members.
 */
async function broadcastNotification({ targetType = 'ALL', targetRole = null, userIds = [], title, message, type = 'SYSTEM_ALERT' }) {
  try {
    let whereCondition = { status: 'ACTIVE' };

    if (targetType === 'ROLE' && targetRole) {
      const roleObj = await Role.findOne({ where: { name: targetRole } });
      if (roleObj) {
        whereCondition.role_id = roleObj.id;
      }
    } else if (targetType === 'SPECIFIC' && Array.isArray(userIds) && userIds.length > 0) {
      const { Op } = require('sequelize');
      whereCondition.id = { [Op.in]: userIds };
    }

    const activeUsers = await User.findAll({ where: whereCondition });
    if (!activeUsers || activeUsers.length === 0) {
      return { count: 0, message: 'No target users found for this broadcast criteria.' };
    }

    const records = activeUsers.map((u) => ({
      user_id: u.id,
      type,
      title,
      message,
      is_read: false
    }));

    await Notification.bulkCreate(records);

    // Send email to all targeted users asynchronously
    activeUsers.forEach((u) => {
      sendNotificationEmail(u.id, title, message).catch((err) => {
        logger.error(`[NotificationEmail] Async send error for user ${u.id}: ${err.message}`);
      });
    });

    return { count: activeUsers.length, message: `Notification successfully sent to ${activeUsers.length} users.` };
  } catch (error) {
    logger.error(`[NotificationService] Error broadcasting notification: ${error.message}`);
    throw error;
  }
}

/**
 * Sends an email broadcast announcement to a list of leads.
 */
async function sendLeadEmailBroadcast({ leadIds = [], allLeads = false, statusFilter = null, subject, message, senderUserId = null }) {
  try {
    const { Op } = require('sequelize');

    let whereCondition = {};
    if (statusFilter && statusFilter !== 'ALL') {
      whereCondition.status = statusFilter;
    }

    if (!allLeads && Array.isArray(leadIds) && leadIds.length > 0) {
      whereCondition.id = { [Op.in]: leadIds };
    }

    const leads = await Lead.findAll({ where: whereCondition });
    const leadsWithEmail = leads.filter((l) => l.email && l.email.trim() !== '');

    if (leadsWithEmail.length === 0) {
      return { count: 0, message: 'No leads with valid email addresses found for the selection.' };
    }

    // Fetch SMTP credentials from Setting model
    const settings = await Setting.findAll({ where: { group: 'email' } });
    const config = {};
    settings.forEach((s) => { config[s.key] = s.value; });

    const host = config.mail_host || process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = config.mail_port ? parseInt(config.mail_port, 10) : 587;
    const mailUser = config.mail_user || process.env.SMTP_USER;
    const pass = config.mail_pass || process.env.SMTP_PASS;
    const fromName = config.mail_from_name || 'EVG Immigration & CRM Services';

    // For Gmail SMTP, fromAddress MUST match the authenticated Gmail user email for successful delivery
    const fromAddress = (host.includes('gmail.com') || !config.mail_from_address) ? mailUser : config.mail_from_address;

    if (!mailUser || !pass) {
      throw new Error('SMTP email credentials are not configured in System Settings.');
    }

    const secure = port === 465;
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user: mailUser, pass },
      tls: { rejectUnauthorized: false }
    });

    let sentCount = 0;
    for (const lead of leadsWithEmail) {
      try {
        const info = await transporter.sendMail({
          from: `"${fromName}" <${fromAddress}>`,
          replyTo: config.mail_from_address || mailUser,
          to: lead.email,
          subject: subject || 'Announcement from EVG Immigration',
          text: `Dear ${lead.client_name},\n\n${message}\n\nBest regards,\n${fromName}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff; margin: 0 auto;">
              <div style="background-color: #0f172a; padding: 16px; border-radius: 6px 6px 0 0; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 20px;">${fromName}</h1>
              </div>
              <div style="padding: 20px 0;">
                <h2 style="color: #0f172a; margin-top: 0; font-size: 18px;">${subject}</h2>
                <p style="color: #334155; font-size: 15px; line-height: 1.6;">Dear <strong>${lead.client_name}</strong>,</p>
                <div style="color: #1e293b; font-size: 14px; line-height: 1.6; background-color: #f8fafc; padding: 16px; border-radius: 6px; border: 1px solid #f1f5f9; white-space: pre-wrap;">
                  ${message}
                </div>
              </div>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="color: #94a3b8; font-size: 12px; margin: 0; text-align: center;">EVG Immigration Services. All rights reserved.</p>
            </div>
          `
        });

        logger.info(`[LeadEmailBroadcast] Email delivered to ${lead.email}: ${info.response}`);
        sentCount++;

        if (senderUserId) {
          await LeadInteraction.create({
            lead_id: lead.id,
            user_id: senderUserId,
            interaction_type: 'EMAIL',
            interaction_date: new Date(),
            notes: `Broadcast email sent: "${subject}"`
          }).catch(() => { });
        }
      } catch (err) {
        logger.error(`[LeadEmailBroadcast] Error sending email to ${lead.email}: ${err.message}`);
      }
    }

    if (sentCount === 0 && leadsWithEmail.length > 0) {
      throw new Error('Failed to deliver broadcast email to selected leads. Please check SMTP settings or check server logs.');
    }

    return {
      count: sentCount,
      totalLeads: leadsWithEmail.length,
      message: `Broadcast email successfully sent to ${sentCount} of ${leadsWithEmail.length} lead(s).`
    };
  } catch (error) {
    logger.error(`[LeadEmailBroadcast] Broadcast error: ${error.message}`);
    throw error;
  }
}

module.exports = {
  createNotification,
  broadcastNotification,
  sendNotificationEmail,
  sendLeadEmailBroadcast
};
