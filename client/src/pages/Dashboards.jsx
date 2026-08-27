import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Card } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { DataTable } from '../components/DataTable';
import { AuthContext } from '../App';
import { Users, FileCheck, Landmark, AlertCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export const AdminDashboard = () => {
  const [summary, setSummary] = useState(null);
  const [statusDist, setStatusDist] = useState([]);
  const [growth, setGrowth] = useState([]);
  const [recent, setRecent] = useState(null);

  useEffect(() => {
    axios.get('/api/v1/dashboard/summary').then(res => setSummary(res.data.data));
    axios.get('/api/v1/dashboard/lead-status').then(res => setStatusDist(res.data.data));
    axios.get('/api/v1/dashboard/monthly-growth').then(res => setGrowth(res.data.data));
    axios.get('/api/v1/dashboard/recent-activity').then(res => setRecent(res.data.data));
  }, []);

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

  const pieData = [
    { name: 'Converted', count: statusDist.find(s => s.status === 'CONVERTED')?.count || 0 },
    { name: 'Interested', count: statusDist.find(s => s.status === 'INTERESTED')?.count || 0 },
    { name: 'Follow-Up', count: statusDist.find(s => s.status === 'FOLLOW_UP')?.count || 0 },
    { name: 'Not Interested', count: statusDist.find(s => s.status === 'NOT_INTERESTED')?.count || 0 },
    { name: 'Cold Lead', count: statusDist.find(s => s.status === 'COLD_LEAD')?.count || 0 }
  ];

  const totalPieCount = pieData.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm relative overflow-hidden flex flex-col justify-between h-40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <Users className="h-5 w-5" />
              </div>
              <span className="text-sm text-slate-500 font-semibold">Total Leads</span>
            </div>
            <div className="flex items-center text-xs text-green-600 font-medium">
              <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" /> 12.5%
            </div>
          </div>
          <div className="mt-2">
            <p className="text-3xl font-bold text-slate-900">{summary?.totalLeads || 0}</p>
            <p className="text-xs text-slate-400 mt-1">from last month</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkLeads} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="y" stroke="#3b82f6" strokeWidth={1.5} fill="url(#colorBlue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm relative overflow-hidden flex flex-col justify-between h-40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                <FileCheck className="h-5 w-5" />
              </div>
              <span className="text-sm text-slate-500 font-semibold">Active Cases</span>
            </div>
            <div className="flex items-center text-xs text-green-600 font-medium">
              <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" /> 8.2%
            </div>
          </div>
          <div className="mt-2">
            <p className="text-3xl font-bold text-slate-900">{summary?.activeCases || 0}</p>
            <p className="text-xs text-slate-400 mt-1">from last month</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkCases} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="y" stroke="#10b981" strokeWidth={1.5} fill="url(#colorGreen)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm relative overflow-hidden flex flex-col justify-between h-40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                <Landmark className="h-5 w-5" />
              </div>
              <span className="text-sm text-slate-500 font-semibold">Total Revenue</span>
            </div>
            <div className="flex items-center text-xs text-green-600 font-medium">
              <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" /> 18.7%
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold text-slate-900">AED {summary?.totalRevenue?.toFixed(2) || '0.00'}</p>
            <p className="text-xs text-slate-400 mt-1">from last month</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkRev} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPurple" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="y" stroke="#8b5cf6" strokeWidth={1.5} fill="url(#colorPurple)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm relative overflow-hidden flex flex-col justify-between h-40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                <AlertCircle className="h-5 w-5" />
              </div>
              <span className="text-sm text-slate-500 font-semibold">Outstanding Balances</span>
            </div>
            <div className="flex items-center text-xs text-red-600 font-medium">
              <ArrowDownRight className="h-3.5 w-3.5 mr-0.5" /> 6.4%
            </div>
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold text-slate-900">AED {summary?.outstandingAmount?.toFixed(2) || '0.00'}</p>
            <p className="text-xs text-slate-400 mt-1">from last month</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparkOut} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorOrange" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="y" stroke="#f97316" strokeWidth={1.5} fill="url(#colorOrange)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold text-slate-900">Monthly Lead Registrations</h2>
            <select className="text-xs border border-gray-200 rounded px-2.5 py-1 text-slate-500 bg-white">
              <option>Last 6 Months</option>
            </select>
          </div>
          <div className="h-80">
            {formattedGrowth.length === 0 ? (
              <p className="text-center text-slate-500 py-20">No growth data loaded.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={formattedGrowth} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
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
            <select className="text-xs border border-gray-200 rounded px-2.5 py-1 text-slate-500 bg-white">
              <option>This Month</option>
            </select>
          </div>
          <div className="flex-1 flex flex-col md:flex-row lg:flex-col items-center justify-center gap-6">
            <div className="h-48 w-48 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="count"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute text-center">
                <p className="text-2xl font-bold text-slate-950">{totalPieCount}</p>
                <p className="text-xs text-slate-400">Total</p>
              </div>
            </div>

            <div className="flex-1 w-full space-y-3">
              {pieData.map((p, idx) => {
                const pct = totalPieCount > 0 ? ((p.count / totalPieCount) * 100).toFixed(0) : '0';
                return (
                  <div key={idx} className="flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="text-slate-500 font-medium">{p.name}</span>
                    </div>
                    <span className="text-slate-800">{p.count} ({pct}%)</span>
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
              l.mobile,
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

  useEffect(() => {
    axios.get('/api/v1/leads?limit=100').then(res => {
      const leads = res.data.data.leads || [];
      setStats({
        total: leads.length,
        new: leads.filter(l => l.status === 'NEW').length,
        interested: leads.filter(l => l.status === 'INTERESTED').length,
        follow_up: leads.filter(l => l.status === 'FOLLOW_UP').length,
        cold: leads.filter(l => l.status === 'COLD_LEAD').length
      });
    });

    axios.get('/api/v1/follow-ups').then(res => {
      setFollowups(res.data.data || []);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
        <Card className="text-center">
          <p className="text-sm text-slate-500 font-medium">Assigned Leads</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats?.total || 0}</p>
        </Card>
        <Card className="text-center">
          <p className="text-sm text-slate-500 font-medium">New Leads</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats?.new || 0}</p>
        </Card>
        <Card className="text-center">
          <p className="text-sm text-slate-500 font-medium">Interested</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats?.interested || 0}</p>
        </Card>
        <Card className="text-center">
          <p className="text-sm text-slate-500 font-medium">Follow Up</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{stats?.follow_up || 0}</p>
        </Card>
        <Card className="text-center">
          <p className="text-sm text-slate-500 font-medium">Cold Leads</p>
          <p className="text-2xl font-bold text-gray-500 mt-1">{stats?.cold || 0}</p>
        </Card>
      </div>

      <Card title="Today's Pending Follow-Ups">
        <DataTable
          headers={['Client', 'Mobile', 'Status', 'Target Date']}
          rows={followups.filter(f => f.status === 'PENDING').map(f => [
            <Link to={`/leads/${f.Lead?.id}`} className="text-blue-600 font-medium hover:underline">{f.Lead?.client_name}</Link>,
            f.Lead?.mobile,
            <StatusBadge status={f.Lead?.status} />,
            new Date(f.follow_up_date).toLocaleDateString()
          ])}
        />
      </Card>
    </div>
  );
};

export const CaseManagerDashboard = () => {
  const [cases, setCases] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    axios.get('/api/v1/cases').then(res => {
      const list = res.data.data.cases || [];
      setCases(list);
      setStats({
        total: list.length,
        new: list.filter(c => c.status === 'NEW').length,
        active: list.filter(c => c.status === 'ACTIVE').length,
        pending: list.filter(c => c.status === 'PENDING').length,
        completed: list.filter(c => c.status === 'COMPLETED').length
      });
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
        <Card className="text-center">
          <p className="text-sm text-slate-500 font-medium">Allocated Cases</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats?.total || 0}</p>
        </Card>
        <Card className="text-center">
          <p className="text-sm text-slate-500 font-medium">New</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats?.new || 0}</p>
        </Card>
        <Card className="text-center">
          <p className="text-sm text-slate-500 font-medium">Active</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{stats?.active || 0}</p>
        </Card>
        <Card className="text-center">
          <p className="text-sm text-slate-500 font-medium">Pending Docs</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{stats?.pending || 0}</p>
        </Card>
        <Card className="text-center">
          <p className="text-sm text-slate-500 font-medium">Completed</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{stats?.completed || 0}</p>
        </Card>
      </div>

      <Card title="My Active Case Files">
        <DataTable
          headers={['Case Number', 'Client', 'Mobile', 'Email', 'Case Status']}
          rows={cases.map(c => [
            <Link to={`/cases/${c.id}`} className="text-blue-600 font-medium hover:underline">{c.case_number}</Link>,
            c.Lead?.client_name || 'N/A',
            c.Lead?.mobile || 'N/A',
            c.Lead?.email || 'N/A',
            <StatusBadge status={c.status} />
          ])}
        />
      </Card>
    </div>
  );
};
