const { Op } = require('sequelize');
const { Lead, User, Role, LeadInteraction, ActivityLog, Notification } = require('../models');
const { leadCreateSchema, leadUpdateSchema } = require('../validators/lead');

const createLead = async (req, res) => {
  try {
    const validated = leadCreateSchema.parse(req.body);
    const maxId = await Lead.max('id') || 0;
    const leadNumber = `LEAD-${1000 + maxId + 1}`;

    const lead = await Lead.create({
      ...validated,
      lead_number: leadNumber,
      created_by: req.user.id
    });

    await ActivityLog.create({
      user_id: req.user.id,
      entity_type: 'Lead',
      entity_id: lead.id,
      action: 'CREATE_LEAD',
      new_value: JSON.stringify(lead),
      description: `Manual lead ${leadNumber} created by ${req.user.name}`,
      ip_address: req.ip
    });

    return res.status(201).json({ success: true, data: lead });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || 'Validation failed', errors: error.errors || [] });
  }
};

const getLeads = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      counselor_id,
      lead_source,
      country,
      city,
      date_from,
      date_to,
      follow_up_from,
      follow_up_to,
      sort = 'DESC',
      sortBy = 'created_at'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = {};

    if (req.user.role.name === 'COUNSELOR') {
      where.counselor_id = req.user.id;
    } else if (counselor_id) {
      where.counselor_id = counselor_id;
    }

    if (status) where.status = status;
    if (lead_source) where.lead_source = lead_source;
    if (country) where.country = country;
    if (city) where.city = city;

    if (search) {
      where[Op.or] = [
        { client_name: { [Op.like]: `%${search}%` } },
        { mobile: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { lead_number: { [Op.like]: `%${search}%` } }
      ];
    }

    if (date_from && date_to) {
      where.created_at = { [Op.between]: [new Date(date_from), new Date(date_to)] };
    }
    if (follow_up_from && follow_up_to) {
      where.follow_up_date = { [Op.between]: [new Date(follow_up_from), new Date(follow_up_to)] };
    }

    const { count, rows } = await Lead.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [[sortBy, sort]],
      include: [
        { model: User, as: 'counselor', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'creator', attributes: ['id', 'name'] }
      ]
    });

    return res.status(200).json({
      success: true,
      data: {
        leads: rows,
        total: count,
        page: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve leads', errors: [error.message] });
  }
};

const getLeadById = async (req, res) => {
  try {
    const where = { id: req.params.id };
    if (req.user.role.name === 'COUNSELOR') {
      where.counselor_id = req.user.id;
    }

    const lead = await Lead.findOne({
      where,
      include: [
        { model: User, as: 'counselor', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'creator', attributes: ['id', 'name'] }
      ]
    });

    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found or access denied' });

    return res.status(200).json({ success: true, data: lead });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch lead details', errors: [error.message] });
  }
};

const updateLead = async (req, res) => {
  try {
    const validated = leadUpdateSchema.parse(req.body);
    const where = { id: req.params.id };
    if (req.user.role.name === 'COUNSELOR') {
      where.counselor_id = req.user.id;
    }

    const lead = await Lead.findOne({ where });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const oldValue = JSON.stringify(lead);
    await lead.update(validated);

    await ActivityLog.create({
      user_id: req.user.id,
      entity_type: 'Lead',
      entity_id: lead.id,
      action: 'UPDATE_LEAD',
      old_value: oldValue,
      new_value: JSON.stringify(lead),
      description: `Lead ${lead.lead_number} updated by ${req.user.name}`,
      ip_address: req.ip
    });

    return res.status(200).json({ success: true, data: lead });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || 'Validation failed', errors: error.errors || [] });
  }
};

const deleteLead = async (req, res) => {
  try {
    const where = { id: req.params.id };
    if (req.user.role.name === 'COUNSELOR') {
      where.counselor_id = req.user.id;
    }

    const lead = await Lead.findOne({ where });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    await lead.destroy();

    await ActivityLog.create({
      user_id: req.user.id,
      entity_type: 'Lead',
      entity_id: req.params.id,
      action: 'DELETE_LEAD',
      description: `Lead ${lead.lead_number} soft-deleted by ${req.user.name}`,
      ip_address: req.ip
    });

    return res.status(200).json({ success: true, message: 'Lead deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete lead', errors: [error.message] });
  }
};

const updateLeadStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, message: 'Status is required' });

    const where = { id: req.params.id };
    if (req.user.role.name === 'COUNSELOR') {
      where.counselor_id = req.user.id;
    }

    const lead = await Lead.findOne({ where });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const oldStatus = lead.status;
    await lead.update({ status });

    await LeadInteraction.create({
      lead_id: lead.id,
      user_id: req.user.id,
      interaction_type: 'STATUS_UPDATE',
      interaction_date: new Date(),
      notes: `Status updated from ${oldStatus} to ${status}`,
      old_status: oldStatus,
      new_status: status
    });

    await ActivityLog.create({
      user_id: req.user.id,
      entity_type: 'Lead',
      entity_id: lead.id,
      action: 'STATUS_UPDATE',
      old_value: oldStatus,
      new_value: status,
      description: `Lead ${lead.lead_number} status updated from ${oldStatus} to ${status}`,
      ip_address: req.ip
    });

    return res.status(200).json({ success: true, data: lead });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update lead status', errors: [error.message] });
  }
};

