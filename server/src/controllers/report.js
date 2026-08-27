const { Op } = require('sequelize');
const { sequelize, Lead, Case, Payment, CasePackage, User, Role, Document } = require('../models');

const getLeadsReport = async (req, res) => {
  try {
    const { date_from, date_to, status, lead_source, counselor_id } = req.query;
    const where = {};

    if (date_from && date_to) {
      where.created_at = { [Op.between]: [new Date(date_from), new Date(date_to)] };
    }
    if (status) where.status = status;
    if (lead_source) where.lead_source = lead_source;
    if (counselor_id) where.counselor_id = counselor_id;

    const total = await Lead.count({ where });
    const statusCounts = await Lead.findAll({
      where,
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['status']
    });

    const sourceCounts = await Lead.findAll({
      where,
      attributes: ['lead_source', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['lead_source']
    });

    return res.status(200).json({
      success: true,
      data: {
        total,
        statuses: statusCounts,
        sources: sourceCounts
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve leads report', errors: [error.message] });
  }
};

const getCasesReport = async (req, res) => {
  try {
    const { date_from, date_to, status, case_manager_id } = req.query;
    const where = {};

    if (date_from && date_to) {
      where.created_at = { [Op.between]: [new Date(date_from), new Date(date_to)] };
    }
    if (status) where.status = status;
    if (case_manager_id) where.case_manager_id = case_manager_id;

    const total = await Case.count({ where });
    const statusCounts = await Case.findAll({
      where,
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['status']
    });

    return res.status(200).json({
      success: true,
      data: {
        total,
        statuses: statusCounts
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve cases report', errors: [error.message] });
  }
};

const getPaymentsReport = async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    const where = {};

    if (date_from && date_to) {
      where.payment_date = { [Op.between]: [new Date(date_from), new Date(date_to)] };
    }

    const totalCollected = await Payment.sum('amount', { where }) || 0;
    const methodCounts = await Payment.findAll({
      where,
      attributes: ['payment_method', [sequelize.fn('SUM', sequelize.col('amount')), 'total_amount']],
      group: ['payment_method']
    });

    return res.status(200).json({
      success: true,
      data: {
        totalCollected: parseFloat(totalCollected),
        methods: methodCounts.map(m => ({
          method: m.payment_method,
          total: parseFloat(m.getDataValue('total_amount'))
        }))
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve payments report', errors: [error.message] });
  }
};

const getDocumentsReport = async (req, res) => {
  try {
    const total = await Document.count();
    const statusCounts = await Document.findAll({
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['status']
    });

    return res.status(200).json({
      success: true,
      data: {
        total,
        statuses: statusCounts
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve documents report', errors: [error.message] });
  }
};

module.exports = {
  getLeadsReport,
  getCasesReport,
  getPaymentsReport,
  getDocumentsReport
};
