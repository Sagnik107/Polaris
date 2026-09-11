const mongoose = require('mongoose');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');
const { mockUsers, mockBases } = require('../services/mockDataService');
const { getPaginationMeta } = require('../utils/pagination');

// Helper to compute user KPIs
const computeUserKPIs = (usersList) => {
  const total = usersList.length;
  let active = 0;
  let inactive = 0;
  let suspended = 0;

  usersList.forEach((u) => {
    const status = u.status || (u.isActive ? 'Active' : 'Inactive');
    if (status === 'Suspended') suspended++;
    else if (status === 'Inactive' || u.isActive === false) inactive++;
    else active++;
  });

  return { total, active, inactive, suspended };
};

// GET /api/users
const getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, search = '', role = '', status = '', baseId = '' } = req.query;

    // Offline / Mock Data Fallback
    if (mongoose.connection.readyState !== 1) {
      let filtered = [...mockUsers];

      if (search) {
        const s = search.toLowerCase();
        filtered = filtered.filter(
          (u) =>
            u.name?.toLowerCase().includes(s) ||
            u.email?.toLowerCase().includes(s) ||
            u.designation?.toLowerCase().includes(s)
        );
      }
      if (role) {
        filtered = filtered.filter((u) => u.role === role);
      }
      if (status) {
        filtered = filtered.filter((u) => {
          const userStatus = u.status || (u.isActive ? 'Active' : 'Inactive');
          return userStatus === status;
        });
      }
      if (baseId) {
        filtered = filtered.filter((u) => u.baseId?.toString() === baseId.toString());
      }

      // Attach base object if available
      const enriched = filtered.map((u) => {
        const matchedBase = mockBases.find((b) => b._id.toString() === u.baseId?.toString());
        return {
          ...u,
          status: u.status || (u.isActive ? 'Active' : 'Inactive'),
          base: matchedBase ? { _id: matchedBase._id, name: matchedBase.name, code: matchedBase.code } : null,
        };
      });

      const total = enriched.length;
      const kpis = computeUserKPIs(mockUsers);
      const paginated = enriched.slice((page - 1) * limit, page * limit);

      return res.json({
        success: true,
        data: paginated,
        kpis,
        pagination: getPaginationMeta(total, page, limit),
      });
    }

    // Live MongoDB Query
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } },
      ];
    }
    if (role) query.role = role;
    if (status) {
      query.status = status;
    }
    if (baseId) query.baseId = baseId;

    const [users, allUsersForKpi, total] = await Promise.all([
      User.find(query)
        .populate('baseId', 'name code')
        .sort('-createdAt')
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      User.find({}, 'status isActive'),
      User.countDocuments(query),
    ]);

    const formattedUsers = users.map((u) => {
      const obj = u.toJSON();
      obj.base = u.baseId;
      return obj;
    });

    const kpis = computeUserKPIs(allUsersForKpi);

    res.json({
      success: true,
      data: formattedUsers,
      kpis,
      pagination: getPaginationMeta(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/users/:id
const getUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Offline / Mock Data Fallback
    if (mongoose.connection.readyState !== 1) {
      const mockUser = mockUsers.find((u) => u._id.toString() === id.toString());
      if (!mockUser) return res.status(404).json({ success: false, message: 'User not found.' });

      const matchedBase = mockBases.find((b) => b._id.toString() === mockUser.baseId?.toString());
      return res.json({
        success: true,
        data: {
          ...mockUser,
          status: mockUser.status || (mockUser.isActive ? 'Active' : 'Inactive'),
          base: matchedBase ? { _id: matchedBase._id, name: matchedBase.name, code: matchedBase.code } : null,
          auditHistory: [
            {
              action: 'USER_CREATED',
              description: `User account provisioned with role ${mockUser.role}`,
              actorName: 'Polar Command Admin',
              createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
            },
          ],
        },
      });
    }

    const user = await User.findById(id).populate('baseId', 'name code');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    // Fetch related audit trail
    const auditHistory = await ActivityLog.find({
      $or: [
        { entityType: 'User', entityId: user._id },
        { actor: user._id },
      ],
    })
      .sort('-createdAt')
      .limit(15);

    const userObj = user.toJSON();
    userObj.base = user.baseId;
    userObj.auditHistory = auditHistory;

    res.json({ success: true, data: userObj });
  } catch (error) {
    next(error);
  }
};

// POST /api/users (Admin user creation)
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role = 'Viewer', designation, baseId, status = 'Active' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    // Privilege escalation protection
    if (role === 'SuperAdmin' && req.user?.role !== 'SuperAdmin') {
      return res.status(403).json({ success: false, message: 'Only SuperAdmin can assign SuperAdmin role.' });
    }

    const isActive = status === 'Active';

    // Mock Mode
    if (mongoose.connection.readyState !== 1) {
      const existing = mockUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        return res.status(409).json({ success: false, message: 'Email already registered.' });
      }

      const newUser = {
        _id: '67cda100000' + (mockUsers.length + 1).toString().padStart(13, '0'),
        name,
        email,
        role,
        designation: designation || 'Polar Operations Specialist',
        baseId: baseId || null,
        status,
        isActive,
        lastLogin: null,
        createdAt: new Date(),
      };

      mockUsers.unshift(newUser);

      return res.status(201).json({
        success: true,
        message: 'User provisioned successfully.',
        data: newUser,
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const user = new User({
      name,
      email,
      passwordHash: password,
      role,
      designation: designation || 'Polar Operations Specialist',
      baseId: baseId || null,
      status,
      isActive,
    });

    await user.save();

    await ActivityLog.create({
      actor: req.user?._id || user._id,
      actorName: req.user?.name || 'SuperAdmin',
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: user._id,
      description: `Provisioned operator account ${name} (${role}) at ${status} status`,
      metadata: { role, status, baseId, designation },
    });

    res.status(201).json({
      success: true,
      message: 'User provisioned successfully.',
      data: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/users/:id
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, role, status, isActive, baseId, designation, password } = req.body;

    const currentUserId = req.user?._id?.toString();
    const isSelf = currentUserId === id.toString();

    // Prevent self-deactivation / self-suspension
    if (isSelf) {
      if (status === 'Inactive' || status === 'Suspended' || isActive === false) {
        return res.status(400).json({
          success: false,
          message: 'Security Policy: You cannot deactivate or suspend your own active administrator account.',
        });
      }
      if (role && role !== 'SuperAdmin' && req.user?.role === 'SuperAdmin') {
        return res.status(400).json({
          success: false,
          message: 'Security Policy: You cannot demote your own SuperAdmin privileges.',
        });
      }
    }

    // Privilege escalation protection: Non-SuperAdmins cannot grant SuperAdmin role
    if (role === 'SuperAdmin' && req.user?.role !== 'SuperAdmin') {
      return res.status(403).json({
        success: false,
        message: 'Security Policy: Only a SuperAdmin can elevate an account to SuperAdmin role.',
      });
    }

    // Mock Mode
    if (mongoose.connection.readyState !== 1) {
      const userIndex = mockUsers.findIndex((u) => u._id.toString() === id.toString());
      if (userIndex === -1) return res.status(404).json({ success: false, message: 'User not found.' });

      const user = mockUsers[userIndex];
      const previousRole = user.role;
      const previousStatus = user.status || (user.isActive ? 'Active' : 'Inactive');

      if (name !== undefined) user.name = name;
      if (role !== undefined) user.role = role;
      if (designation !== undefined) user.designation = designation;
      if (baseId !== undefined) user.baseId = baseId;
      if (status !== undefined) {
        user.status = status;
        user.isActive = status === 'Active';
      } else if (isActive !== undefined) {
        user.isActive = isActive;
        user.status = isActive ? 'Active' : 'Inactive';
      }

      return res.json({
        success: true,
        message: 'User updated successfully.',
        data: user,
      });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const previousRole = user.role;
    const previousStatus = user.status || (user.isActive ? 'Active' : 'Inactive');

    if (name !== undefined) user.name = name;
    if (role !== undefined) user.role = role;
    if (designation !== undefined) user.designation = designation;
    if (baseId !== undefined) user.baseId = baseId;
    if (password) user.passwordHash = password;

    if (status !== undefined) {
      user.status = status;
      user.isActive = status === 'Active';
    } else if (isActive !== undefined) {
      user.isActive = isActive;
      user.status = isActive ? 'Active' : 'Inactive';
    }

    await user.save();

    // Audit Role Change
    if (role && role !== previousRole) {
      await ActivityLog.create({
        actor: req.user?._id || user._id,
        actorName: req.user?.name || 'Administrator',
        action: 'USER_ROLE_CHANGED',
        entityType: 'User',
        entityId: user._id,
        description: `Modified role for ${user.name} from ${previousRole} to ${role}`,
        metadata: { previousRole, newRole: role },
      });
    }

    // Audit Status Change
    if (user.status !== previousStatus) {
      await ActivityLog.create({
        actor: req.user?._id || user._id,
        actorName: req.user?.name || 'Administrator',
        action: 'USER_STATUS_CHANGED',
        entityType: 'User',
        entityId: user._id,
        description: `Updated status for ${user.name} from ${previousStatus} to ${user.status}`,
        metadata: { previousStatus, newStatus: user.status },
      });
    }

    // General Audit
    await ActivityLog.create({
      actor: req.user?._id || user._id,
      actorName: req.user?.name || 'Administrator',
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: user._id,
      description: `Updated profile attributes for ${user.name}`,
      metadata: { name, role, status: user.status, baseId },
    });

    res.json({ success: true, message: 'User updated successfully.', data: user.toJSON() });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/users/:id (Soft-delete / Decommission User)
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?._id?.toString();

    // Prevent self-delete
    if (currentUserId === id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Security Policy: You cannot delete or decommission your own administrator account.',
      });
    }

    // Mock Mode
    if (mongoose.connection.readyState !== 1) {
      const userIndex = mockUsers.findIndex((u) => u._id.toString() === id.toString());
      if (userIndex === -1) return res.status(404).json({ success: false, message: 'User not found.' });

      // Soft-delete in mock
      mockUsers[userIndex].status = 'Inactive';
      mockUsers[userIndex].isActive = false;

      return res.json({
        success: true,
        message: `Account for ${mockUsers[userIndex].name} decommissioned successfully (status: Inactive).`,
      });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    user.status = 'Inactive';
    user.isActive = false;
    await user.save();

    await ActivityLog.create({
      actor: req.user?._id || user._id,
      actorName: req.user?.name || 'Administrator',
      action: 'USER_DECOMMISSIONED',
      entityType: 'User',
      entityId: user._id,
      description: `Decommissioned user account ${user.name} (${user.email}) - Soft deleted to Inactive state`,
    });

    res.json({
      success: true,
      message: `Account for ${user.name} decommissioned successfully (status: Inactive).`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getUsers, getUser, createUser, updateUser, deleteUser };
