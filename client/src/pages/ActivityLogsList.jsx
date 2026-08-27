import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LogIn, LogOut, Users, TrendingUp, MessageSquare, Folder, Upload, FileText, CheckSquare, DollarSign, Activity, Search, Download, Filter, RotateCcw, MoreVertical, Calendar, AlertTriangle } from 'lucide-react';
import { Card } from '../components/Card';
import { DataTable } from '../components/DataTable';

export const ActivityLogsList = () => {
  const [logs, setLogs] = useState([]);
  
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];

  const [dateFrom, setDateFrom] = useState(startOfMonth);
  const [dateTo, setDateTo] = useState(today);
  const [search, setSearch] = useState('');
  const [operatorFilter, setOperatorFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [page, setPage] = useState(1);
  const limit = 10;

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = () => {
    axios.get('/api/v1/activity').then(res => setLogs(res.data.data || []));
  };

  const getActionCategory = (action, desc) => {
    const act = (action || '').toUpperCase();
    const d = (desc || '').toLowerCase();
    if (act.includes('LOGIN')) return { label: 'User Logged In', sub: 'Login', color: 'text-blue-600 bg-blue-50/70', icon: 'LogIn' };
    if (act.includes('LOGOUT')) return { label: 'User Logged Out', sub: 'Login', color: 'text-gray-500 bg-gray-50', icon: 'LogOut' };
    if (act.includes('ASSIGN')) return { label: 'Bulk Assign Leads', sub: 'Leads', color: 'text-emerald-600 bg-emerald-50/70', icon: 'Users' };
    if (act.includes('CONVERT')) return { label: 'Lead Converted', sub: 'Leads', color: 'text-purple-600 bg-purple-50/70', icon: 'TrendingUp' };
    if (act.includes('INTERACTION') || act.includes('NOTE') || act.includes('ADD_INTER')) return { label: 'Note Added', sub: 'Interactions', color: 'text-amber-600 bg-amber-50/70', icon: 'MessageSquare' };
    if (act.includes('CREATE_LEAD')) return { label: 'Lead Created', sub: 'Leads', color: 'text-blue-600 bg-blue-50/70', icon: 'Users' };
    if (act.includes('CASE')) return { label: 'Case Created', sub: 'Cases', color: 'text-blue-600 bg-blue-50/70', icon: 'Folder' };
    if (act.includes('IMPORT')) return { label: 'Bulk Import', sub: 'Import', color: 'text-orange-600 bg-orange-50/70', icon: 'Upload' };
    if (act.includes('DOCUMENT_UPLOAD') || act.includes('UPLOAD')) return { label: 'Document Uploaded', sub: 'Documents', color: 'text-teal-600 bg-teal-50/70', icon: 'FileText' };
    if (act.includes('VERIF')) return { label: 'Document Verified', sub: 'Documents', color: 'text-indigo-600 bg-indigo-50/70', icon: 'CheckSquare' };
    if (act.includes('PAYMENT')) return { label: 'Payment Received', sub: 'Payments', color: 'text-pink-600 bg-rose-50/70', icon: 'DollarSign' };
    return { label: action, sub: 'System', color: 'text-slate-600 bg-slate-50', icon: 'Activity' };
  };

  const resolveIcon = (iconName) => {
    switch (iconName) {
      case 'LogIn': return <LogIn className="h-4 w-4" />;
      case 'LogOut': return <LogOut className="h-4 w-4" />;
      case 'Users': return <Users className="h-4 w-4" />;
      case 'TrendingUp': return <TrendingUp className="h-4 w-4" />;
      case 'MessageSquare': return <MessageSquare className="h-4 w-4" />;
      case 'Folder': return <Folder className="h-4 w-4" />;
      case 'Upload': return <Upload className="h-4 w-4" />;
      case 'FileText': return <FileText className="h-4 w-4" />;
      case 'CheckSquare': return <CheckSquare className="h-4 w-4" />;
      case 'DollarSign': return <DollarSign className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const handleResetFilters = () => {
    setDateFrom(startOfMonth);
    setDateTo(today);
    setSearch('');
    setOperatorFilter('');
    setActionFilter('');
    setStatusFilter('');
    setPage(1);
  };

  const filteredLogs = logs.filter(log => {
    const isFailed = (log.action || '').toUpperCase().includes('FAIL') || (log.description || '').toLowerCase().includes('fail') || (log.description || '').toLowerCase().includes('error');
    const status = isFailed ? 'FAILED' : 'SUCCESS';

    const matchesSearch =
      (log.User?.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.action || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.description || '').toLowerCase().includes(search.toLowerCase());

    const matchesOperator = operatorFilter ? String(log.user_id) === operatorFilter : true;
    const matchesAction = actionFilter ? log.action === actionFilter : true;
    const matchesStatus = statusFilter ? status === statusFilter : true;

    const logDate = new Date(log.created_at || log.createdAt).toISOString().split('T')[0];
    const matchesDate = (dateFrom ? logDate >= dateFrom : true) && (dateTo ? logDate <= dateTo : true);

    return matchesSearch && matchesOperator && matchesAction && matchesStatus && matchesDate;
  });

  const totalActivities = filteredLogs.length;
  const uniqueUsers = new Set(filteredLogs.map(l => l.user_id).filter(Boolean)).size;
  
  const successfulActions = filteredLogs.filter(log => {
    const isFailed = (log.action || '').toUpperCase().includes('FAIL') || (log.description || '').toLowerCase().includes('fail') || (log.description || '').toLowerCase().includes('error');
    return !isFailed;
  }).length;

  const failedActions = totalActivities - successfulActions;

  const todayActivities = filteredLogs.filter(log => {
    const d = new Date(log.created_at || log.createdAt).toDateString();
    return d === new Date().toDateString();
  }).length;

  const operators = Array.from(new Map(logs.map(l => [l.User?.id, l.User]).filter(([id]) => id)).values());
  const actionTypes = Array.from(new Set(logs.map(l => l.action).filter(Boolean)));

  const handleExportCSV = () => {
    const headers = 'Time,Operator,Action,Description,IP Address,Status\n';
    const csvContent = filteredLogs.map(log => {
      const isFailed = (log.action || '').toUpperCase().includes('FAIL') || (log.description || '').toLowerCase().includes('fail') || (log.description || '').toLowerCase().includes('error');
      const status = isFailed ? 'Failed' : 'Success';
      return `"${new Date(log.created_at).toLocaleString()}","${log.User?.name || 'System'}","${log.action}","${log.description.replace(/"/g, '""')}","${log.ip_address || '::1'}","${status}"`;
    }).join('\n');

    const blob = new Blob([headers + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `activity_audit_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPages = Math.ceil(totalActivities / limit) || 1;
  const paginatedLogs = filteredLogs.slice((page - 1) * limit, page * limit);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Activity Audit Trail</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor all system activities and user actions</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 focus:outline-none"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 focus:outline-none"
          />
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors">
            <Download className="h-4 w-4" /> Export
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Activities</span>
              <span className="text-xl font-bold text-slate-800 mt-1 block">{totalActivities}</span>
              <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">▲ 18.4% vs last 30 days</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
              <Activity className="h-4 w-4" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Unique Users</span>
              <span className="text-xl font-bold text-slate-800 mt-1 block">{uniqueUsers}</span>
              <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">▲ 20.0% vs last 30 days</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
              <Users className="h-4 w-4" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Successful Actions</span>
              <span className="text-xl font-bold text-slate-800 mt-1 block">{successfulActions}</span>
              <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">▲ 15.2% vs last 30 days</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 flex-shrink-0">
              <CheckSquare className="h-4 w-4" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Failed Actions</span>
              <span className="text-xl font-bold text-slate-800 mt-1 block">{failedActions}</span>
              <span className="text-[10px] text-red-500 font-semibold mt-1 block">▼ -20.0% vs last 30 days</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Today's Activities</span>
              <span className="text-xl font-bold text-slate-800 mt-1 block">{todayActivities}</span>
              <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">▲ 9.1% vs yesterday</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 flex-shrink-0">
              <Calendar className="h-4 w-4" />
            </div>
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
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by operator, action or description..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-slate-500 bg-slate-50 border-0"
            />
          </div>
          <select
            value={operatorFilter}
            onChange={(e) => { setOperatorFilter(e.target.value); setPage(1); }}
            className="w-full md:w-48 px-3 py-2.5 rounded-xl text-sm bg-slate-50 text-gray-700 focus:outline-none border-0"
          >
            <option value="">All Operators</option>
            {operators.map(op => (
              <option key={op.id} value={op.id}>{op.name}</option>
            ))}
          </select>
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="w-full md:w-48 px-3 py-2.5 rounded-xl text-sm bg-slate-50 text-gray-700 focus:outline-none border-0"
          >
            <option value="">All Action Types</option>
            {actionTypes.map(act => (
              <option key={act} value={act}>{act}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="w-full md:w-48 px-3 py-2.5 rounded-xl text-sm bg-slate-50 text-gray-700 focus:outline-none border-0"
          >
            <option value="">All Status</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILED">Failed</option>
          </select>
          <button className="p-2.5 rounded-xl bg-slate-50 text-gray-400 hover:text-slate-900 transition-colors border-0">
            <Filter className="h-5 w-5" />
          </button>
          <button onClick={handleResetFilters} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-50 hover:bg-gray-100 transition-colors border-0 flex items-center gap-1.5">
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm">
        <DataTable
          headers={[
            'ACTIVITY',
            'OPERATOR',
            'ACTION TYPE',
            'DESCRIPTION',
            'TIME',
            'STATUS'
          ]}
          rows={paginatedLogs.map(log => {
            const isFailed = (log.action || '').toUpperCase().includes('FAIL') || (log.description || '').toLowerCase().includes('fail') || (log.description || '').toLowerCase().includes('error');
            const statusLabel = isFailed ? 'Failed' : 'Success';
            
            const category = getActionCategory(log.action, log.description);
            const dateObj = new Date(log.created_at || log.createdAt);
            
            const dateStr = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
            const timeStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

            return [
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 ${category.color}`}>
                  {resolveIcon(category.icon)}
                </div>
                <div>
                  <div className="font-semibold text-slate-800 text-sm leading-tight">{category.label}</div>
                  <div className="text-[10px] text-gray-400 font-semibold">{category.sub}</div>
                </div>
              </div>,
              <span className="font-semibold text-slate-700 text-sm">{log.User?.name || 'System'}</span>,
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${
                isFailed ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
              }`}>
                {log.action}
              </span>,
              <span className="text-xs text-gray-500 block max-w-xs truncate" title={log.description}>{log.description}</span>,
              <div>
                <div className="font-semibold text-slate-800 text-xs">{dateStr}</div>
                <div className="text-[10px] text-gray-400 font-semibold mt-0.5">{timeStr}</div>
              </div>,
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                isFailed ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isFailed ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                {statusLabel}
              </span>
            ];
          })}
        />

        <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-4">
          <span className="text-xs text-gray-500">
            Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalActivities)} of {totalActivities} results
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="p-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            >
              &lt;
            </button>
            <span className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold leading-none flex items-center justify-center h-8 min-w-8">
              {page}
            </span>
            <button
              onClick={() => setPage(p => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="p-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-50"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogsList;
