const { ActivityLog, LeadInteraction } = require('../models');

/**
 * Log activity to both ActivityLog (global audit trail) and LeadInteraction (case/lead timeline)
 */
const logAudit = async ({
  req,
  user,
  entityType,
  entityId,
  leadId,
  action,
  oldValue = null,
  newValue = null,
  description,
  transaction = null
}) => {
  try {
    const activeUser = user || req?.user;
    if (!activeUser) return null;

    const userId = activeUser.id;
    const ipAddress = req?.ip || '::1';

    // 1. Create global ActivityLog record
    const activityLog = await ActivityLog.create({
      user_id: userId,
      entity_type: entityType,
      entity_id: entityId || null,
      action: action,
      old_value: oldValue !== null ? String(oldValue) : null,
      new_value: newValue !== null ? String(newValue) : null,
      description: description,
      ip_address: ipAddress
    }, transaction ? { transaction } : {});

    // 2. If leadId is provided or can be resolved, create a LeadInteraction for case/lead timeline
    if (leadId) {
      const roleName = activeUser.role?.name || activeUser.role || 'USER';
      const formattedNotes = description;

      await LeadInteraction.create({
        lead_id: leadId,
        user_id: userId,
        interaction_type: action,
        notes: formattedNotes,
        old_status: oldValue !== null ? String(oldValue) : null,
        new_status: newValue !== null ? String(newValue) : null,
        interaction_date: new Date()
      }, transaction ? { transaction } : {});
    }

    return activityLog;
  } catch (error) {
    console.error('Error in logAudit helper:', error);
    // Silent fail so main transaction isn't aborted if logging has minor error
    return null;
  }
};

module.exports = {
  logAudit
};
