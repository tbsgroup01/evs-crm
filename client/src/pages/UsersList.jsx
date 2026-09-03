import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Download, Filter, Upload, Plus, Eye, MoreVertical, X, Users, Folder, TrendingUp, Calendar, CheckSquare, Camera, Phone, Edit, PhoneCall } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';

export const UsersList = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);

  // Create User Modal State
  const [open, setOpen] = useState(false);
  // Edit User Modal State
  const [editOpen, setEditOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile1, setMobile1] = useState('');
  const [mobile2, setMobile2] = useState('');
  const [extension, setExtension] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('');
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState('');

  // Password Reset Modal State
  const [pwOpen, setPwOpen] = useState(false);
  const [pwUserId, setPwUserId] = useState(null);
  const [newPw, setNewPw] = useState('');

  // Filters State
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Selected User Detail Sidebar
  const [selectedUser, setSelectedUser] = useState(null);
  const [sidebarTab, setSidebarTab] = useState('overview');

  const getImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('blob:') || path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    const baseUrl = import.meta.env.VITE_API_URL || 'https://evs-crm.towsindia.com';
    return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  useEffect(() => {
    fetchUsers();
    setRoles([
      { id: 1, name: 'ADMIN' },
      { id: 2, name: 'LEAD_MANAGER' },
      { id: 3, name: 'COUNSELOR' },
      { id: 4, name: 'CASE_MANAGER' }
    ]);
  }, []);

  const fetchUsers = () => {
    axios.get('/api/v1/users').then(res => {
      const data = res.data.data || [];
      setUsers(data);
      if (data.length > 0) {
        setSelectedUser(prev => {
          if (!prev) return data[0];
          const updated = data.find(u => u.id === prev.id);
          return updated || data[0];
        });
      }
    });
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setMobile1('');
    setMobile2('');
    setExtension('');
    setPassword('');
    setRoleId('');
    setProfileImageFile(null);
    setProfileImagePreview('');
    setEditingUserId(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImageFile(file);
      setProfileImagePreview(URL.createObjectURL(file));
    }
  };

  const handleCreate = () => {
    if (!name || !email || !password || !roleId) {
      alert('Please fill in required fields (Name, Email, Password, Role)');
      return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('mobile_1', mobile1);
    formData.append('mobile_2', mobile2);
    formData.append('extension', extension);
    formData.append('password', password);
    formData.append('role_id', roleId);
    if (profileImageFile) {
      formData.append('profile_image', profileImageFile);
    }

    axios.post('/api/v1/users', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(() => {
      resetForm();
      setOpen(false);
      fetchUsers();
    }).catch(err => {
      alert(err.response?.data?.message || 'Failed to create user');
    });
  };

  const handleEditOpen = (user) => {
    setEditingUserId(user.id);
    setName(user.name || '');
    setEmail(user.email || '');
    setMobile1(user.mobile_1 || user.phone || '');
    setMobile2(user.mobile_2 || '');
    setExtension(user.extension || '');
    const foundRole = roles.find(r => r.name === user.role);
    setRoleId(foundRole ? foundRole.id : (user.role_id || ''));
    setProfileImagePreview(user.profile_image ? getImageUrl(user.profile_image) : '');
    setProfileImageFile(null);
    setEditOpen(true);
  };

  const handleUpdate = () => {
    if (!name || !email) {
      alert('Name and Email are required');
      return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('mobile_1', mobile1);
    formData.append('mobile_2', mobile2);
    formData.append('extension', extension);
    if (roleId) formData.append('role_id', roleId);
    if (profileImageFile) {
      formData.append('profile_image', profileImageFile);
    }

    axios.put(`/api/v1/users/${editingUserId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(() => {
      resetForm();
      setEditOpen(false);
      fetchUsers();
    }).catch(err => {
      alert(err.response?.data?.message || 'Failed to update user');
    });
  };

  const toggleStatus = (id, curStatus) => {
    const nextStatus = curStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    axios.patch(`/api/v1/users/${id}/status`, { status: nextStatus }).then(() => fetchUsers());
  };

  const handleResetPw = () => {
    axios.post(`/api/v1/users/${pwUserId}/reset-password`, { password: newPw }).then(() => {
      setNewPw('');
      setPwUserId(null);
      setPwOpen(false);
      alert('Password reset completed successfully');
    });
  };

  const handleResetFilters = () => {
    setSearch('');
    setRoleFilter('');
    setStatusFilter('');
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.mobile_1?.includes(search) ||
      u.mobile_2?.includes(search) ||
      u.extension?.includes(search);
    const matchesRole = roleFilter ? u.role === roleFilter : true;
    const matchesStatus = statusFilter ? u.status === statusFilter : true;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalUsersCount = filteredUsers.length;
  const verifiedUsersCount = filteredUsers.filter(u => u.status === 'ACTIVE').length;
  const totalLeadsCount = filteredUsers.reduce((sum, u) => sum + (u.assignedLeadsCount || 0), 0);
  const totalCasesCount = filteredUsers.reduce((sum, u) => sum + (u.assignedCasesCount || 0), 0);
  const activeThisMonth = verifiedUsersCount;

  const getUserColor = (nameStr) => {
    const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-indigo-500'];
    return colors[(nameStr || 'A').charCodeAt(0) % colors.length];
  };

  const sortHeader = (label) => (
    <div className="flex items-center gap-1 cursor-pointer select-none">
      <span>{label}</span>
      <span className="text-gray-400 text-xs">↕</span>
    </div>
  );

  return (
    <div className="flex flex-col xl:flex-row gap-6 items-start">
      <div className="flex-1 w-full space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Users Directory</h1>
            <p className="text-sm text-gray-500 mt-1">Home &gt; Users Manager &gt; Staff Directory</p>
          </div>
          <button
            onClick={() => { resetForm(); setOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-sm font-semibold text-white hover:bg-blue-700 transition-colors ml-auto md:ml-0 shadow-sm"
          >
            <Plus className="h-4 w-4" /> Add Staff Member
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm flex items-start justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Users</span>
              <span className="text-xl font-bold text-slate-800 mt-1 block">{totalUsersCount}</span>
              <span className="text-[10px] text-slate-400 font-semibold mt-1 block">All staff members</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
              <Users className="h-4 w-4" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm flex items-start justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Verified Users</span>
              <span className="text-xl font-bold text-slate-800 mt-1 block">{verifiedUsersCount}</span>
              <span className="text-[10px] text-slate-400 font-semibold mt-1 block">Active staff accounts</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
              <Users className="h-4 w-4" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm flex items-start justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Leads Assigned</span>
              <span className="text-xl font-bold text-slate-800 mt-1 block">{totalLeadsCount}</span>
              <span className="text-[10px] text-slate-400 font-semibold mt-1 block">Total leads assigned</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 flex-shrink-0">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm flex items-start justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Cases Managed</span>
              <span className="text-xl font-bold text-slate-800 mt-1 block">{totalCasesCount}</span>
              <span className="text-[10px] text-slate-400 font-semibold mt-1 block">Total cases managed</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0">
              <Folder className="h-4 w-4" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm flex items-start justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Active This Month</span>
              <span className="text-xl font-bold text-slate-800 mt-1 block">{activeThisMonth}</span>
              <span className="text-[10px] text-slate-400 font-semibold mt-1 block">Active team members</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 flex-shrink-0">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, phone or extension..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-slate-500 bg-slate-50 border border-gray-100"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full md:w-48 px-3 py-2.5 rounded-xl text-sm bg-slate-50 border border-gray-100 text-gray-700 focus:outline-none"
            >
              <option value="">Filter by Role</option>
              <option value="ADMIN">ADMIN</option>
              <option value="LEAD_MANAGER">LEAD MANAGER</option>
              <option value="COUNSELOR">COUNSELOR</option>
              <option value="CASE_MANAGER">CASE MANAGER</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full md:w-48 px-3 py-2.5 rounded-xl text-sm bg-slate-50 border border-gray-100 text-gray-700 focus:outline-none"
            >
              <option value="">Filter by Status</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
            <button className="p-2.5 rounded-xl bg-slate-50 text-gray-400 hover:text-slate-900 transition-colors border border-gray-100">
              <Filter className="h-5 w-5" />
            </button>
            <button onClick={handleResetFilters} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-50 hover:bg-gray-100 transition-colors border border-gray-100">
              Reset
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm">
          <DataTable
            headers={[
              sortHeader('STAFF MEMBER'),
              sortHeader('CONTACT INFO'),
              sortHeader('ROLE'),
              sortHeader('LEADS'),
              sortHeader('CASES'),
              sortHeader('STATUS'),
              'ACTIONS'
            ]}
            rows={filteredUsers.map(u => [
              <div className="flex items-center gap-3">
                {u.profile_image ? (
                  <img
                    src={getImageUrl(u.profile_image)}
                    alt={u.name}
                    className="h-10 w-10 rounded-full object-cover border border-gray-200 flex-shrink-0"
                  />
                ) : (
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${getUserColor(u.name)}`}>
                    {u.name.charAt(0)}
                  </div>
                )}
                <div>
                  <div className="font-semibold text-slate-800 text-sm">{u.name}</div>
                  <div className="text-xs text-gray-500">{u.email}</div>
                </div>
              </div>,
              <div className="text-xs space-y-0.5">
                <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                  <Phone className="h-3 w-3 text-blue-500" />
                  <span>{u.mobile_1 || u.phone || 'N/A'}</span>
                </div>
                {u.mobile_2 && (
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Phone className="h-3 w-3 text-gray-400" />
                    <span>{u.mobile_2}</span>
                  </div>
                )}
                {u.extension && (
                  <div className="flex items-center gap-1.5 text-indigo-600 font-semibold">
                    <PhoneCall className="h-3 w-3" />
                    <span>Ext: {u.extension}</span>
                  </div>
                )}
              </div>,
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${u.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                u.role === 'LEAD_MANAGER' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                  u.role === 'COUNSELOR' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                    'bg-emerald-50 text-emerald-700 border border-emerald-100'
                }`}>
                {u.role}
              </span>,
              <div>
                <div className="font-bold text-slate-800 text-sm">{u.assignedLeadsCount || 0}</div>
                <div className="text-xs text-emerald-600 font-semibold flex items-center gap-0.5">
                  <span className="text-[10px]">▲</span> {u.assignedLeadsCount > 0 ? '100%' : '0%'}
                </div>
              </div>,
              <div>
                <div className="font-bold text-slate-800 text-sm">{u.assignedCasesCount || 0}</div>
                <div className="text-xs text-emerald-600 font-semibold flex items-center gap-0.5">
                  <span className="text-[10px]">▲</span> {u.assignedCasesCount > 0 ? '100%' : '0%'}
                </div>
              </div>,
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${u.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${u.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                {u.status === 'ACTIVE' ? 'VERIFIED' : 'DISABLED'}
              </span>,
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => { setSelectedUser(u); setSidebarTab('overview'); }}
                  title="View Staff Profile"
                  className="p-1.5 rounded-lg bg-slate-50 text-gray-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleEditOpen(u)}
                  title="Edit Staff Member"
                  className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                </button>
                <div className="relative group">
                  <button className="p-1.5 rounded-lg bg-slate-50 text-gray-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-1 hidden group-hover:flex flex-col whitespace-normal z-20">
                    <button onClick={() => handleEditOpen(u)} className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-gray-50 flex items-center gap-2">
                      <Edit className="h-3.5 w-3.5" /> Edit Profile
                    </button>
                    <button onClick={() => toggleStatus(u.id, u.status)} className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-gray-50">
                      {u.status === 'ACTIVE' ? 'Disable Account' : 'Enable Account'}
                    </button>
                    <button onClick={() => { setPwUserId(u.id); setPwOpen(true); }} className="w-full text-left px-3 py-1.5 text-xs text-blue-600 hover:bg-gray-50">
                      Reset Password
                    </button>
                  </div>
                </div>
              </div>
            ])}
          />
        </div>
      </div>

      {selectedUser && (
        <div className="w-full xl:w-96 bg-white rounded-xl p-6 shadow-sm flex-shrink-0 sticky top-6 border border-gray-100">
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-gray-100">
            <h3 className="font-bold text-slate-800 text-lg">Staff Profile</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleEditOpen(selectedUser)}
                className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                title="Edit Staff Member"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center text-center pb-5 mb-5 border-b border-gray-100">
            {selectedUser.profile_image ? (
              <img
                src={getImageUrl(selectedUser.profile_image)}
                alt={selectedUser.name}
                className="h-20 w-20 rounded-full object-cover border-2 border-blue-500/20 shadow-md mb-3"
              />
            ) : (
              <div className={`h-20 w-20 rounded-full flex items-center justify-center text-white text-3xl font-bold mb-3 shadow-md ${getUserColor(selectedUser.name)}`}>
                {selectedUser.name.charAt(0)}
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <h4 className="font-bold text-slate-800 text-lg">{selectedUser.name}</h4>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-0.5 border border-emerald-100">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> {selectedUser.status === 'ACTIVE' ? 'Verified' : 'Disabled'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{selectedUser.email}</p>
            <span className={`mt-3 px-3 py-1 rounded-lg text-xs font-bold ${selectedUser.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
              selectedUser.role === 'LEAD_MANAGER' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                selectedUser.role === 'COUNSELOR' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                  'bg-emerald-50 text-emerald-700 border border-emerald-100'
              }`}>
              {selectedUser.role}
            </span>
          </div>

          <div className="flex mb-5 border-b border-gray-100">
            {['overview', 'activity', 'details', 'security'].map(t => (
              <button
                key={t}
                onClick={() => setSidebarTab(t)}
                className={`flex-1 pb-2.5 text-xs font-semibold capitalize text-center transition-all ${sidebarTab === t ? 'border-b-2 border-blue-600 text-blue-600 font-bold' : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
              >
                {t}
              </button>
            ))}
          </div>

          {sidebarTab === 'overview' && (
            <div className="space-y-4">
              <h5 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Performance Summary</h5>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-xl font-bold text-slate-800 block">{selectedUser.assignedLeadsCount || 0}</span>
                    <span className="text-[10px] text-gray-500 block">Leads Assigned</span>
                  </div>
                  <div className="h-7 w-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                    <Users className="h-4 w-4" />
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-xl font-bold text-slate-800 block">{selectedUser.assignedCasesCount || 0}</span>
                    <span className="text-[10px] text-gray-500 block">Cases Managed</span>
                  </div>
                  <div className="h-7 w-7 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                    <Folder className="h-4 w-4" />
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-xl font-bold text-slate-800 block">{selectedUser.assignedLeadsCount > 0 ? '12%' : '0%'}</span>
                    <span className="text-[10px] text-gray-500 block">Lead Conversion</span>
                  </div>
                  <div className="h-7 w-7 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>
                <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-xl font-bold text-slate-800 block">0</span>
                    <span className="text-[10px] text-gray-500 block">Pending Tasks</span>
                  </div>
                  <div className="h-7 w-7 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <h5 className="font-bold text-slate-700 text-xs uppercase tracking-wider pt-2">Contact Quick Reference</h5>
              <div className="bg-slate-50 rounded-xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Mobile 1:</span>
                  <span className="font-semibold text-slate-800">{selectedUser.mobile_1 || selectedUser.phone || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Mobile 2:</span>
                  <span className="font-semibold text-slate-800">{selectedUser.mobile_2 || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Extension:</span>
                  <span className="font-semibold text-indigo-600">{selectedUser.extension || 'N/A'}</span>
                </div>
              </div>
            </div>
          )}

          {sidebarTab === 'activity' && (
            <div className="space-y-3 text-xs text-gray-500">
              <p>• Staff member record created on system</p>
              <p>• Role authorization updated</p>
              <p>• Active session verified</p>
            </div>
          )}

          {sidebarTab === 'details' && (
            <div className="space-y-3 text-xs text-slate-700">
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-400">Mobile 1:</span>
                <span className="font-semibold text-slate-900">{selectedUser.mobile_1 || selectedUser.phone || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-400">Mobile 2:</span>
                <span className="font-semibold text-slate-900">{selectedUser.mobile_2 || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-400">Landline / Ext:</span>
                <span className="font-semibold text-indigo-600">{selectedUser.extension || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-400">Email:</span>
                <span className="font-semibold text-slate-900">{selectedUser.email}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-gray-100">
                <span className="text-gray-400">Account Status:</span>
                <span className="font-semibold text-slate-900">{selectedUser.status}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-gray-400">Joined Date:</span>
                <span className="font-semibold text-slate-900">{new Date(selectedUser.created_at || Date.now()).toLocaleDateString()}</span>
              </div>
            </div>
          )}

          {sidebarTab === 'security' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500">Perform security management operations on this staff account.</p>
              <button onClick={() => { setPwUserId(selectedUser.id); setPwOpen(true); }} className="w-full py-2 bg-red-50 hover:bg-red-100 rounded-lg text-xs font-semibold text-red-600 transition-colors border border-red-100">
                Force Reset Password
              </button>
            </div>
          )}
        </div>
      )}

      {/* CREATE USER MODAL */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h2 className="text-xl font-bold text-gray-900">Add Staff Member</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Picture Upload Field */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border-2 border-dashed border-gray-200 rounded-xl relative">
                {profileImagePreview ? (
                  <div className="relative group">
                    <img
                      src={profileImagePreview}
                      alt="Preview"
                      className="h-24 w-24 rounded-full object-cover border-2 border-blue-500 shadow-md"
                    />
                    <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer shadow-md hover:bg-blue-700 transition-colors">
                      <Camera className="h-4 w-4" />
                      <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    </label>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center cursor-pointer space-y-2 py-2">
                    <div className="h-14 w-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                      <Camera className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-semibold text-blue-600 hover:underline">Upload Staff Picture</span>
                    <span className="text-[10px] text-gray-400">PNG, JPG up to 10MB</span>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                )}
              </div>

              <Input label="Full Name *" id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. John Doe" />
              <Input label="Email Address *" id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input label="Mobile 1 *" id="mobile1" value={mobile1} onChange={(e) => setMobile1(e.target.value)} placeholder="+971 50 123 4567" />
                <Input label="Mobile 2" id="mobile2" value={mobile2} onChange={(e) => setMobile2(e.target.value)} placeholder="Secondary contact" />
              </div>

              <Input label="Landline / Intercom Extension" id="extension" value={extension} onChange={(e) => setExtension(e.target.value)} placeholder="e.g. Ext 104 or 04-321456" />
              <Input label="Initial Password *" id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Set initial password" />

              <Select
                label="Role Category *"
                id="role_id"
                options={[
                  { value: '', label: 'Select role...' },
                  ...roles.map(r => ({ value: r.id, label: r.name }))
                ]}
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
              />

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate}>Save Staff Member</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h2 className="text-xl font-bold text-gray-900">Edit Staff Member</h2>
              <button onClick={() => setEditOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Picture Upload Field */}
              <div className="flex flex-col items-center justify-center p-4 bg-slate-50 border-2 border-dashed border-gray-200 rounded-xl relative">
                {profileImagePreview ? (
                  <div className="relative group">
                    <img
                      src={profileImagePreview}
                      alt="Preview"
                      className="h-24 w-24 rounded-full object-cover border-2 border-blue-500 shadow-md"
                    />
                    <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer shadow-md hover:bg-blue-700 transition-colors">
                      <Camera className="h-4 w-4" />
                      <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    </label>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center cursor-pointer space-y-2 py-2">
                    <div className="h-14 w-14 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                      <Camera className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-semibold text-blue-600 hover:underline">Change Staff Picture</span>
                    <span className="text-[10px] text-gray-400">PNG, JPG up to 10MB</span>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                  </label>
                )}
              </div>

              <Input label="Full Name *" id="edit_name" value={name} onChange={(e) => setName(e.target.value)} />
              <Input label="Email Address *" id="edit_email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input label="Mobile 1" id="edit_mobile1" value={mobile1} onChange={(e) => setMobile1(e.target.value)} />
                <Input label="Mobile 2" id="edit_mobile2" value={mobile2} onChange={(e) => setMobile2(e.target.value)} />
              </div>

              <Input label="Landline / Intercom Extension" id="edit_extension" value={extension} onChange={(e) => setExtension(e.target.value)} />

              <Select
                label="Role Category"
                id="edit_role_id"
                options={[
                  { value: '', label: 'Select role...' },
                  ...roles.map(r => ({ value: r.id, label: r.name }))
                ]}
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
              />

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <Button variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
                <Button onClick={handleUpdate}>Update Staff Member</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {pwOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Reset Password</h2>
            <div className="space-y-4">
              <Input label="New Password" id="new_pw" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Enter new password" />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setPwOpen(false)}>Cancel</Button>
                <Button onClick={handleResetPw}>Reset Password</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersList;
