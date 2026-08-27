import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Download, Filter, Upload, Plus, Eye, MoreVertical, X, Users, Folder, TrendingUp, Calendar, CheckSquare } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';

export const UsersList = () => {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('');

  const [pwOpen, setPwOpen] = useState(false);
  const [pwUserId, setPwUserId] = useState(null);
  const [newPw, setNewPw] = useState('');

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [selectedUser, setSelectedUser] = useState(null);
  const [sidebarTab, setSidebarTab] = useState('overview');

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
      if (data.length > 0 && !selectedUser) {
        setSelectedUser(data[0]);
      }
    });
  };

  const handleCreate = () => {
    axios.post('/api/v1/users', { name, email, phone, password, role_id: roleId }).then(() => {
      setName('');
      setEmail('');
      setPhone('');
      setPassword('');
      setRoleId('');
      setOpen(false);
      fetchUsers();
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
    const matchesSearch = u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
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
    return colors[nameStr.charCodeAt(0) % colors.length];
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
            <p className="text-sm text-gray-500 mt-1">Home &gt; Users Manager &gt; Users Directory</p>
          </div>
          <button onClick={() => setOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-sm font-semibold text-white hover:bg-blue-700 transition-colors ml-auto md:ml-0">
            <Plus className="h-4 w-4" /> Create User
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm  flex items-start justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Users</span>
              <span className="text-xl font-bold text-slate-800 mt-1 block">{totalUsersCount}</span>
              <span className="text-[10px] text-slate-400 font-semibold mt-1 block">All registered users</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
              <Users className="h-4 w-4" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm  flex items-start justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Verified Users</span>
              <span className="text-xl font-bold text-slate-800 mt-1 block">{verifiedUsersCount}</span>
              <span className="text-[10px] text-slate-400 font-semibold mt-1 block">100% of total users</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
              <Users className="h-4 w-4" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm  flex items-start justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Leads Assigned</span>
              <span className="text-xl font-bold text-slate-800 mt-1 block">{totalLeadsCount}</span>
              <span className="text-[10px] text-slate-400 font-semibold mt-1 block">Total leads assigned</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 flex-shrink-0">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm  flex items-start justify-between">
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
              <span className="text-[10px] text-slate-400 font-semibold mt-1 block">Users active this month</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 flex-shrink-0">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm ">
          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-slate-500 bg-slate-50"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full md:w-48 px-3 py-2.5 rounded-xl text-sm bg-slate-50 text-gray-700 focus:outline-none"
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
              className="w-full md:w-48 px-3 py-2.5 rounded-xl text-sm bg-slate-50 text-gray-700 focus:outline-none"
            >
              <option value="">Filter by Status</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
            <button className="p-2.5 rounded-xl bg-slate-50 text-gray-400 hover:text-slate-900 transition-colors">
              <Filter className="h-5 w-5" />
            </button>
            <button onClick={handleResetFilters} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-50 hover:bg-gray-100 transition-colors">
              Reset
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm ">
          <DataTable
            headers={[
              sortHeader('USER'),
              sortHeader('ROLE'),
              sortHeader('LEADS ASSIGNED'),
              sortHeader('CASES MANAGED'),
              sortHeader('STATUS'),
              'ACTIONS'
            ]}
            rows={filteredUsers.map(u => [
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${getUserColor(u.name)}`}>
                  {u.name.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-slate-800 text-sm">{u.name}</div>
                  <div className="text-xs text-gray-500">{u.email}</div>
                </div>
              </div>,
              <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${u.role === 'ADMIN' ? 'bg-purple-50 text-purple-700' :
                u.role === 'LEAD_MANAGER' ? 'bg-indigo-50 text-indigo-700' :
                  u.role === 'COUNSELOR' ? 'bg-blue-50 text-blue-700' :
                    'bg-emerald-50 text-emerald-700'
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
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${u.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${u.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                {u.status === 'ACTIVE' ? 'VERIFIED' : 'DISABLED'}
              </span>,
              <div className="flex items-center gap-2">
                <button onClick={() => { setSelectedUser(u); setSidebarTab('overview'); }} className="p-1.5 rounded-lg bg-slate-50 text-gray-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
                  <Eye className="h-4 w-4" />
                </button>
                <div className="relative group">
                  <button className="p-1.5 rounded-lg bg-slate-50 text-gray-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg py-1 hidden group-hover:flex flex-col whitespace-normal z-20">
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
        <div className="w-full xl:w-96 bg-white rounded-xl p-6 shadow-sm flex-shrink-0 sticky top-6">
          <div className="flex items-center justify-between pb-4 mb-5">
            <h3 className="font-bold text-slate-800 text-lg">User Details</h3>
            <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-col items-center text-center pb-5 mb-5">
            <div className={`h-16 w-16 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-3 ${getUserColor(selectedUser.name)}`}>
              {selectedUser.name.charAt(0)}
            </div>
            <div className="flex items-center gap-1.5">
              <h4 className="font-bold text-slate-800 text-base">{selectedUser.name}</h4>
              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Verified
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{selectedUser.email}</p>
            <span className={`mt-3 px-3 py-1 rounded-lg text-xs font-bold ${selectedUser.role === 'ADMIN' ? 'bg-purple-50 text-purple-700' :
              selectedUser.role === 'LEAD_MANAGER' ? 'bg-indigo-50 text-indigo-700' :
                selectedUser.role === 'COUNSELOR' ? 'bg-blue-50 text-blue-700' :
                  'bg-emerald-50 text-emerald-700'
              }`}>
              {selectedUser.role}
            </span>
          </div>

          <div className="flex mb-5">
            {['overview', 'activity', 'details', 'security'].map(t => (
              <button
                key={t}
                onClick={() => setSidebarTab(t)}
                className={`flex-1 pb-2.5 text-xs font-semibold capitalize text-center transition-all ${sidebarTab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'
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

              <h5 className="font-bold text-slate-700 text-xs uppercase tracking-wider pt-2">Recent Activity</h5>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Users className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-800">Lead assigned</p>
                      <span className="text-[10px] text-gray-400">2 mins ago</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">LEAD-1001</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Folder className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-800">Case created</p>
                      <span className="text-[10px] text-gray-400">15 mins ago</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">CASE-1001</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckSquare className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-slate-800">Profile verified</p>
                      <span className="text-[10px] text-gray-400">2 days ago</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">Email verified successfully</p>
                  </div>
                </div>
              </div>

              <button className="w-full py-2  hover:bg-gray-50 rounded-lg text-xs font-semibold text-gray-700 transition-colors mt-2">
                View Full Activity
              </button>
            </div>
          )}

          {sidebarTab === 'activity' && (
            <div className="space-y-3 text-xs text-gray-500">
              <p>• Created account on {new Date().toLocaleDateString()}</p>
              <p>• Updated role categories authorization permissions</p>
              <p>• Logged in from local browser workspace IP</p>
            </div>
          )}

          {sidebarTab === 'details' && (
            <div className="space-y-3 text-xs text-slate-700">
              <div className="flex justify-between py-1">
                <span className="text-gray-400">Phone Number:</span>
                <span className="font-semibold">{selectedUser.phone || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-400">Status:</span>
                <span className="font-semibold">{selectedUser.status}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-400">Joined Date:</span>
                <span className="font-semibold">{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          )}

          {sidebarTab === 'security' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500">Perform security management operations on this account.</p>
              <button onClick={() => { setPwUserId(selectedUser.id); setPwOpen(true); }} className="w-full py-2 bg-red-50 hover:bg-red-100 rounded-lg text-xs font-semibold text-red-600 transition-colors">
                Force Reset Password
              </button>
            </div>
          )}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create Corporate Account</h2>
            <div className="space-y-4">
              <Input label="Name" id="name" value={name} onChange={(e) => setName(e.target.value)} />
              <Input label="Email" id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input label="Phone" id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              <Input label="Password" id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <Select
                label="Role Category"
                id="role_id"
                options={[
                  { value: '', label: 'Select role...' },
                  ...roles.map(r => ({ value: r.id, label: r.name }))
                ]}
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate}>Save User</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {pwOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Reset Password</h2>
            <div className="space-y-4">
              <Input label="New Password" id="new_pw" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setPwOpen(false)}>Cancel</Button>
                <Button onClick={handleResetPw}>Reset</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersList;
