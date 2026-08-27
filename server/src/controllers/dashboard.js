const { sequelize, Lead, Case, Payment, CasePackage, User, Role, ActivityLog } = require('../models');

const getSummary = async (req, res) => {
  try {
    const totalLeads = await Lead.count();
    const interestedLeads = await Lead.count({ where: { status: 'INTERESTED' } });
    const followUpLeads = await Lead.count({ where: { status: 'FOLLOW_UP' } });
    const coldLeads = await Lead.count({ where: { status: 'COLD_LEAD' } });

    const activeCases = await Case.count({ where: { status: 'ACTIVE' } });
    const completedCases = await Case.count({ where: { status: 'COMPLETED' } });

    const totalRevenue = await Payment.sum('amount') || 0;
    const totalPackages = await CasePackage.sum('package_amount') || 0;
    const outstandingAmount = totalPackages - totalRevenue;

    return res.status(200).json({
      success: true,
      data: {
        totalLeads,
        interestedLeads,
        followUpLeads,
        coldLeads,
        activeCases,
        completedCases,
        totalRevenue: parseFloat(totalRevenue),
        outstandingAmount: parseFloat(outstandingAmount)
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve dashboard summary', errors: [error.message] });
  }
};

const getLeadStatus = async (req, res) => {
  try {
    const stats = await Lead.findAll({
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['status']
    });
    return res.status(200).json({ success: true, data: stats });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve lead status distribution', errors: [error.message] });
  }
};

const getConversionRate = async (req, res) => {
  try {
    const totalLeads = await Lead.count();
    const convertedLeads = await Lead.count({ where: { status: 'CONVERTED' } });
    const rate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(2) : '0.00';

    return res.status(200).json({
      success: true,
      data: {
        total: totalLeads,
        converted: convertedLeads,
        rate: parseFloat(rate)
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to calculate conversion rates', errors: [error.message] });
  }
};

const getPaymentOverview = async (req, res) => {
  try {
    const totalRevenue = await Payment.sum('amount') || 0;
    const totalPackages = await CasePackage.sum('package_amount') || 0;
    const outstanding = totalPackages - totalRevenue;

    return res.status(200).json({
      success: true,
      data: {
        collected: parseFloat(totalRevenue),
        outstanding: parseFloat(outstanding),
        total: parseFloat(totalPackages)
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve payment stats', errors: [error.message] });
  }
};

const getMonthlyGrowth = async (req, res) => {
  try {
    const growth = await Lead.findAll({
      attributes: [
        [sequelize.fn('date_format', sequelize.col('created_at'), '%Y-%m'), 'month'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['month'],
      order: [['month', 'ASC']]
    });
    return res.status(200).json({ success: true, data: growth });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to calculate monthly growth', errors: [error.message] });
  }
};

const getRecentActivity = async (req, res) => {
  try {
    const leads = await Lead.findAll({ limit: 5, order: [['created_at', 'DESC']] });
    const cases = await Case.findAll({ limit: 5, order: [['created_at', 'DESC']], include: [Lead] });
    const payments = await Payment.findAll({
      limit: 5,
      order: [['payment_date', 'DESC']],
      include: [{ model: Case, attributes: ['case_number'], include: [{ model: Lead, attributes: ['client_name'] }] }]
    });
    const activities = await ActivityLog.findAll({
      limit: 10,
      order: [['created_at', 'DESC']],
      include: [{ model: User, attributes: ['name'] }]
    });

    return res.status(200).json({
      success: true,
      data: {
        recentLeads: leads,
        recentCases: cases,
        recentPayments: payments,
        recentActivities: activities
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch recent activity details', errors: [error.message] });
  }
};

module.exports = {
  getSummary,
  getLeadStatus,
  getConversionRate,
  getPaymentOverview,
  getMonthlyGrowth,
  getRecentActivity
};
