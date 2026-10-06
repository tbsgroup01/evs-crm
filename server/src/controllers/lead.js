const { Op } = require('sequelize');
const { Lead, User, Role, LeadInteraction, ActivityLog, Notification, Case, CasePackage, Package } = require('../models');
const { leadCreateSchema, leadUpdateSchema } = require('../validators/lead');
const { logAudit } = require('../utils/auditLogger');
const { getRealIp } = require('../utils/ipHelper');

const getRoleLabel = (user) => {
  const name = user?.role?.name || user?.role || 'User';
  if (name === 'ADMIN') return 'Admin';
  if (name === 'LEAD_MANAGER' || name === 'MANAGER') return 'Manager';
  if (name === 'CASE_MANAGER') return 'Case Manager';
  if (name === 'COUNSELOR') return 'Counselor';
  return name;
};

const createLead = async (req, res) => {
  try {
    const roleName = req.user.role?.name || (typeof req.user.role === 'string' ? req.user.role : '');
    if (roleName === 'CASE_MANAGER') {
      return res.status(403).json({ success: false, message: 'Access denied: Case Managers are not authorized to create leads.' });
    }

    const validated = leadCreateSchema.parse(req.body);
    if (roleName === 'COUNSELOR') {
      delete validated.profit;
      validated.counselor_id = req.user.id;
    }

    if (validated.payment_date) {
      const pDateStr = new Date(validated.payment_date).toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];
      if (pDateStr > todayStr) {
        return res.status(400).json({ success: false, message: 'Payment date cannot be greater than the current date.' });
      }
    }

    const maxId = (await Lead.max('id', { paranoid: false })) || 0;
    let nextNum = 1000 + maxId + 1;
    let leadNumber = `LEAD-${nextNum}`;

    let exists = await Lead.findOne({ where: { lead_number: leadNumber }, paranoid: false });
    while (exists) {
      nextNum += 1;
      leadNumber = `LEAD-${nextNum}`;
      exists = await Lead.findOne({ where: { lead_number: leadNumber }, paranoid: false });
    }

    const numAdults = validated.adults !== undefined && validated.adults !== null ? parseInt(validated.adults) : 1;
    const numKids = validated.kids !== undefined && validated.kids !== null ? parseInt(validated.kids) : 0;
    const totalPax = numAdults + numKids;

    const pkgAmt = validated.package_amount !== undefined && validated.package_amount !== null ? parseFloat(validated.package_amount) : 0;
    const paidAmt = validated.paid_amount !== undefined && validated.paid_amount !== null ? parseFloat(validated.paid_amount) : 0;
    const pendingAmt = Math.max(0, pkgAmt - paidAmt);

    const lead = await Lead.create({
      ...validated,
      adults: numAdults,
      kids: numKids,
      total_pax: totalPax,
      package_amount: pkgAmt,
      paid_amount: paidAmt,
      pending_amount: pendingAmt,
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
      ip_address: getRealIp(req)
    });

    return res.status(201).json({ success: true, data: lead });
  } catch (error) {
    let message = error.message || 'Validation failed';
    if (error.issues && Array.isArray(error.issues) && error.issues.length > 0) {
      message = error.issues.map((i) => `${i.path.join('.') || 'field'}: ${i.message}`).join(', ');
    } else if (error.errors && Array.isArray(error.errors) && error.errors.length > 0) {
      message = error.errors.map((e) => e.message || e.msg || 'Invalid field').join(', ');
    }
    return res.status(400).json({ success: false, message, errors: error.issues || error.errors || [] });
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
      nationality,
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
    if (nationality) where.nationality = nationality;
    else if (country) where.country = country;

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

    const formattedRows = rows.map(l => {
      const data = l.toJSON();
      if (req.user.role.name === 'COUNSELOR') {
        delete data.profit;
      }
      const pkgAmt = parseFloat(data.package_amount || 0);
      const paidAmt = parseFloat(data.paid_amount || 0);
      const pendAmt = data.pending_amount !== null && data.pending_amount !== undefined ? parseFloat(data.pending_amount) : Math.max(0, pkgAmt - paidAmt);
      return {
        ...data,
        package_amount: pkgAmt,
        paid_amount: paidAmt,
        pending_amount: pendAmt
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        leads: formattedRows,
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

    const data = lead.toJSON();
    if (req.user.role.name === 'COUNSELOR') {
      delete data.profit;
    }
    const pkgAmt = parseFloat(data.package_amount || 0);
    const paidAmt = parseFloat(data.paid_amount || 0);
    const pendAmt = data.pending_amount !== null && data.pending_amount !== undefined ? parseFloat(data.pending_amount) : Math.max(0, pkgAmt - paidAmt);

    return res.status(200).json({
      success: true,
      data: {
        ...data,
        package_amount: pkgAmt,
        paid_amount: paidAmt,
        pending_amount: pendAmt
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch lead details', errors: [error.message] });
  }
};

const formatLeadDiffs = (oldObj, newObj) => {
  if (!oldObj || !newObj) return '';
  const fields = {
    client_name: 'Client Name',
    mobile: 'Mobile Number',
    email: 'Email',
    country: 'Country',
    nationality: 'Nationality',
    city: 'City',
    lead_source: 'Lead Source',
    service_required: 'Service',
    package_amount: 'Package Deal',
    paid_amount: 'Paid Amount',
    pending_amount: 'Pending Balance',
    profit: 'Profit Margin',
    status: 'Status',
    notes: 'Notes',
    adults: 'Adults',
    kids: 'Kids'
  };

  const diffs = [];
  for (const [k, label] of Object.entries(fields)) {
    if (oldObj[k] !== undefined && newObj[k] !== undefined) {
      let o = oldObj[k];
      let n = newObj[k];
      if (String(o || '').trim() !== String(n || '').trim()) {
        let formattedOld = o !== null && o !== undefined && o !== '' ? o : 'None';
        let formattedNew = n !== null && n !== undefined && n !== '' ? n : 'None';
        if (['package_amount', 'paid_amount', 'pending_amount', 'profit'].includes(k)) {
          formattedOld = `AED ${parseFloat(formattedOld || 0).toFixed(2)}`;
          formattedNew = `AED ${parseFloat(formattedNew || 0).toFixed(2)}`;
        }
        diffs.push(`${label}: "${formattedOld}" → "${formattedNew}"`);
      }
    }
  }
  return diffs.join(', ');
};

const updateLead = async (req, res) => {
  try {
    const validated = leadUpdateSchema.parse(req.body);
    if (req.user.role.name === 'COUNSELOR') {
      delete validated.profit;
    }

    if (validated.payment_date) {
      const pDateStr = new Date(validated.payment_date).toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];
      if (pDateStr > todayStr) {
        return res.status(400).json({ success: false, message: 'Payment date cannot be greater than the current date.' });
      }
    }

    const where = { id: req.params.id };
    if (req.user.role.name === 'COUNSELOR') {
      where.counselor_id = req.user.id;
    }

    const lead = await Lead.findOne({ where });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    if (validated.adults !== undefined || validated.kids !== undefined) {
      const numAdults = validated.adults !== undefined ? parseInt(validated.adults) : (lead.adults || 1);
      const numKids = validated.kids !== undefined ? parseInt(validated.kids) : (lead.kids || 0);
      validated.total_pax = numAdults + numKids;
    }

    if (validated.package_amount !== undefined || validated.paid_amount !== undefined) {
      const pkgAmt = validated.package_amount !== undefined ? parseFloat(validated.package_amount || 0) : parseFloat(lead.package_amount || 0);
      const paidAmt = validated.paid_amount !== undefined ? parseFloat(validated.paid_amount || 0) : parseFloat(lead.paid_amount || 0);
      validated.pending_amount = Math.max(0, pkgAmt - paidAmt);

      const associatedCase = await Case.findOne({ where: { lead_id: lead.id } });
      if (associatedCase) {
        const cp = await CasePackage.findOne({
          where: { case_id: associatedCase.id },
          order: [['assigned_at', 'DESC']]
        });
        if (cp) {
          await cp.update({ package_amount: pkgAmt });
        } else {
          let defaultPkg = await Package.findOne();
          if (defaultPkg) {
            await CasePackage.create({
              case_id: associatedCase.id,
              package_id: defaultPkg.id,
              package_amount: pkgAmt
            });
          }
        }
      }
    }

    const oldLeadJson = lead.toJSON ? lead.toJSON() : lead;
    await lead.update(validated);
    const newLeadJson = lead.toJSON ? lead.toJSON() : lead;

    const diffText = formatLeadDiffs(oldLeadJson, newLeadJson);
    const roleLabel = getRoleLabel(req.user);
    const description = diffText
      ? `${roleLabel} ${req.user.name} updated Lead ${lead.lead_number}: ${diffText}`
      : `${roleLabel} ${req.user.name} updated Lead ${lead.lead_number}`;

    await ActivityLog.create({
      user_id: req.user.id,
      entity_type: 'Lead',
      entity_id: lead.id,
      action: 'UPDATE_LEAD',
      old_value: JSON.stringify(oldLeadJson),
      new_value: JSON.stringify(newLeadJson),
      description,
      ip_address: getRealIp(req)
    });

    const data = lead.toJSON();
    if (req.user.role.name === 'COUNSELOR') {
      delete data.profit;
    }

    return res.status(200).json({ success: true, data });
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
      ip_address: getRealIp(req)
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

    const roleLabel = getRoleLabel(req.user);
    const desc = `${roleLabel} ${req.user.name} changed lead status from ${oldStatus} → ${status}`;

    await logAudit({
      req,
      entityType: 'Lead',
      entityId: lead.id,
      leadId: lead.id,
      action: 'STATUS_UPDATE',
      oldValue: oldStatus,
      newValue: status,
      description: desc
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

    let csv = 'Lead Number,Client Name,Mobile,Email,Country,City,Lead Source,Service Required,Package Amount,Paid Amount,Pending Amount,Status\n';
    leads.forEach(l => {
      csv += `"${l.lead_number}","${l.client_name}","${l.mobile}","${l.email || ''}","${l.country || ''}","${l.city || ''}","${l.lead_source || ''}","${l.service_required || ''}",${l.package_amount},${l.paid_amount},${l.pending_amount},"${l.status}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=leads_${Date.now()}.csv`);
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

    const activityLogs = await ActivityLog.findAll({
      where: { entity_type: 'Lead', entity_id: id },
      include: [{ model: User, attributes: ['id', 'name'] }],
      order: [['created_at', 'DESC']]
    });

    const mappedLogs = activityLogs.map(log => {
      let notesText = log.description;
      if (log.old_value && log.new_value) {
        try {
          const oldO = JSON.parse(log.old_value);
          const newO = JSON.parse(log.new_value);
          const diffStr = formatLeadDiffs(oldO, newO);
          if (diffStr && (!notesText || !notesText.includes(':'))) {
            notesText = `${notesText}: ${diffStr}`;
          }
        } catch (e) {}
      }

      return {
        id: `act-${log.id}`,
        interaction_type: log.action || 'SYSTEM',
        notes: notesText,
        interaction_date: log.created_at || log.createdAt,
        createdAt: log.created_at || log.createdAt,
        created_at: log.created_at || log.createdAt,
        User: log.User
      };
    });

    const combined = [
      ...interactions.map(i => (i.toJSON ? i.toJSON() : i)),
      ...mappedLogs
    ].sort((a, b) => new Date(b.interaction_date || b.createdAt) - new Date(a.interaction_date || a.createdAt));

    return res.status(200).json({ success: true, data: combined });
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
      ip_address: getRealIp(req)
    });

    return res.status(201).json({ success: true, data: interaction });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to add interaction', errors: [error.message] });
  }
};

const getLeadsStats = async (req, res) => {
  try {
    const where = {};
    const roleName = req.user?.role?.name || req.user?.role;
    if (roleName === 'COUNSELOR') {
      where.counselor_id = req.user.id;
    }

    const total = await Lead.count({ where });
    const assigned = await Lead.count({ where: { ...where, counselor_id: { [Op.ne]: null } } });
    const unassigned = total - assigned;

    const newLeads = await Lead.count({ where: { ...where, status: 'NEW' } });
    const converted = await Lead.count({ where: { ...where, status: 'CONVERTED' } });
    const interested = await Lead.count({ where: { ...where, status: 'INTERESTED' } });
    const followUp = await Lead.count({ where: { ...where, status: 'FOLLOW_UP' } });
    const cold = await Lead.count({ where: { ...where, status: 'COLD_LEAD' } });
    const notInterested = await Lead.count({ where: { ...where, status: 'NOT_INTERESTED' } });

    return res.status(200).json({
      success: true,
      data: {
        total,
        totalLeads: total,
        newLeads,
        interestedLeads: interested,
        followUpLeads: followUp,
        convertedLeads: converted,
        coldLeads: cold,
        notInterestedLeads: notInterested,
        assigned,
        unassigned,
        ratios: {
          new: newLeads,
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

const bulkDeleteLeads = async (req, res) => {
  try {
    const { lead_ids } = req.body;
    if (!lead_ids || !Array.isArray(lead_ids) || lead_ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Lead IDs array is required' });
    }

    const where = { id: { [Op.in]: lead_ids } };
    if (req.user.role.name === 'COUNSELOR') {
      where.counselor_id = req.user.id;
    }

    const count = await Lead.destroy({ where });

    await ActivityLog.create({
      user_id: req.user.id,
      entity_type: 'Lead',
      action: 'BULK_DELETE_LEADS',
      description: `Bulk deleted ${count} leads by ${req.user.name}`,
      ip_address: getRealIp(req)
    });

    return res.status(200).json({ success: true, message: `Successfully deleted ${count} leads` });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete leads', errors: [error.message] });
  }
};

module.exports = {
  createLead,
  getLeads,
  getLeadById,
  updateLead,
  deleteLead,
  bulkDeleteLeads,
  updateLeadStatus,
  exportLeads,
  getLeadInteractions,
  createLeadInteraction,
  getLeadsStats
};

