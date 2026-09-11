import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Modal from '../components/common/Modal';
import { useAuth } from '../context/AuthContext';

export const UsersPage = () => {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [kpis, setKpis] = useState({ total: 0, active: 0, inactive: 0, suspended: 0 });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals & Panels
  const [isProvisionOpen, setIsProvisionOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [dossierData, setDossierData] = useState(null);
  const [dossierLoading, setDossierLoading] = useState(false);

  // Form States
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: 'ExpeditionManager',
    designation: 'Polar Operations Specialist',
    baseId: '67cda0000000000000000001',
    status: 'Active',
  });

  const [editForm, setEditForm] = useState({
    name: '',
    role: 'Viewer',
    designation: '',
    baseId: '',
    status: 'Active',
  });

  const [resetPasswordForm, setResetPasswordForm] = useState({
    password: '',
    confirmPassword: '',
  });

  const [purgeOption, setPurgeOption] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const roleOptions = [
    { value: 'SuperAdmin', label: 'SuperAdmin (Expedition & Station Command)', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' },
    { value: 'ExpeditionManager', label: 'Expedition Manager', color: 'bg-sky-500/20 text-sky-300 border-sky-500/40' },
    { value: 'LogisticsCoordinator', label: 'Logistics Coordinator', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
    { value: 'InventoryManager', label: 'Inventory Manager', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
    { value: 'BaseOfficer', label: 'Base Operational Officer', color: 'bg-teal-500/20 text-teal-300 border-teal-500/40' },
    { value: 'MedicalOfficer', label: 'Chief Medical Officer', color: 'bg-pink-500/20 text-pink-300 border-pink-500/40' },
    { value: 'PersonnelManager', label: 'Personnel Manager', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
    { value: 'Viewer', label: 'Viewer (Read-Only Observer)', color: 'bg-slate-500/20 text-slate-300 border-slate-500/40' },
  ];

  const baseOptions = [
    { id: '67cda0000000000000000001', name: 'Maitri Station (Schirmacher Oasis)' },
    { id: '67cda0000000000000000002', name: 'Bharati Station (Larsemann Hills)' },
    { id: '67cda0000000000000000003', name: 'Himadri Station (Svalbard Arctic)' },
  ];

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      if (res.data?.success) {
        setUsers(res.data.data || []);
        if (res.data.kpis) {
          setKpis(res.data.kpis);
        } else {
          const list = res.data.data || [];
          setKpis({
            total: list.length,
            active: list.filter((u) => u.status === 'Active' || (u.isActive && u.status !== 'Inactive' && u.status !== 'Suspended')).length,
            inactive: list.filter((u) => u.status === 'Inactive' || u.isActive === false).length,
            suspended: list.filter((u) => u.status === 'Suspended').length,
          });
        }
      }
    } catch (err) {
      console.error('Failed to load users:', err);
      showToast('Error loading user ledger from polar database.', true);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filtered list
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.designation?.toLowerCase().includes(search.toLowerCase());

    const matchesRole = roleFilter === 'All' || u.role === roleFilter;

    const uStatus = u.status || (u.isActive ? 'Active' : 'Inactive');
    const matchesStatus = statusFilter === 'All' || uStatus === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Provision User
  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const res = await api.post('/users', newUser);
      if (res.data?.success) {
        setIsProvisionOpen(false);
        setNewUser({
          name: '',
          email: '',
          password: '',
          role: 'ExpeditionManager',
          designation: 'Polar Operations Specialist',
          baseId: '67cda0000000000000000001',
          status: 'Active',
        });
        showToast(`User account for ${newUser.name} provisioned successfully.`);
        fetchUsers();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to provision user.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (user) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name || '',
      role: user.role || 'Viewer',
      designation: user.designation || 'Polar Specialist',
      baseId: typeof user.base === 'object' ? user.base?._id : user.baseId || '',
      status: user.status || (user.isActive ? 'Active' : 'Inactive'),
    });
    setFormError('');
    setIsEditOpen(true);
  };

  // Submit Edit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormError('');
    setSubmitting(true);
    try {
      const res = await api.put(`/users/${selectedUser._id}`, editForm);
      if (res.data?.success) {
        setIsEditOpen(false);
        showToast(`User profile for ${editForm.name} updated successfully.`);
        fetchUsers();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || err.message || 'Failed to update user account.');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Toggle Active / Inactive
  const handleToggleStatus = async (user) => {
    if (user._id === currentUser?._id) {
      showToast('Security Policy: You cannot modify your own operational status.', true);
      return;
    }
    const currentStatus = user.status || (user.isActive ? 'Active' : 'Inactive');
    const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    try {
      const res = await api.put(`/users/${user._id}`, { status: newStatus, isActive: newStatus === 'Active' });
      if (res.data?.success) {
        showToast(`${user.name} status switched to ${newStatus}.`);
        fetchUsers();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update status.', true);
    }
  };

  // Open Reset Password
  const handleOpenReset = (user) => {
    setSelectedUser(user);
    setResetPasswordForm({ password: '', confirmPassword: '' });
    setFormError('');
    setIsResetOpen(true);
  };

  // Submit Reset Password
  const handleSaveResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (resetPasswordForm.password !== resetPasswordForm.confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }
    if (resetPasswordForm.password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      const res = await api.post(`/users/${selectedUser._id}/reset-password`, {
        password: resetPasswordForm.password,
      });
      if (res.data?.success) {
        setIsResetOpen(false);
        showToast(`Security credentials reset for ${selectedUser.name}.`);
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to reset passkey.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Dossier Drawer
  const handleOpenDossier = async (user) => {
    setSelectedUser(user);
    setDossierData(null);
    setDossierLoading(true);
    setIsDossierOpen(true);
    try {
      const res = await api.get(`/users/${user._id}`);
      if (res.data?.success) {
        setDossierData(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to load dossier audit history:', err);
    } finally {
      setDossierLoading(false);
    }
  };

  // Open Delete / Decommission Modal
  const handleOpenDelete = (user) => {
    if (user._id === currentUser?._id) {
      showToast('Security Policy: You cannot decommission your own administrator account.', true);
      return;
    }
    setSelectedUser(user);
    setPurgeOption(false);
    setIsDeleteOpen(true);
  };

  // Submit Delete
  const handleConfirmDelete = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      const res = await api.delete(`/users/${selectedUser._id}?purge=${purgeOption}`);
      if (res.data?.success) {
        setIsDeleteOpen(false);
        showToast(res.data.message || `${selectedUser.name} decommissioned successfully.`);
        fetchUsers();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to decommission user.', true);
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadge = (role) => {
    const matched = roleOptions.find((r) => r.value === role);
    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-mono border font-semibold ${matched?.color || 'bg-slate-500/20 text-slate-300 border-slate-500/30'}`}>
        {role}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-20 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl font-mono text-xs shadow-2xl border transition-all ${
            toast.isError
              ? 'bg-rose-950/90 border-rose-500 text-rose-200 shadow-[0_0_25px_rgba(244,63,94,0.3)]'
              : 'bg-[#082338]/95 border-[#39B8FF] text-[#7BD0FF] shadow-[0_0_25px_rgba(57,184,255,0.3)]'
          }`}
        >
          <span className="material-symbols-outlined text-base">
            {toast.isError ? 'error' : 'verified'}
          </span>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[rgba(130,190,225,0.18)]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[rgba(12,39,60,0.96)] border border-[rgba(75,177,235,0.42)] flex items-center justify-center text-[#43B8FF] shadow-[0_0_15px_rgba(40,169,245,0.3)]">
              <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-wide font-mono flex items-center gap-2">
                POLAR COMMAND USER ADMINISTRATION
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  SUPERADMIN CLEARANCE
                </span>
              </h1>
              <p className="text-xs text-[#6E8498] font-mono">
                ROLE-BASED ACCESS CONTROL (RBAC) • CREDENTIAL LIFECYCLE • AUDIT LOG MATRIX
              </p>
            </div>
          </div>
        </div>

        {/* Top Header Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setIsRefreshing(true);
              fetchUsers();
            }}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0e273e] hover:bg-[#143757] text-[#7BD0FF] border border-[rgba(130,190,225,0.25)] text-xs font-mono transition-all cursor-pointer"
            title="Reload operator ledger"
          >
            <span className={`material-symbols-outlined text-sm ${isRefreshing ? 'animate-spin' : ''}`}>
              refresh
            </span>
            <span>Sync</span>
          </button>

          <button
            onClick={() => {
              setFormError('');
              setIsProvisionOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#43B8FF] hover:bg-[#32a8f0] text-[#020914] font-mono font-bold text-xs shadow-[0_0_16px_rgba(40,169,245,0.35)] transition-all active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base font-bold">person_add</span>
            <span>Provision User Account</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-[#081e30] border border-[rgba(130,190,225,0.18)] shadow-sm">
          <div className="flex items-center justify-between text-[#6E8498] text-xs font-mono mb-1">
            <span>TOTAL OPERATORS</span>
            <span className="material-symbols-outlined text-sm text-[#43B8FF]">groups</span>
          </div>
          <div className="text-2xl font-bold font-mono text-white">{kpis.total}</div>
          <div className="text-[11px] text-[#A9BDD0] mt-1 font-mono">Registered Polaris IDs</div>
        </div>

        <div className="p-4 rounded-xl bg-[#081e30] border border-[rgba(130,190,225,0.18)] shadow-sm">
          <div className="flex items-center justify-between text-[#6E8498] text-xs font-mono mb-1">
            <span>ACTIVE CLEARANCES</span>
            <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">{kpis.active}</div>
          <div className="text-[11px] text-[#A9BDD0] mt-1 font-mono">Live operational accounts</div>
        </div>

        <div className="p-4 rounded-xl bg-[#081e30] border border-[rgba(130,190,225,0.18)] shadow-sm">
          <div className="flex items-center justify-between text-[#6E8498] text-xs font-mono mb-1">
            <span>INACTIVE / STANDBY</span>
            <span className="material-symbols-outlined text-sm text-amber-400">pause_circle</span>
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">{kpis.inactive}</div>
          <div className="text-[11px] text-[#A9BDD0] mt-1 font-mono">Dormant or decommissioned</div>
        </div>

        <div className="p-4 rounded-xl bg-[#081e30] border border-[rgba(130,190,225,0.18)] shadow-sm">
          <div className="flex items-center justify-between text-[#6E8498] text-xs font-mono mb-1">
            <span>SUSPENDED</span>
            <span className="material-symbols-outlined text-sm text-rose-400">block</span>
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400">{kpis.suspended}</div>
          <div className="text-[11px] text-[#A9BDD0] mt-1 font-mono">Revoked security access</div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-4 rounded-xl bg-[#081e30] border border-[rgba(130,190,225,0.18)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 font-mono text-xs">
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#6E8498] text-sm">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by operator name, email, or designation..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#051422] border border-[rgba(130,190,225,0.18)] text-white placeholder-[#6E8498] focus:border-[#43B8FF] outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Role Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[#6E8498]">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-[#051422] border border-[rgba(130,190,225,0.18)] text-[#7BD0FF] focus:border-[#43B8FF] outline-none cursor-pointer"
            >
              <option value="All">All Roles ({users.length})</option>
              {roleOptions.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.value}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[#6E8498]">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-[#051422] border border-[rgba(130,190,225,0.18)] text-[#7BD0FF] focus:border-[#43B8FF] outline-none cursor-pointer"
            >
              <option value="All">All Status</option>
              <option value="Active">Active Only</option>
              <option value="Inactive">Inactive Only</option>
              <option value="Suspended">Suspended Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-xl bg-[#081e30] border border-[rgba(130,190,225,0.18)] overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#051422] text-[#6E8498] uppercase tracking-wider border-b border-[rgba(130,190,225,0.18)]">
              <tr>
                <th className="px-5 py-3.5">Operator</th>
                <th className="px-4 py-3.5">Assigned Station</th>
                <th className="px-4 py-3.5">Operational Role</th>
                <th className="px-4 py-3.5">Clearance Status</th>
                <th className="px-4 py-3.5">Last Synchronized</th>
                <th className="px-5 py-3.5 text-right">Security Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(130,190,225,0.1)] text-[#A9BDD0]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#6E8498]">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#43B8FF] animate-ping" />
                      <span>Reading Polar Command User Ledger...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#6E8498]">
                    No polar operators matched the specified query or filter parameters.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const status = u.status || (u.isActive ? 'Active' : 'Inactive');
                  const isCurrent = u._id === currentUser?._id;
                  const baseName =
                    typeof u.base === 'object'
                      ? u.base?.name
                      : baseOptions.find((b) => b.id === u.baseId)?.name || 'Central Command (Maitri)';

                  return (
                    <tr key={u._id} className="hover:bg-[#0c273c]/60 transition-colors">
                      {/* Operator Avatar & Details */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#0A2940] border border-[rgba(75,177,235,0.4)] flex items-center justify-center font-bold text-xs text-[#7BD0FF] shrink-0">
                            {u.name ? u.name.charAt(0) : 'O'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white text-xs">{u.name}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[9px] uppercase">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#6E8498]">{u.email}</div>
                            <div className="text-[10px] text-[#48E5C3]">{u.designation || 'Specialist'}</div>
                          </div>
                        </div>
                      </td>

                      {/* Station Base */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-xs text-[#F4F9FF]">
                          <span className="material-symbols-outlined text-sm text-[#43B8FF]">domain</span>
                          <span className="truncate max-w-[170px]" title={baseName}>{baseName}</span>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3.5">{getRoleBadge(u.role)}</td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            status === 'Active'
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : status === 'Suspended'
                              ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                              : 'bg-slate-500/15 text-slate-300 border-slate-500/30'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              status === 'Active'
                                ? 'bg-emerald-400 animate-pulse'
                                : status === 'Suspended'
                                ? 'bg-rose-400'
                                : 'bg-slate-400'
                            }`}
                          />
                          {status}
                        </span>
                      </td>

                      {/* Last Login */}
                      <td className="px-4 py-3.5 text-[#6E8498] text-[11px]">
                        {u.lastLogin
                          ? new Date(u.lastLogin).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Pending Handshake'}
                      </td>

                      {/* Action Buttons */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Dossier & Audit */}
                          <button
                            onClick={() => handleOpenDossier(u)}
                            className="p-1.5 rounded-lg text-[#6E8498] hover:text-[#43B8FF] hover:bg-[#051422] transition-colors"
                            title="Inspect Operator Dossier & Audit Log"
                          >
                            <span className="material-symbols-outlined text-base">visibility</span>
                          </button>

                          {/* Edit User */}
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 rounded-lg text-[#6E8498] hover:text-[#7BD0FF] hover:bg-[#051422] transition-colors"
                            title="Modify Operator Profile & Role"
                          >
                            <span className="material-symbols-outlined text-base">edit</span>
                          </button>

                          {/* Reset Key */}
                          <button
                            onClick={() => handleOpenReset(u)}
                            className="p-1.5 rounded-lg text-[#6E8498] hover:text-amber-300 hover:bg-[#051422] transition-colors"
                            title="Reset Cryptographic Key / Password"
                          >
                            <span className="material-symbols-outlined text-base">key</span>
                          </button>

                          {/* Quick Toggle Status */}
                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={isCurrent}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isCurrent
                                ? 'opacity-30 cursor-not-allowed text-[#6E8498]'
                                : status === 'Active'
                                ? 'text-emerald-400 hover:text-emerald-300 hover:bg-[#051422]'
                                : 'text-slate-400 hover:text-emerald-400 hover:bg-[#051422]'
                            }`}
                            title={status === 'Active' ? 'Deactivate Operator' : 'Activate Operator'}
                          >
                            <span className="material-symbols-outlined text-base">
                              {status === 'Active' ? 'toggle_on' : 'toggle_off'}
                            </span>
                          </button>

                          {/* Decommission / Delete */}
                          <button
                            onClick={() => handleOpenDelete(u)}
                            disabled={isCurrent}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isCurrent
                                ? 'opacity-30 cursor-not-allowed text-[#6E8498]'
                                : 'text-[#6E8498] hover:text-rose-400 hover:bg-[#051422]'
                            }`}
                            title="Decommission / Purge User Account"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. PROVISION USER MODAL */}
      {/* ========================================================================= */}
      <Modal isOpen={isProvisionOpen} onClose={() => setIsProvisionOpen(false)} title="Provision New Polar Command Operator">
        <form onSubmit={handleCreate} className="space-y-4 font-mono text-xs">
          {formError && (
            <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">warning</span>
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-[#A9BDD0] mb-1">Full Operator Name</label>
            <input
              type="text"
              required
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              placeholder="e.g. Commander Vikramaditya Rao"
              className="w-full px-3 py-2 rounded-lg bg-[#051422] border border-[rgba(130,190,225,0.2)] text-white focus:border-[#43B8FF] outline-none"
            />
          </div>

          <div>
            <label className="block text-[#A9BDD0] mb-1">Official Polaris Email / Mission ID</label>
            <input
              type="email"
              required
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              placeholder="operator@polaris.aq"
              className="w-full px-3 py-2 rounded-lg bg-[#051422] border border-[rgba(130,190,225,0.2)] text-white focus:border-[#43B8FF] outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[#A9BDD0] mb-1">Designation / Role Title</label>
              <input
                type="text"
                required
                value={newUser.designation}
                onChange={(e) => setNewUser({ ...newUser, designation: e.target.value })}
                placeholder="e.g. Senior Glaciologist"
                className="w-full px-3 py-2 rounded-lg bg-[#051422] border border-[rgba(130,190,225,0.2)] text-white focus:border-[#43B8FF] outline-none"
              />
            </div>

            <div>
              <label className="block text-[#A9BDD0] mb-1">Assigned Station Base</label>
              <select
                value={newUser.baseId}
                onChange={(e) => setNewUser({ ...newUser, baseId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#051422] border border-[rgba(130,190,225,0.2)] text-white focus:border-[#43B8FF] outline-none cursor-pointer"
              >
                {baseOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[#A9BDD0] mb-1">Operational Role (RBAC)</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#051422] border border-[rgba(130,190,225,0.2)] text-[#7BD0FF] focus:border-[#43B8FF] outline-none cursor-pointer font-semibold"
              >
                {roleOptions.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[#A9BDD0] mb-1">Initial Status</label>
              <select
                value={newUser.status}
                onChange={(e) => setNewUser({ ...newUser, status: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-[#051422] border border-[rgba(130,190,225,0.2)] text-white focus:border-[#43B8FF] outline-none cursor-pointer"
              >
                <option value="Active">Active (Immediate Clearance)</option>
                <option value="Inactive">Inactive (Dormant)</option>
                <option value="Suspended">Suspended (Held for Review)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[#A9BDD0] mb-1">Initial Security Passkey / Password</label>
            <input
              type="password"
              required
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              placeholder="Minimum 6 characters"
              className="w-full px-3 py-2 rounded-lg bg-[#051422] border border-[rgba(130,190,225,0.2)] text-white focus:border-[#43B8FF] outline-none tracking-widest"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[rgba(130,190,225,0.18)]">
            <button
              type="button"
              onClick={() => setIsProvisionOpen(false)}
              className="px-4 py-2 rounded-lg text-[#6E8498] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-[#43B8FF] hover:bg-[#32a8f0] text-[#020914] font-bold uppercase transition-all shadow-[0_0_12px_rgba(40,169,245,0.3)] disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Provisioning...' : 'Confirm Account Provisioning'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* 2. EDIT USER MODAL */}
      {/* ========================================================================= */}
      <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title={`Modify Operator: ${selectedUser?.name}`}>
        <form onSubmit={handleSaveEdit} className="space-y-4 font-mono text-xs">
          {formError && (
            <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">warning</span>
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-[#A9BDD0] mb-1">Full Operator Name</label>
            <input
              type="text"
              required
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-[#051422] border border-[rgba(130,190,225,0.2)] text-white focus:border-[#43B8FF] outline-none"
            />
          </div>

          <div>
            <label className="block text-[#A9BDD0] mb-1">Designation / Role Title</label>
            <input
              type="text"
              value={editForm.designation}
              onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-[#051422] border border-[rgba(130,190,225,0.2)] text-white focus:border-[#43B8FF] outline-none"
            />
          </div>

          <div>
            <label className="block text-[#A9BDD0] mb-1">Station Base Assignment</label>
            <select
              value={editForm.baseId}
              onChange={(e) => setEditForm({ ...editForm, baseId: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-[#051422] border border-[rgba(130,190,225,0.2)] text-white focus:border-[#43B8FF] outline-none cursor-pointer"
            >
              {baseOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[#A9BDD0] mb-1">Operational Role (RBAC)</label>
            <select
              value={editForm.role}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-[#051422] border border-[rgba(130,190,225,0.2)] text-[#7BD0FF] focus:border-[#43B8FF] outline-none cursor-pointer font-semibold"
            >
              {roleOptions.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[#A9BDD0] mb-1">Account Clearance Status</label>
            <select
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-[#051422] border border-[rgba(130,190,225,0.2)] text-white focus:border-[#43B8FF] outline-none cursor-pointer"
            >
              <option value="Active">Active (Clearance Valid)</option>
              <option value="Inactive">Inactive (Decommissioned)</option>
              <option value="Suspended">Suspended (Security Lockout)</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[rgba(130,190,225,0.18)]">
            <button
              type="button"
              onClick={() => setIsEditOpen(false)}
              className="px-4 py-2 rounded-lg text-[#6E8498] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-[#43B8FF] hover:bg-[#32a8f0] text-[#020914] font-bold uppercase transition-all shadow-[0_0_12px_rgba(40,169,245,0.3)] disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* 3. RESET PASSWORD MODAL */}
      {/* ========================================================================= */}
      <Modal isOpen={isResetOpen} onClose={() => setIsResetOpen(false)} title={`Reset Passkey: ${selectedUser?.name}`}>
        <form onSubmit={handleSaveResetPassword} className="space-y-4 font-mono text-xs">
          {formError && (
            <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">warning</span>
              <span>{formError}</span>
            </div>
          )}

          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
            <span className="font-bold block mb-0.5">SECURITY DIRECTIVE:</span>
            <span>
              Resetting credentials will invalidate active JWT refresh sessions for this account. The operator will be required to authenticate with the new cryptographic passkey on next sign-in.
            </span>
          </div>

          <div>
            <label className="block text-[#A9BDD0] mb-1">New Security Passkey / Password</label>
            <input
              type="password"
              required
              value={resetPasswordForm.password}
              onChange={(e) => setResetPasswordForm({ ...resetPasswordForm, password: e.target.value })}
              placeholder="Minimum 6 characters"
              className="w-full px-3 py-2 rounded-lg bg-[#051422] border border-[rgba(130,190,225,0.2)] text-white focus:border-[#43B8FF] outline-none tracking-widest"
            />
          </div>

          <div>
            <label className="block text-[#A9BDD0] mb-1">Confirm Security Passkey</label>
            <input
              type="password"
              required
              value={resetPasswordForm.confirmPassword}
              onChange={(e) => setResetPasswordForm({ ...resetPasswordForm, confirmPassword: e.target.value })}
              placeholder="Re-enter password"
              className="w-full px-3 py-2 rounded-lg bg-[#051422] border border-[rgba(130,190,225,0.2)] text-white focus:border-[#43B8FF] outline-none tracking-widest"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[rgba(130,190,225,0.18)]">
            <button
              type="button"
              onClick={() => setIsResetOpen(false)}
              className="px-4 py-2 rounded-lg text-[#6E8498] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold uppercase transition-all shadow-[0_0_12px_rgba(251,191,36,0.3)] disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Resetting...' : 'Confirm Reset Passkey'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* 4. USER DOSSIER & AUDIT TRAIL MODAL */}
      {/* ========================================================================= */}
      <Modal isOpen={isDossierOpen} onClose={() => setIsDossierOpen(false)} title="POLARIS Operator Clearance Dossier">
        <div className="space-y-4 font-mono text-xs">
          {dossierLoading ? (
            <div className="py-8 text-center text-[#6E8498]">
              <div className="flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#43B8FF] animate-ping" />
                <span>Decrypting security ledger...</span>
              </div>
            </div>
          ) : selectedUser ? (
            <>
              {/* Header profile card */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-[#051422] border border-[rgba(130,190,225,0.18)]">
                <div className="w-12 h-12 rounded-xl bg-[#0A2940] border border-[rgba(75,177,235,0.4)] flex items-center justify-center font-bold text-base text-[#7BD0FF] shrink-0">
                  {selectedUser.name ? selectedUser.name.charAt(0) : 'O'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white truncate">{selectedUser.name}</h3>
                    {getRoleBadge(selectedUser.role)}
                  </div>
                  <p className="text-[#6E8498] text-[11px] truncate">{selectedUser.email}</p>
                  <p className="text-[#48E5C3] text-[11px] mt-0.5">{selectedUser.designation || 'Specialist'}</p>
                </div>
              </div>

              {/* Clearance Metadata */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-lg bg-[#051422] border border-[rgba(130,190,225,0.1)]">
                  <span className="text-[#6E8498] block text-[10px]">ACCOUNT STATUS</span>
                  <span className="text-emerald-400 font-bold">{selectedUser.status || (selectedUser.isActive ? 'Active' : 'Inactive')}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#051422] border border-[rgba(130,190,225,0.1)]">
                  <span className="text-[#6E8498] block text-[10px]">STATION POSTING</span>
                  <span className="text-white">
                    {typeof selectedUser.base === 'object'
                      ? selectedUser.base?.name
                      : baseOptions.find((b) => b.id === selectedUser.baseId)?.name || 'Maitri Station'}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#051422] border border-[rgba(130,190,225,0.1)]">
                  <span className="text-[#6E8498] block text-[10px]">ENCRYPTION CLEARANCE</span>
                  <span className="text-[#43B8FF]">AES-256-GCM (LEVEL 3)</span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#051422] border border-[rgba(130,190,225,0.1)]">
                  <span className="text-[#6E8498] block text-[10px]">LAST RECORDED LOGIN</span>
                  <span className="text-[#A9BDD0]">
                    {selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleString() : 'Never logged in'}
                  </span>
                </div>
              </div>

              {/* Audit History Timeline */}
              <div>
                <h4 className="text-[11px] font-bold text-[#43B8FF] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">history</span>
                  <span>Security Audit Log & Activity Trail</span>
                </h4>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {dossierData?.auditHistory && dossierData.auditHistory.length > 0 ? (
                    dossierData.auditHistory.map((item, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-[#051422] border border-[rgba(130,190,225,0.1)] text-[11px]">
                        <div className="flex items-center justify-between text-[#6E8498] text-[10px] mb-0.5">
                          <span className="font-bold text-[#7BD0FF]">{item.action}</span>
                          <span>{item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Recorded'}</span>
                        </div>
                        <p className="text-white text-[11px]">{item.description}</p>
                        <span className="text-[10px] text-[#6E8498]">Actor: {item.actorName || 'System'}</span>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-[#6E8498] bg-[#051422] rounded-lg border border-[rgba(130,190,225,0.1)]">
                      <span>Account provisioned with verified credentials. No adverse security incidents recorded.</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-[rgba(130,190,225,0.18)]">
                <button
                  type="button"
                  onClick={() => setIsDossierOpen(false)}
                  className="px-4 py-2 rounded-lg bg-[#0e273e] hover:bg-[#143757] text-[#7BD0FF] transition-colors"
                >
                  Close Dossier
                </button>
              </div>
            </>
          ) : null}
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* 5. DECOMMISSION / PURGE CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Confirm Account Decommissioning">
        <div className="space-y-4 font-mono text-xs">
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-200">
            <span className="font-bold block mb-1">COMMAND SECURITY WARNING:</span>
            <span>
              Are you sure you want to decommission the account for{' '}
              <strong className="text-white underline">{selectedUser?.name}</strong> ({selectedUser?.email})?
            </span>
          </div>

          <div className="space-y-2 p-3 rounded-lg bg-[#051422] border border-[rgba(130,190,225,0.18)]">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={purgeOption}
                onChange={(e) => setPurgeOption(e.target.checked)}
                className="mt-0.5 rounded bg-[#081e30] border-rose-500 text-rose-500"
              />
              <div>
                <span className="font-bold text-rose-300 block">Permanent Purge</span>
                <span className="text-[#6E8498] text-[10px]">
                  Permanently delete this user record instead of standard soft-delete decommissioning.
                </span>
              </div>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-[rgba(130,190,225,0.18)]">
            <button
              type="button"
              onClick={() => setIsDeleteOpen(false)}
              className="px-4 py-2 rounded-lg text-[#6E8498] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold uppercase transition-all shadow-[0_0_15px_rgba(244,63,94,0.4)] disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Processing...' : purgeOption ? 'Confirm Permanent Purge' : 'Decommission Account'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UsersPage;