const exportLeads = async (req, res) => {
  try {
    const { status, lead_source, country, city, search } = req.query;
    const where = {};

    if (req.user.role.name === 'COUNSELOR') {
      where.counselor_id = req.user.id;
    }

    if (status) where.status = status;
    if (lead_source) where.lead_source = lead_source;
    if (country) where.country = country;
    if (city) where.city = city;

    if (search) {
      where[Op.or] = [
        { client_name: { [Op.like]: `%${search}%` } },
        { mobile: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    const leads = await Lead.findAll({ where, order: [['created_at', 'DESC']] });

    let csv = '\ufeffLead Number,Client Name,Mobile,Email,Country,City,Status,Source,Estimated Budget,Created At\n';
    leads.forEach(l => {
      const budget = l.estimated_budget ? parseFloat(l.estimated_budget).toFixed(2) : '0.00';
      const clientName = (l.client_name || l.clientName || '').replace(/"/g, '""');
      const mobile = l.mobile || '';
      const email = (l.email || '').replace(/"/g, '""');
      const countryVal = (l.country || '').replace(/"/g, '""');
      const cityVal = (l.city || '').replace(/"/g, '""');
      const leadSource = (l.lead_source || l.leadSource || '').replace(/"/g, '""');
      const createdAtDate = l.created_at || l.createdAt || new Date();
      
      csv += `"${l.lead_number}","${clientName}","${mobile}","${email}","${countryVal}","${cityVal}","${l.status}","${leadSource}",${budget},"${createdAtDate.toISOString()}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
    return res.status(200).send(csv);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to export leads', errors: [error.message] });
  }
};

const getLeadInteractions = async (req, res) => {
  try {
    const { id } = req.params;
    const where = { lead_id: id };

    if (req.user.role.name === 'COUNSELOR') {
      const lead = await Lead.findOne({ where: { id, counselor_id: req.user.id } });
      if (!lead) return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const interactions = await LeadInteraction.findAll({
      where,
      include: [{ model: User, attributes: ['id', 'name'] }],
      order: [['interaction_date', 'DESC']]
    });
    return res.status(200).json({ success: true, data: interactions });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve interactions', errors: [error.message] });
  }
};

const createLeadInteraction = async (req, res) => {
  try {
    const { id } = req.params;
    const { interaction_type, notes, new_status, next_followup_date } = req.body;

    const lead = await Lead.findByPk(id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    if (req.user.role.name === 'COUNSELOR' && lead.counselor_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const oldStatus = lead.status;

    if (new_status && new_status !== oldStatus) {
      await lead.update({ status: new_status });
    }

    if (next_followup_date) {
      await lead.update({ follow_up_date: new Date(next_followup_date) });
    }

    const interaction = await LeadInteraction.create({
      lead_id: lead.id,
      user_id: req.user.id,
      interaction_type: interaction_type || 'NOTE',
      notes,
      old_status: oldStatus,
      new_status: new_status || oldStatus,
      next_followup_date: next_followup_date ? new Date(next_followup_date) : null,
      interaction_date: new Date()
    });

    await ActivityLog.create({
      user_id: req.user.id,
      entity_type: 'Lead',
      entity_id: lead.id,
      action: 'ADD_INTERACTION',
      description: `Interaction of type ${interaction_type || 'NOTE'} added for lead ${lead.lead_number}`,
      ip_address: req.ip
    });

    return res.status(201).json({ success: true, data: interaction });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to add interaction', errors: [error.message] });
  }
};

const getLeadsStats = async (req, res) => {
  try {
    const where = {};
    if (req.user.role.name === 'COUNSELOR') {
      where.counselor_id = req.user.id;
    }

    const total = await Lead.count({ where });
    const assigned = await Lead.count({ where: { ...where, counselor_id: { [Op.ne]: null } } });
    const unassigned = total - assigned;

    const converted = await Lead.count({ where: { ...where, status: 'CONVERTED' } });
    const interested = await Lead.count({ where: { ...where, status: 'INTERESTED' } });
    const followUp = await Lead.count({ where: { ...where, status: 'FOLLOW_UP' } });
    const cold = await Lead.count({ where: { ...where, status: 'COLD_LEAD' } });
    const notInterested = await Lead.count({ where: { ...where, status: 'NOT_INTERESTED' } });

    return res.status(200).json({
      success: true,
      data: {
        total,
        assigned,
        unassigned,
        ratios: {
          converted,
          interested,
          followUp,
          cold,
          notInterested
        }
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve stats', errors: [error.message] });
  }
};

module.exports = {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  deleteLead,
  updateLeadStatus,
  exportLeads,
  getLeadInteractions,
  createLeadInteraction,
  getLeadsStats
};
