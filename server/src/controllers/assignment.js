const { sequelize, Lead, User, Role, LeadInteraction, ActivityLog, Notification } = require('../models');
const { Op } = require('sequelize');
const { createNotification } = require('../services/notificationService');
const { getRealIp } = require('../utils/ipHelper');

const getUnassignedLeads = async (req, res) => {
  try {
    const leads = await Lead.findAll({
      where: { counselor_id: null },
      order: [['created_at', 'DESC']],
      include: [{ model: User, as: 'creator', attributes: ['id', 'name'] }]
    });
    return res.status(200).json({ success: true, data: leads });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve unassigned leads', errors: [error.message] });
  }
};

const assignLead = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { counselor_id } = req.body;

    if (!counselor_id) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Counselor ID is required' });
    }

    const lead = await Lead.findByPk(id, { transaction });
    if (!lead) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const counselor = await User.findByPk(counselor_id, {
      include: [{ model: Role, as: 'role', where: { name: 'COUNSELOR' } }],
      transaction
    });

    if (!counselor) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Counselor not found or invalid role' });
    }

    const oldCounselorId = lead.counselor_id;
    await lead.update({ counselor_id }, { transaction });

    await LeadInteraction.create({
      lead_id: lead.id,
      user_id: req.user.id,
      interaction_type: 'ASSIGNMENT',
      interaction_date: new Date(),
      notes: `Lead assigned to Counselor: ${counselor.name}`
    }, { transaction });

    await createNotification({
      userId: counselor_id,
      type: 'LEAD_ASSIGNED',
      title: 'New Lead Assigned',
      message: `You have been assigned a new lead: ${lead.client_name} (${lead.lead_number})`,
      entityType: 'Lead',
      entityId: lead.id
    });

    await ActivityLog.create({
      user_id: req.user.id,
      entity_type: 'Lead',
      entity_id: lead.id,
      action: 'ASSIGN_LEAD',
      old_value: oldCounselorId,
      new_value: counselor_id,
      description: `Lead ${lead.lead_number} assigned to counselor ${counselor.name}`,
      ip_address: getRealIp(req)
    }, { transaction });

    await transaction.commit();
    return res.status(200).json({ success: true, message: 'Lead assigned successfully', data: lead });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({ success: false, message: 'Failed to assign lead', errors: [error.message] });
  }
};

const reassignLead = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { counselor_id } = req.body;

    const lead = await Lead.findByPk(id, { transaction });
    if (!lead) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    const counselor = await User.findByPk(counselor_id, {
      include: [{ model: Role, as: 'role', where: { name: 'COUNSELOR' } }],
      transaction
    });

    if (!counselor) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Counselor not found or invalid role' });
    }

    const oldCounselorId = lead.counselor_id;
    await lead.update({ counselor_id }, { transaction });

    await LeadInteraction.create({
      lead_id: lead.id,
      user_id: req.user.id,
      interaction_type: 'REASSIGNMENT',
      interaction_date: new Date(),
      notes: `Lead reassigned to Counselor: ${counselor.name}`
    }, { transaction });

    await createNotification({
      userId: counselor_id,
      type: 'LEAD_REASSIGNED',
      title: 'Lead Reassigned',
      message: `You have been reassigned lead: ${lead.client_name} (${lead.lead_number})`,
      entityType: 'Lead',
      entityId: lead.id
    });

    await ActivityLog.create({
      user_id: req.user.id,
      entity_type: 'Lead',
      entity_id: lead.id,
      action: 'REASSIGN_LEAD',
      old_value: oldCounselorId,
      new_value: counselor_id,
      description: `Lead ${lead.lead_number} reassigned to counselor ${counselor.name}`,
      ip_address: getRealIp(req)
    }, { transaction });

    await transaction.commit();
    return res.status(200).json({ success: true, message: 'Lead reassigned successfully', data: lead });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({ success: false, message: 'Failed to reassign lead', errors: [error.message] });
  }
};

const bulkAssignLeads = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { lead_ids, counselor_id } = req.body;

    if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Lead IDs array is required' });
    }

    if (!counselor_id) {
      await transaction.rollback();
      return res.status(400).json({ success: false, message: 'Counselor ID is required' });
    }

    const counselor = await User.findByPk(counselor_id, {
      include: [{ model: Role, as: 'role', where: { name: 'COUNSELOR' } }],
      transaction
    });

    if (!counselor) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'Counselor not found or invalid role' });
    }

    await Lead.update(
      { counselor_id },
      { where: { id: { [Op.in]: lead_ids } }, transaction }
    );

    for (const id of lead_ids) {
      await LeadInteraction.create({
        lead_id: id,
        user_id: req.user.id,
        interaction_type: 'ASSIGNMENT',
        interaction_date: new Date(),
        notes: `Bulk assigned to Counselor: ${counselor.name}`
      }, { transaction });
    }

    await createNotification({
      userId: counselor_id,
      type: 'LEAD_ASSIGNED_BULK',
      title: 'Bulk Leads Assigned',
      message: `You have been bulk-assigned ${lead_ids.length} new leads.`,
      entityType: 'User',
      entityId: counselor_id
    });

    await ActivityLog.create({
      user_id: req.user.id,
      entity_type: 'User',
      entity_id: counselor_id,
      action: 'BULK_ASSIGN_LEADS',
      new_value: JSON.stringify({ lead_ids, counselor_id }),
      description: `Bulk assigned ${lead_ids.length} leads to counselor ${counselor.name}`,
      ip_address: getRealIp(req)
    }, { transaction });

    await transaction.commit();
    return res.status(200).json({ success: true, message: `Successfully assigned ${lead_ids.length} leads` });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({ success: false, message: 'Failed bulk assignment', errors: [error.message] });
  }
};

const getCounselorWorkload = async (req, res) => {
  try {
    const counselors = await User.findAll({
      include: [
        { model: Role, as: 'role', where: { name: 'COUNSELOR' } },
        { model: Lead, as: 'assignedLeads', attributes: ['id', 'status'] }
      ]
    });

    const workload = counselors.map(c => {
      const leads = c.assignedLeads || [];
      return {
        counselor_name: c.name,
        counselor_id: c.id,
        total: leads.length,
        new: leads.filter(l => l.status === 'NEW').length,
        interested: leads.filter(l => l.status === 'INTERESTED').length,
        follow_up: leads.filter(l => l.status === 'FOLLOW_UP').length,
        cold: leads.filter(l => l.status === 'COLD_LEAD').length,
        not_interested: leads.filter(l => l.status === 'NOT_INTERESTED').length,
        converted: leads.filter(l => l.status === 'CONVERTED').length
      };
    });

    return res.status(200).json({ success: true, data: workload });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve workload metrics', errors: [error.message] });
  }
};

module.exports = {
  getUnassignedLeads,
  assignLead,
  reassignLead,
  bulkAssignLeads,
  getCounselorWorkload
};
