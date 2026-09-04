const { Package, CasePackage, Case, ActivityLog, Lead } = require('../models');
const { logAudit } = require('../utils/auditLogger');

const getRoleLabel = (user) => {
  const name = user?.role?.name || user?.role || 'User';
  if (name === 'ADMIN') return 'Admin';
  if (name === 'LEAD_MANAGER' || name === 'MANAGER') return 'Manager';
  if (name === 'CASE_MANAGER') return 'Case Manager';
  if (name === 'COUNSELOR') return 'Counselor';
  return name;
};

const getPackages = async (req, res) => {
  try {
    const list = await Package.findAll({ order: [['name', 'ASC']] });
    return res.status(200).json({ success: true, data: list });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve packages', errors: [error.message] });
  }
};

const createPackage = async (req, res) => {
  try {
    const { name, description, amount, status } = req.body;
    if (!name || amount === undefined) {
      return res.status(400).json({ success: false, message: 'Name and amount are required' });
    }

    const pkg = await Package.create({ name, description, amount, status });
    return res.status(201).json({ success: true, data: pkg });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create package', errors: [error.message] });
  }
};

const getPackageById = async (req, res) => {
  try {
    const pkg = await Package.findByPk(req.params.id);
    if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });
    return res.status(200).json({ success: true, data: pkg });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch package', errors: [error.message] });
  }
};

const updatePackage = async (req, res) => {
  try {
    const pkg = await Package.findByPk(req.params.id);
    if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });

    await pkg.update(req.body);
    return res.status(200).json({ success: true, data: pkg });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update package', errors: [error.message] });
  }
};

const deletePackage = async (req, res) => {
  try {
    const pkg = await Package.findByPk(req.params.id);
    if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });

    await pkg.destroy();
    return res.status(200).json({ success: true, message: 'Package soft-deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete package', errors: [error.message] });
  }
};

const updatePackageStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const pkg = await Package.findByPk(req.params.id);
    if (!pkg) return res.status(404).json({ success: false, message: 'Package not found' });

    await pkg.update({ status: !!status });
    return res.status(200).json({ success: true, data: pkg });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update status', errors: [error.message] });
  }
};

const assignCasePackage = async (req, res) => {
  try {
    const { id } = req.params;
    const { package_id, custom_amount } = req.body;

    const singleCase = await Case.findByPk(id, { include: [Lead] });
    if (!singleCase) return res.status(404).json({ success: false, message: 'Case not found' });

    const existingCp = await CasePackage.findOne({
      where: { case_id: singleCase.id },
      order: [['assigned_at', 'DESC']]
    });

    const oldAmount = existingCp ? parseFloat(existingCp.package_amount) : (singleCase.Lead?.package_amount ? parseFloat(singleCase.Lead.package_amount) : 0);

    const pkg = await Package.findByPk(package_id);
    if (!pkg) return res.status(404).json({ success: false, message: 'Package template not found' });

    const newAmount = custom_amount !== undefined && custom_amount !== null && custom_amount !== '' ? parseFloat(custom_amount) : parseFloat(pkg.amount);

    const cp = await CasePackage.create({
      case_id: singleCase.id,
      package_id: pkg.id,
      package_amount: newAmount,
      assigned_at: new Date()
    });

    if (singleCase.Lead) {
      const paid = parseFloat(singleCase.Lead.paid_amount || 0);
      await singleCase.Lead.update({
        package_amount: newAmount,
        pending_amount: Math.max(0, newAmount - paid)
      });
    }

    const roleLabel = getRoleLabel(req.user);
    const oldFormatted = `AED ${oldAmount.toLocaleString()}`;
    const newFormatted = `AED ${newAmount.toLocaleString()}`;
    const desc = `${roleLabel} ${req.user.name} changed the Total Package from ${oldFormatted} → ${newFormatted} (${pkg.name})`;

    await logAudit({
      req,
      entityType: 'Case',
      entityId: singleCase.id,
      leadId: singleCase.lead_id,
      action: 'PACKAGE_ASSIGNED',
      oldValue: oldFormatted,
      newValue: newFormatted,
      description: desc
    });

    return res.status(201).json({ success: true, data: cp });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to assign package to case', errors: [error.message] });
  }
};

const getCasePackage = async (req, res) => {
  try {
    const cp = await CasePackage.findOne({
      where: { case_id: req.params.id },
      include: [{ model: Package }],
      order: [['assigned_at', 'DESC']]
    });
    if (!cp) return res.status(404).json({ success: false, message: 'No package assigned to this case' });
    return res.status(200).json({ success: true, data: cp });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch case package details', errors: [error.message] });
  }
};

module.exports = {
  getPackages,
  createPackage,
  getPackageById,
  updatePackage,
  deletePackage,
  updatePackageStatus,
  assignCasePackage,
  getCasePackage
};
