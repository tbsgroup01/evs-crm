const { Op } = require('sequelize');
const { Lead, Case, Document, Payment } = require('../models');

const globalSearch = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim() === '') {
      return res.status(200).json({ success: true, data: [] });
    }

    const searchQuery = `%${q.trim()}%`;
    const results = [];

    const leads = await Lead.findAll({
      where: {
        [Op.or]: [
          { client_name: { [Op.like]: searchQuery } },
          { mobile: { [Op.like]: searchQuery } },
          { email: { [Op.like]: searchQuery } },
          { lead_number: { [Op.like]: searchQuery } }
        ]
      },
      limit: 5
    });
    leads.forEach(l => {
      results.push({
        category: 'Lead',
        name: `${l.client_name} (${l.lead_number})`,
        id: l.id,
        status: l.status,
        quickAction: `/leads/${l.id}`
      });
    });

    const cases = await Case.findAll({
      where: { case_number: { [Op.like]: searchQuery } },
      limit: 5
    });
    cases.forEach(c => {
      results.push({
        category: 'Case',
        name: `Case ${c.case_number}`,
        id: c.id,
        status: c.status,
        quickAction: `/cases/${c.id}`
      });
    });

    const docs = await Document.findAll({
      where: { file_name: { [Op.like]: searchQuery } },
      limit: 5
    });
    docs.forEach(d => {
      results.push({
        category: 'Document',
        name: d.file_name,
        id: d.id,
        status: d.status,
        quickAction: `/cases/${d.case_id}`
      });
    });

    const payments = await Payment.findAll({
      where: { transaction_id: { [Op.like]: searchQuery } },
      limit: 5
    });
    payments.forEach(p => {
      results.push({
        category: 'Payment',
        name: `Payment: ${p.amount} (${p.transaction_id || 'No Tx ID'})`,
        id: p.id,
        status: 'PAID',
        quickAction: `/cases/${p.case_id}`
      });
    });

    return res.status(200).json({ success: true, data: results });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Global search failed', errors: [error.message] });
  }
};

module.exports = { globalSearch };
