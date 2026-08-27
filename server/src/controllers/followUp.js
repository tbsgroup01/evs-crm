const { Lead, LeadFollowUp, User, LeadInteraction } = require('../models');

const getFollowUps = async (req, res) => {
  try {
    const where = {};
    if (req.user.role.name === 'COUNSELOR') {
      where.assigned_to = req.user.id;
    }
    const followUps = await LeadFollowUp.findAll({
      where,
      include: [
        { model: Lead, attributes: ['id', 'lead_number', 'client_name', 'mobile', 'status'] },
        { model: User, as: 'assignedUser', attributes: ['id', 'name'] }
      ],
      order: [['follow_up_date', 'ASC']]
    });
    return res.status(200).json({ success: true, data: followUps });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve follow-ups', errors: [error.message] });
  }
};

const createFollowUp = async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_to, follow_up_date, notes } = req.body;

    const lead = await Lead.findByPk(id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    if (req.user.role.name === 'COUNSELOR' && lead.counselor_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied to this lead' });
    }

    const assignedUser = assigned_to || lead.counselor_id || req.user.id;

    const followUp = await LeadFollowUp.create({
      lead_id: lead.id,
      assigned_to: assignedUser,
      follow_up_date: new Date(follow_up_date),
      notes,
      status: 'PENDING'
    });

    await lead.update({ follow_up_date: new Date(follow_up_date) });

    await LeadInteraction.create({
      lead_id: lead.id,
      user_id: req.user.id,
      interaction_type: 'FOLLOW_UP_SCHEDULED',
      interaction_date: new Date(),
      notes: `Follow-up scheduled on ${follow_up_date}. Notes: ${notes || ''}`,
      next_followup_date: new Date(follow_up_date)
    });

    return res.status(201).json({ success: true, data: followUp });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create follow-up', errors: [error.message] });
  }
};

const updateFollowUp = async (req, res) => {
  try {
    const { id } = req.params;
    const { follow_up_date, notes, status } = req.body;

    const followUp = await LeadFollowUp.findByPk(id);
    if (!followUp) return res.status(404).json({ success: false, message: 'Follow-up not found' });

    if (req.user.role.name === 'COUNSELOR' && followUp.assigned_to !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const updateData = {};
    if (follow_up_date) {
      updateData.follow_up_date = new Date(follow_up_date);
      const lead = await Lead.findByPk(followUp.lead_id);
      if (lead) await lead.update({ follow_up_date: new Date(follow_up_date) });
    }
    if (notes) updateData.notes = notes;
    if (status) updateData.status = status;

    await followUp.update(updateData);
    return res.status(200).json({ success: true, data: followUp });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update follow-up', errors: [error.message] });
  }
};

const completeFollowUp = async (req, res) => {
  try {
    const { id } = req.params;
    const followUp = await LeadFollowUp.findByPk(id);
    if (!followUp) return res.status(404).json({ success: false, message: 'Follow-up not found' });

    if (req.user.role.name === 'COUNSELOR' && followUp.assigned_to !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await followUp.update({
      status: 'COMPLETED',
      completed_at: new Date()
    });

    await LeadInteraction.create({
      lead_id: followUp.lead_id,
      user_id: req.user.id,
      interaction_type: 'FOLLOW_UP_COMPLETED',
      interaction_date: new Date(),
      notes: `Completed follow-up from ${followUp.follow_up_date.toISOString().split('T')[0]}`
    });

    return res.status(200).json({ success: true, data: followUp });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to complete follow-up', errors: [error.message] });
  }
};

module.exports = {
  getFollowUps,
  createFollowUp,
  updateFollowUp,
  completeFollowUp
};
