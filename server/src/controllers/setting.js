const nodemailer = require('nodemailer');
const { Setting, ActivityLog } = require('../models');

const DEFAULT_SETTINGS = {
  general: {
    app_name: 'EVS CRM',
    logo_icon: '',
    favicon_icon: '',
    contact_no: '+971 4 123 4567',
    contact_email: 'support@evscrm.com'
  },
  email: {
    mail_app: 'Gmail',
    mail_host: 'smtp.gmail.com',
    mail_port: '587',
    mail_user: '',
    mail_pass: '',
    mail_from_name: 'EVS CRM System',
    mail_from_address: 'no-reply@evscrm.com'
  }
};

const getSettings = async (req, res) => {
  try {
    const settingsRows = await Setting.findAll();
    const result = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));

    settingsRows.forEach((row) => {
      const group = row.group || 'general';
      if (!result[group]) {
        result[group] = {};
      }
      result[group][row.key] = row.value;
    });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch system settings',
      errors: [error.message]
    });
  }
};

const updateSettings = async (req, res) => {
  try {
    const { group = 'general', ...fields } = req.body;
    const settingsToUpdate = { ...fields };

    if (req.files) {
      if (req.files.logo && req.files.logo[0]) {
        settingsToUpdate.logo_icon = `/uploads/${req.files.logo[0].filename}`;
      }
      if (req.files.favicon && req.files.favicon[0]) {
        settingsToUpdate.favicon_icon = `/uploads/${req.files.favicon[0].filename}`;
      }
    }

    const entries = Object.entries(settingsToUpdate);
    for (const [key, value] of entries) {
      if (value !== undefined && value !== null) {
        const existing = await Setting.findOne({ where: { key } });
        if (existing) {
          existing.value = String(value);
          existing.group = group;
          await existing.save();
        } else {
          await Setting.create({
            key,
            value: String(value),
            group
          });
        }
      }
    }

    if (req.user) {
      await ActivityLog.create({
        user_id: req.user.id,
        entity_type: 'Setting',
        entity_id: 1,
        action: 'UPDATE_SETTINGS',
        description: `Updated ${group} settings`,
        ip_address: req.ip
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update settings',
      errors: [error.message]
    });
  }
};

const sendTestEmail = async (req, res) => {
  try {
    const { to_email, mail_app, mail_host, mail_port, mail_user, mail_pass } = req.body;

    if (!to_email) {
      return res.status(400).json({
        success: false,
        message: 'Recipient test email address is required'
      });
    }

    let host = mail_host;
    let port = mail_port ? parseInt(mail_port, 10) : 587;
    let user = mail_user;
    let pass = mail_pass;

    if (!host || !user || !pass) {
      const dbSettings = await Setting.findAll({ where: { group: 'email' } });
      const settingsMap = {};
      dbSettings.forEach(s => { settingsMap[s.key] = s.value; });

      host = host || settingsMap.mail_host || 'smtp.gmail.com';
      port = port || (settingsMap.mail_port ? parseInt(settingsMap.mail_port, 10) : 587);
      user = user || settingsMap.mail_user;
      pass = pass || settingsMap.mail_pass;
    }

    if (!user || !pass) {
      return res.status(400).json({
        success: false,
        message: 'Mail App credentials (user and password) are missing or not configured.'
      });
    }

    const secure = port === 465;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: { rejectUnauthorized: false }
    });

    await transporter.sendMail({
      from: `"EVS CRM System" <${user}>`,
      to: to_email,
      subject: 'EVS CRM - Test Email Configuration',
      text: 'This is a test email sent from EVS CRM to verify your Email Configuration settings.',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; border: 1px solid #e2e8f0; rounded: 8px;">
          <h2 style="color: #0f172a; border-bottom: 2px solid #3b82f6; padding-bottom: 8px;">EVS CRM Email Configuration Test</h2>
          <p>Hello,</p>
          <p>This email confirms that your <strong>EVS CRM</strong> Mail Configuration (App: <i>${mail_app || 'SMTP'}</i>) is working correctly!</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #64748b;">Sent automatically by EVS CRM Settings Panel.</p>
        </div>
      `
    });

    return res.status(200).json({
      success: true,
      message: `Test email sent successfully to ${to_email}`
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: `Failed to send test email: ${error.message}`
    });
  }
};

module.exports = {
  getSettings,
  updateSettings,
  sendTestEmail
};
