import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { DataTable } from '../components/DataTable';
import { AuthContext } from '../App';
import { formatAED } from '../utils/formatters';
import { Users, FileCheck, Landmark, AlertCircle, ArrowUpRight, ArrowDownRight, CheckCircle2, Clock, Flame, Sparkles, Activity, Calendar, Filter } from 'lucide-react';

import { Sun, History } from 'lucide-react';
import { WhatsAppButton } from '../components/WhatsAppButton';

export const DateFilterHeader = ({ filterType, setFilterType, dateFrom, setDateFrom, dateTo, setDateTo }) => {
  const handleFilterTypeChange = (type) => {
    setFilterType(type);
    const now = new Date();
    if (type === 'ALL') {
      setDateFrom('');
      setDateTo('');
    } else if (type === 'TODAY') {
      const d = now.toISOString().split('T')[0];
      setDateFrom(d);
      setDateTo(d);
    } else if (type === 'YESTERDAY') {
      const prev = new Date(now);
      prev.setDate(now.getDate() - 1);
      const d = prev.toISOString().split('T')[0];
      setDateFrom(d);
      setDateTo(d);
    } else if (type === 'THIS_MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const todayStr = now.toISOString().split('T')[0];
      setDateFrom(firstDay);
      setDateTo(todayStr);
    } else if (type === 'LAST_MONTH') {
      const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      setDateFrom(firstDayLastMonth);
      setDateTo(lastDayLastMonth);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      {/* Left Title & Icon */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
          <Calendar className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-sm sm:text-base leading-tight">Dashboard Time Filter</h3>
          <p className="text-xs text-slate-400 font-medium mt-0.5">Customize the date range to view dashboard insights.</p>
        </div>
        <div className="hidden lg:block h-8 w-px bg-slate-200 mx-2" />
      </div>

      {/* Preset Filter Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'ALL', label: 'All Time', Icon: History },
          { id: 'TODAY', label: 'Today', Icon: Sun },
          { id: 'YESTERDAY', label: 'Yesterday', Icon: Calendar },
          { id: 'THIS_MONTH', label: 'This Month', Icon: Calendar },
          { id: 'LAST_MONTH', label: 'Last Month', Icon: Calendar },
          { id: 'CUSTOM', label: 'Custom Dates', Icon: Calendar }
        ].map(({ id, label, Icon }) => {
          const isActive = filterType === id;
          return (
            <button
              key={id}
              onClick={() => handleFilterTypeChange(id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${isActive
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-sm shadow-blue-500/20'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
            >
              <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-white' : (id === 'TODAY' ? 'text-amber-500' : 'text-slate-400')}`} />
              {label}
            </button>
          );
        })}

        {/* Custom Date Inputs Section */}
        {filterType === 'CUSTOM' && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 bg-slate-50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-600"
            />
            <span className="text-xs font-semibold text-slate-400">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 bg-slate-50 focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-600"
            />
            <button
              onClick={() => {
                if (dateFrom && dateTo) {
                  setFilterType('CUSTOM');
                }
              }}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors"
            >
              Apply
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const AdminDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [statusDist, setStatusDist] = useState([]);
  const [growth, setGrowth] = useState([]);
  const [recent, setRecent] = useState(null);

  const [filterType, setFilterType] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    const params = {};
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;

    axios.get('/api/v1/dashboard/summary', { params }).then(res => setSummary(res.data.data));
    axios.get('/api/v1/dashboard/lead-status', { params }).then(res => setStatusDist(res.data.data));
    axios.get('/api/v1/dashboard/monthly-growth', { params }).then(res => setGrowth(res.data.data));
    axios.get('/api/v1/dashboard/recent-activity', { params }).then(res => setRecent(res.data.data));
  }, [dateFrom, dateTo]);

  const sparkLeads = [{ y: 10 }, { y: 15 }, { y: 8 }, { y: 22 }, { y: 14 }, { y: 25 }, { y: 30 }];
  const sparkCases = [{ y: 5 }, { y: 12 }, { y: 7 }, { y: 18 }, { y: 10 }, { y: 15 }, { y: 20 }];
  const sparkRev = [{ y: 20 }, { y: 35 }, { y: 28 }, { y: 55 }, { y: 40 }, { y: 70 }, { y: 80 }];
  const sparkOut = [{ y: 30 }, { y: 25 }, { y: 45 }, { y: 35 }, { y: 50 }, { y: 38 }, { y: 60 }];

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#6b7280'];

  const formattedGrowth = growth.map(g => {
    const monthNames = { '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec' };
    const parts = g.month.split('-');
    return {
      month: monthNames[parts[1]] || g.month,
      count: g.count
    };
  });

  const STATUS_CONFIG = [
    { key: 'NEW', name: 'New Leads', color: '#3b82f6' },
    { key: 'INTERESTED', name: 'Interested', color: '#10b981' },
    { key: 'FOLLOW_UP', name: 'Follow-Up', color: '#f59e0b' },
    { key: 'CONVERTED', name: 'Converted', color: '#8b5cf6' },
    { key: 'COLD_LEAD', name: 'Cold Lead', color: '#64748b' },
    { key: 'NOT_INTERESTED', name: 'Not Interested', color: '#ef4444' }
  ];

  const pieData = STATUS_CONFIG.map(item => {
    const match = statusDist.find(s => String(s.status).toUpperCase() === item.key);
    const countVal = match ? parseInt(match.count, 10) || 0 : 0;
    return {
      name: item.name,
      count: countVal,
      color: item.color
    };
  });

  const totalPieCount = pieData.reduce((acc, curr) => acc + (curr.count || 0), 0);
  const activePieSlices = pieData.filter(d => d.count > 0);

  return (
    <div className="space-y-6">
      <DateFilterHeader
        filterType={filterType}
        setFilterType={setFilterType}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link
          to="/leads"
          className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm relative overflow-hidden flex flex-col justify-between h-40 hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Users className="h-5 w-5" />
              </div>
              <span className="text-sm text-slate-500 group-hover:text-slate-800 font-semibold transition-colors">Total Leads</span>
            </div>
            <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
          <div className="mt-2">
            <p className="text-3xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{summary?.totalLeads || 0}</p>
            <p className="text-xs text-slate-400 mt-1">Filtered range</p>
          </div>
        </Link>

        <Link
          to="/cases"
          className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm relative overflow-hidden flex flex-col justify-between h-40 hover:shadow-md hover:border-emerald-200 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <FileCheck className="h-5 w-5" />
              </div>
              <span className="text-sm text-slate-500 group-hover:text-slate-800 font-semibold transition-colors">Active Cases</span>
            </div>
            <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
          <div className="mt-2">
            <p className="text-3xl font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">{summary?.activeCases || 0}</p>
            <p className="text-xs text-slate-400 mt-1">Filtered range</p>
          </div>
        </Link>

        <Link
          to="/payments"
          className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm relative overflow-hidden flex flex-col justify-between h-40 hover:shadow-md hover:border-purple-200 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <Landmark className="h-5 w-5" />
              </div>
              <span className="text-sm text-slate-500 group-hover:text-slate-800 font-semibold transition-colors">Total Revenue</span>
            </div>
            <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-purple-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold text-slate-900 group-hover:text-purple-600 transition-colors">{formatAED(summary?.totalRevenue || 0)}</p>
            <p className="text-xs text-slate-400 mt-1">Filtered range</p>
          </div>
        </Link>

        <Link
          to="/payments"
          className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm relative overflow-hidden flex flex-col justify-between h-40 hover:shadow-md hover:border-orange-200 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                <AlertCircle className="h-5 w-5" />
              </div>
              <span className="text-sm text-slate-500 group-hover:text-slate-800 font-semibold transition-colors">Outstanding Balances</span>
            </div>
            <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-orange-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold text-slate-900 group-hover:text-orange-600 transition-colors">{formatAED(summary?.outstandingAmount || 0)}</p>
            <p className="text-xs text-slate-400 mt-1">Filtered range</p>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-slate-900">Lead Registration Growth</h2>
            <span className="text-xs text-slate-400">Date Range Filtered</span>
          </div>
          <div className="h-80">
            {formattedGrowth.length === 0 ? (
              <p className="text-center text-slate-500 py-20">No growth data for selected period.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={formattedGrowth} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#2563eb"
                    strokeWidth={2}
                    fill="url(#colorGrowth)"
                    dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                    label={{ position: 'top', fill: '#0f172a', fontSize: 11, fontWeight: 'bold' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-slate-900">Lead Status Distribution</h2>
            <span className="text-xs text-slate-400">Filtered</span>
          </div>
          <div className="flex-1 flex flex-col md:flex-row lg:flex-col items-center justify-center gap-6">
            <div className="h-48 w-48 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={activePieSlices.length > 0 ? activePieSlices : [{ name: 'No Leads', count: 1, color: '#e2e8f0' }]}
                    dataKey="count"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={activePieSlices.length > 1 ? 2 : 0}
                  >
                    {(activePieSlices.length > 0 ? activePieSlices : [{ name: 'No Leads', count: 1, color: '#e2e8f0' }]).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute text-center">
                <p className="text-2xl font-bold text-slate-950">{totalPieCount || summary?.totalLeads || 0}</p>
                <p className="text-xs text-slate-400 font-medium">Total</p>
              </div>
            </div>

            <div className="flex-1 w-full space-y-2 max-h-[190px] overflow-y-auto pr-1">
              {pieData.map((p, idx) => {
                const pct = totalPieCount > 0 ? ((p.count / totalPieCount) * 100).toFixed(0) : '0';
                return (
                  <div key={idx} className="flex items-center justify-between text-xs font-semibold py-0.5">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                      <span className="text-slate-600 font-medium">{p.name}</span>
                    </div>
                    <span className="text-slate-800 font-bold">{p.count} <span className="text-slate-400 font-normal">({pct}%)</span></span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-slate-900">Recent Leads Activity</h2>
            <Link to="/leads" className="text-xs font-semibold text-blue-600 hover:underline border border-gray-200 rounded px-2.5 py-1">View All</Link>
          </div>
          <DataTable
            headers={['LEAD ID', 'NAME', 'PHONE', 'STATUS', 'RECENT ACTIVITY']}
            rows={(recent?.recentLeads || []).map(l => [
              l.lead_number,
              <Link to={`/leads/${l.id}`} className="text-blue-600 font-medium hover:underline">{l.client_name}</Link>,
              <div className="flex items-center gap-1.5">
                <span>{l.mobile}</span>
                {l.mobile && <WhatsAppButton phone={l.mobile} variant="icon" className="!w-4 !h-4" />}
              </div>,
              <StatusBadge status={l.status} />,
              <span className="text-slate-400 text-xs flex items-center">2 mins ago</span>
            ])}
          />
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-slate-900">Recent Active Cases</h2>
            <Link to="/cases" className="text-xs font-semibold text-blue-600 hover:underline border border-gray-200 rounded px-2.5 py-1">View All</Link>
          </div>
          <DataTable
            headers={['CASE ID', 'CLIENT NAME', 'CASE STATUS', 'RECENT ACTIVITY']}
            rows={(recent?.recentCases || []).map(c => [
              c.case_number,
              c.Lead?.client_name || 'N/A',
              <StatusBadge status={c.status} />,
              <span className="text-slate-400 text-xs flex items-center">5 mins ago</span>
            ])}
          />
        </div>
      </div>
    </div>
  );
};

export const CounselorDashboard = () => {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [followups, setFollowups] = useState([]);

  const [filterType, setFilterType] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    const params = {};
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;

    axios.get('/api/v1/leads', { params: { ...params, limit: 100 } }).then(res => {
      const leads = res.data.data.leads || [];
      setStats({
        total: leads.length,
        new: leads.filter(l => l.status === 'NEW').length,
        interested: leads.filter(l => l.status === 'INTERESTED').length,
        follow_up: leads.filter(l => l.status === 'FOLLOW_UP').length,
        cold: leads.filter(l => l.status === 'COLD_LEAD').length,
        converted: leads.filter(l => l.status === 'CONVERTED').length
      });
    });

    axios.get('/api/v1/follow-ups', { params }).then(res => {
      setFollowups(res.data.data || []);
    });
  }, [dateFrom, dateTo]);

  const pieData = [
    { name: 'New Leads', count: stats?.new || 0, color: '#3b82f6' },
    { name: 'Interested', count: stats?.interested || 0, color: '#10b981' },
    { name: 'Follow Up', count: stats?.follow_up || 0, color: '#f59e0b' },
    { name: 'Cold Leads', count: stats?.cold || 0, color: '#64748b' },
    { name: 'Converted', count: stats?.converted || 0, color: '#8b5cf6' }
  ];

  const barData = [
    { name: 'New', count: stats?.new || 0, fill: '#3b82f6' },
    { name: 'Interested', count: stats?.interested || 0, fill: '#10b981' },
    { name: 'Follow Up', count: stats?.follow_up || 0, fill: '#f59e0b' },
    { name: 'Cold', count: stats?.cold || 0, fill: '#64748b' },
    { name: 'Converted', count: stats?.converted || 0, fill: '#8b5cf6' }
  ];

  const totalPieCount = stats?.total || 0;

  return (
    <div className="space-y-6">
      <DateFilterHeader
        filterType={filterType}
        setFilterType={setFilterType}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 bg-gradient-to-r from-slate-900 to-blue-900 text-white p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {user?.name || 'Counselor'}! 👋</h1>
          <p className="text-sm text-blue-200 mt-1">Here is your daily lead performance overview & upcoming follow-ups.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/leads" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all">
            Manage All Leads
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Link to="/leads" className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 transition-all cursor-pointer group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-800 uppercase tracking-wider transition-colors">Assigned Leads</span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 group-hover:text-blue-600 mt-3 transition-colors">{stats?.total || 0}</p>
        </Link>

        <Link to="/leads" className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md hover:border-sky-200 hover:-translate-y-0.5 transition-all cursor-pointer group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-800 uppercase tracking-wider transition-colors">New Leads</span>
            <div className="h-8 w-8 rounded-lg bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white flex items-center justify-center transition-colors">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-sky-600 mt-3">{stats?.new || 0}</p>
        </Link>

        <Link to="/leads" className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md hover:border-emerald-200 hover:-translate-y-0.5 transition-all cursor-pointer group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-800 uppercase tracking-wider transition-colors">Interested</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition-colors">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-emerald-600 mt-3">{stats?.interested || 0}</p>
        </Link>

        <Link to="/leads" className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md hover:border-amber-200 hover:-translate-y-0.5 transition-all cursor-pointer group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-800 uppercase tracking-wider transition-colors">Follow Up</span>
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white flex items-center justify-center transition-colors">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-amber-600 mt-3">{stats?.follow_up || 0}</p>
        </Link>

        <Link to="/leads" className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5 transition-all cursor-pointer group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-800 uppercase tracking-wider transition-colors">Cold Leads</span>
            <div className="h-8 w-8 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-slate-700 group-hover:text-white flex items-center justify-center transition-colors">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-600 mt-3">{stats?.cold || 0}</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Lead Status Comparison</h2>
              <p className="text-xs text-slate-400">Distribution across active lead stages</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={40} label={{ position: 'top', fill: '#475569', fontSize: 12, fontWeight: 'bold' }}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-1">Lead Breakdown</h2>
            <p className="text-xs text-slate-400 mb-4">Pipeline percentage share</p>
          </div>
          <div className="h-44 relative flex items-center justify-center my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="count"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center">
              <p className="text-2xl font-bold text-slate-900">{totalPieCount}</p>
              <p className="text-[10px] text-slate-400 font-medium">TOTAL LEADS</p>
            </div>
          </div>
          <div className="space-y-2.5 mt-2">
            {pieData.map((p, idx) => {
              const pct = totalPieCount > 0 ? ((p.count / totalPieCount) * 100).toFixed(0) : '0';
              return (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="text-slate-600 font-medium">{p.name}</span>
                  </div>
                  <span className="text-slate-900 font-semibold">{p.count} <span className="text-slate-400 font-normal">({pct}%)</span></span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Today's Pending Follow-Ups</h2>
            <p className="text-xs text-slate-400">Scheduled client check-ins requiring attention</p>
          </div>
        </div>
        <DataTable
          headers={['Client Name', 'Mobile', 'Status', 'Target Date']}
          rows={followups.filter(f => f.status === 'PENDING').map(f => [
            <Link to={`/leads/${f.Lead?.id}`} className="text-blue-600 font-semibold hover:underline">{f.Lead?.client_name}</Link>,
            <div className="flex items-center gap-1.5">
              <span>{f.Lead?.mobile || 'N/A'}</span>
              {f.Lead?.mobile && <WhatsAppButton phone={f.Lead.mobile} variant="icon" className="!w-4 !h-4" />}
            </div>,
            <StatusBadge status={f.Lead?.status} />,
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
              {new Date(f.follow_up_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          ])}
        />
      </div>
    </div>
  );
};

export const CaseManagerDashboard = () => {
  const { user } = useContext(AuthContext);
  const [cases, setCases] = useState([]);
  const [stats, setStats] = useState(null);

  const [filterType, setFilterType] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    const params = {};
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;

    axios.get('/api/v1/cases', { params }).then(res => {
      const list = res.data.data.cases || [];
      setCases(list);
      setStats({
        total: list.length,
        new: list.filter(c => c.status === 'NEW').length,
        active: list.filter(c => c.status === 'ACTIVE').length,
        pending: list.filter(c => c.status === 'PENDING').length,
        completed: list.filter(c => c.status === 'COMPLETED').length,
        on_hold: list.filter(c => c.status === 'ON_HOLD').length
      });
    });
  }, [dateFrom, dateTo]);

  const pieData = [
    { name: 'New', count: stats?.new || 0, color: '#3b82f6' },
    { name: 'Active', count: stats?.active || 0, color: '#6366f1' },
    { name: 'Pending Docs', count: stats?.pending || 0, color: '#f59e0b' },
    { name: 'On Hold', count: stats?.on_hold || 0, color: '#ef4444' },
    { name: 'Completed', count: stats?.completed || 0, color: '#10b981' }
  ];

  const barData = [
    { name: 'New', count: stats?.new || 0, fill: '#3b82f6' },
    { name: 'Active', count: stats?.active || 0, fill: '#6366f1' },
    { name: 'Pending', count: stats?.pending || 0, fill: '#f59e0b' },
    { name: 'Completed', count: stats?.completed || 0, fill: '#10b981' }
  ];

  const totalPieCount = stats?.total || 0;

  return (
    <div className="space-y-6">
      <DateFilterHeader
        filterType={filterType}
        setFilterType={setFilterType}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 bg-gradient-to-r from-slate-900 to-indigo-900 text-white p-6 rounded-2xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {user?.name || 'Case Manager'}! 👋</h1>
          <p className="text-sm text-indigo-200 mt-1">Manage active case files, document status, and case updates.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/cases" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all">
            Manage All Cases
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Link to="/cases" className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md hover:border-indigo-200 hover:-translate-y-0.5 transition-all cursor-pointer group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-800 uppercase tracking-wider transition-colors">Allocated Cases</span>
            <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors">
              <FileCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900 group-hover:text-indigo-600 mt-3 transition-colors">{stats?.total || 0}</p>
        </Link>

        <Link to="/cases" className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md hover:border-blue-200 hover:-translate-y-0.5 transition-all cursor-pointer group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-800 uppercase tracking-wider transition-colors">New Cases</span>
            <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-blue-600 mt-3">{stats?.new || 0}</p>
        </Link>

        <Link to="/cases" className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md hover:border-purple-200 hover:-translate-y-0.5 transition-all cursor-pointer group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-800 uppercase tracking-wider transition-colors">Active Files</span>
            <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white flex items-center justify-center transition-colors">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-indigo-600 mt-3">{stats?.active || 0}</p>
        </Link>

        <Link to="/cases" className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md hover:border-amber-200 hover:-translate-y-0.5 transition-all cursor-pointer group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-800 uppercase tracking-wider transition-colors">Pending Docs</span>
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white flex items-center justify-center transition-colors">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-amber-600 mt-3">{stats?.pending || 0}</p>
        </Link>

        <Link to="/cases" className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md hover:border-emerald-200 hover:-translate-y-0.5 transition-all cursor-pointer group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-800 uppercase tracking-wider transition-colors">Completed</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition-colors">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-3xl font-bold text-emerald-600 mt-3">{stats?.completed || 0}</p>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">Case Volume Breakdown</h2>
              <p className="text-xs text-slate-400">Distribution across active case statuses</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={40} label={{ position: 'top', fill: '#475569', fontSize: 12, fontWeight: 'bold' }}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-1">Case Status Share</h2>
            <p className="text-xs text-slate-400 mb-4">Percentage allocation</p>
          </div>
          <div className="h-44 relative flex items-center justify-center my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="count"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center">
              <p className="text-2xl font-bold text-slate-900">{totalPieCount}</p>
              <p className="text-[10px] text-slate-400 font-medium">TOTAL CASES</p>
            </div>
          </div>
          <div className="space-y-2.5 mt-2">
            {pieData.map((p, idx) => {
              const pct = totalPieCount > 0 ? ((p.count / totalPieCount) * 100).toFixed(0) : '0';
              return (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="text-slate-600 font-medium">{p.name}</span>
                  </div>
                  <span className="text-slate-900 font-semibold">{p.count} <span className="text-slate-400 font-normal">({pct}%)</span></span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">My Active Case Files</h2>
            <p className="text-xs text-slate-400">List of cases assigned to your queue</p>
          </div>
        </div>
        <DataTable
          headers={['Case Number', 'Client', 'Mobile', 'Email', 'Case Status']}
          rows={cases.map(c => [
            <Link to={`/cases/${c.id}`} className="text-indigo-600 font-semibold hover:underline">{c.case_number}</Link>,
            c.Lead?.client_name || 'N/A',
            <div className="flex items-center gap-1.5">
              <span>{c.Lead?.mobile || 'N/A'}</span>
              {c.Lead?.mobile && <WhatsAppButton phone={c.Lead.mobile} variant="icon" className="!w-4 !h-4" />}
            </div>,
            c.Lead?.email || 'N/A',
            <StatusBadge status={c.status} />
          ])}
        />
      </div>
    </div>
  );
};

export default AdminDashboard;
