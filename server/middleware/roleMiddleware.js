const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action.',
      });
    }
    next();
  };
};

// Permission-based middleware for granular access control
const PERMISSIONS = {
  SuperAdmin: ['*'],
  ExpeditionManager: [
    'expeditions:crud', 'tasks:crud', 'personnel:read', 'personnel:assign',
    'cargo:read', 'inventory:read', 'bases:read', 'incidents:read',
    'alerts:read', 'analytics:full', 'reports:full',
  ],
  LogisticsCoordinator: [
    'cargo:crud', 'expeditions:read', 'inventory:read', 'bases:read',
    'tasks:update', 'alerts:read', 'analytics:cargo', 'reports:cargo',
  ],
  InventoryManager: [
    'inventory:crud', 'assets:crud', 'cargo:read', 'expeditions:read',
    'bases:read', 'tasks:update', 'alerts:read', 'analytics:inventory', 'reports:inventory',
  ],
  BaseOfficer: [
    'bases:update', 'personnel:update', 'inventory:read', 'inventory:update',
    'cargo:read', 'expeditions:read', 'incidents:create', 'incidents:update',
    'tasks:create', 'tasks:update', 'alerts:read', 'analytics:base', 'reports:base',
  ],
  MedicalOfficer: [
    'incidents:crud', 'personnel:read', 'inventory:read',
    'bases:read', 'expeditions:read', 'tasks:update',
    'alerts:read', 'analytics:incidents', 'reports:incidents',
  ],
  PersonnelManager: [
    'personnel:crud', 'expeditions:read', 'bases:read',
    'tasks:update', 'alerts:read', 'analytics:personnel', 'reports:personnel',
  ],
  Viewer: [
    'expeditions:read', 'cargo:read', 'inventory:read', 'assets:read',
    'personnel:read', 'bases:read', 'tasks:read', 'incidents:read',
    'alerts:read', 'analytics:full', 'reports:full',
  ],
};

const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    const userPerms = PERMISSIONS[req.user.role] || [];
    if (userPerms.includes('*') || userPerms.includes(permission)) {
      return next();
    }
    // Check wildcard module permission (e.g., 'cargo:crud' covers 'cargo:read')
    const [module, action] = permission.split(':');
    const hasCrud = userPerms.includes(`${module}:crud`);
    if (hasCrud) return next();
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to perform this action.',
    });
  };
};

module.exports = { requireRole, requirePermission, PERMISSIONS };
