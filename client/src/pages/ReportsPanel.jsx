import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Users, Folder, TrendingUp, Calendar, DollarSign, FileText, ArrowRight, Printer, CheckSquare, Upload } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { formatAED } from '../utils/formatters';

export const ReportsPanel = () => {
  const [leads, setLeads] = useState([]);
  const [cases, setCases] = useState([]);
  const [payments, setPayments] = useState([]);
  const [docs, setDocs] = useState([]);
  const [users, setUsers] = useState([]);
  const [activities, setActivities] = useState([]);

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];

  const [dateFrom, setDateFrom] = useState(startOfMonth);
  const [dateTo, setDateTo] = useState(today);

  useEffect(() => {
    fetchData();
  }, [dateFrom, dateTo]);

  const fetchData = () => {
    const params = {};
    if (dateFrom) params.date_from = dateFrom;
    if (dateTo) params.date_to = dateTo;

    axios.get('/api/v1/leads', { params: { limit: 100 } }).then(res => setLeads(res.data.data.leads || []));
    axios.get('/api/v1/cases').then(res => setCases(res.data.data.cases || []));
    axios.get('/api/v1/payments').then(res => setPayments(res.data.data || []));
    axios.get('/api/v1/documents').then(res => setDocs(res.data.data || []));
    axios.get('/api/v1/users').then(res => setUsers(res.data.data || []));
    axios.get('/api/v1/activity').then(res => setActivities(res.data.data || []));
  };

  const totalLeads = leads.length;
  const convertedLeads = leads.filter(l => l.status === 'CONVERTED').length;
  const totalCases = cases.length;
  const newCases = cases.filter(c => c.status === 'NEW').length;
  const totalUploadedDocs = docs.length;
  const totalPaymentsCollected = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d;
  });

  const leadData7Days = last7Days.map(date => {
    const dateStr = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    const dayLeads = leads.filter(l => {
      const leadDate = new Date(l.created_at || l.createdAt);
      return leadDate.toDateString() === date.toDateString();
    });
    const registered = dayLeads.length;
    const converted = dayLeads.filter(l => l.status === 'CONVERTED').length;
    const rate = registered > 0 ? (converted / registered) * 100 : 0;
    return { dateStr, registered, converted, rate };
  });

  const paymentData7Days = last7Days.map(date => {
    const dateStr = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    const dayPayments = payments.filter(p => {
      const payDate = new Date(p.payment_date);
      return payDate.toDateString() === date.toDateString();
    });
    const amount = dayPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    return { dateStr, amount };
  });

  const inProgressCases = cases.filter(c => c.status === 'IN_PROGRESS').length;
  const closedCases = cases.filter(c => c.status === 'CLOSED').length;
  const donutCasesTotal = totalCases || 1;

  const verifiedDocs = docs.filter(d => d.status === 'VERIFIED').length;
  const pendingDocs = docs.filter(d => d.status === 'PENDING').length;
  const donutDocsTotal = totalUploadedDocs || 1;

  const topUsers = [...users]
    .sort((a, b) => (b.assignedLeadsCount || 0) - (a.assignedLeadsCount || 0))
    .slice(0, 3);

  const maxLeadVal = Math.max(...leadData7Days.map(d => Math.max(d.registered, d.converted)), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Management Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Track performance and key metrics across your CRM</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 focus:outline-none"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 focus:outline-none"
          />
          <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors">
            <Printer className="h-4 w-4" /> Print Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm ">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Leads</span>
              <span className="text-xl font-bold text-slate-800 mt-1 block">{totalLeads}</span>
              <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">▲ 22.2% vs last 30 days</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Users className="h-4 w-4" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm ">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Converted Leads</span>
              <span className="text-xl font-bold text-slate-800 mt-1 block">{convertedLeads}</span>
              <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">▲ 22.2% vs last 30 days</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm ">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Cases</span>
              <span className="text-xl font-bold text-slate-800 mt-1 block">{totalCases}</span>
              <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">▲ 100% vs last 30 days</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
              <Folder className="h-4 w-4" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm ">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">New Cases</span>
              <span className="text-xl font-bold text-slate-800 mt-1 block">{newCases}</span>
              <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">▲ 100% vs last 30 days</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Documents Uploaded</span>
              <span className="text-xl font-bold text-slate-800 mt-1 block">{totalUploadedDocs}</span>
              <span className="text-[10px] text-red-500 font-semibold mt-1 block">▼ -50% vs last 30 days</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-teal-50 flex items-center justify-center text-teal-600">
              <FileText className="h-4 w-4" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm ">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Collection</span>
              <span className="text-xl font-bold text-slate-800 mt-1 block">{formatAED(totalPaymentsCollected)}</span>
              <span className="text-[10px] text-emerald-600 font-semibold mt-1 block">▲ 100% vs last 30 days</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 16c1.657 0 3-.895 3-2s-1.343-2-3-2" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-slate-800 font-bold text-base">Leads Conversion Report</h3>
            <div className="flex gap-4 text-xs font-semibold text-gray-500">
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 bg-blue-600 rounded"></span> Registered</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 bg-emerald-500 rounded"></span> Converted</span>
              <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 bg-purple-500 rounded-full"></span> Conversion Rate (%)</span>
            </div>
          </div>

          <div className="w-full h-56 mt-2">
            <svg className="w-full h-full text-gray-300" viewBox="0 0 1000 240">
              {/* Y Axis Grid lines */}
              <line x1="40" y1="20" x2="960" y2="20" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="60" x2="960" y2="60" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="100" x2="960" y2="100" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="140" x2="960" y2="140" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="180" x2="960" y2="180" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="40" y1="210" x2="960" y2="210" stroke="#cbd5e1" strokeWidth="1.5" />

              {/* Draw last 7 days bars */}
              {leadData7Days.map((d, i) => {
                const x = 80 + i * 140;
                const regH = (d.registered / maxLeadVal) * 150;
                const convH = (d.converted / maxLeadVal) * 150;

                return (
                  <g key={i}>

                    <rect x={x} y={210 - regH} width="24" height={regH} rx="3" className="fill-blue-600" />

                    <rect x={x + 30} y={210 - convH} width="24" height={convH} rx="3" className="fill-emerald-500" />

                    <text x={x + 27} y="228" className="text-[11px] text-gray-400 font-semibold fill-current text-anchor-middle" textAnchor="middle">
                      {d.dateStr}
                    </text>
                    {d.registered > 0 && (
                      <text
                        x={x + 12}
                        y={regH > 18 ? 210 - regH + 12 : 210 - regH - 4}
                        className={`text-[9px] font-bold ${regH > 18 ? 'fill-white' : 'fill-slate-700'}`}
                        textAnchor="middle"
                      >
                        {d.registered}
                      </text>
                    )}
                    {d.converted > 0 && (
                      <text
                        x={x + 42}
                        y={convH > 18 ? 210 - convH + 12 : 210 - convH - 4}
                        className={`text-[9px] font-bold ${convH > 18 ? 'fill-white' : 'fill-slate-700'}`}
                        textAnchor="middle"
                      >
                        {d.converted}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Draw Conversion rate line path */}
              <path
                d={leadData7Days.reduce((path, d, i) => {
                  const x = 107 + i * 140;
                  const y = 210 - (d.rate / 100) * 150;
                  return path + `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                }, '')}
                className="stroke-purple-500 stroke-2 fill-none"
              />

              {/* Conversion rate dots */}
              {leadData7Days.map((d, i) => {
                const x = 107 + i * 140;
                const y = 210 - (d.rate / 100) * 150;
                return (
                  <g key={i}>
                    <circle cx={x} cy={y} r="4" className="fill-purple-500 stroke-white stroke-2" />
                    <text x={x} y={y - 12} className="text-[9px] text-purple-600 font-bold fill-current" textAnchor="middle">
                      {d.rate.toFixed(0)}%
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm ">
          <h3 className="text-slate-800 font-bold text-base mb-4">Cases Allocation Report</h3>

          <div className="flex flex-col items-center justify-center h-56 space-y-4">
            <div className="relative h-32 w-32">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e2e8f0" strokeWidth="3" />

                {/* Segment: New (purple) */}
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke="#a855f7"
                  strokeWidth="3.5"
                  strokeDasharray={`${newCases > 0 ? (newCases / donutCasesTotal) * 100 : 0} ${100 - (newCases > 0 ? (newCases / donutCasesTotal) * 100 : 0)}`}
                  strokeDashoffset="0"
                />
                {/* Segment: In Progress (orange) */}
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="3.5"
                  strokeDasharray={`${inProgressCases > 0 ? (inProgressCases / donutCasesTotal) * 100 : 0} ${100 - (inProgressCases > 0 ? (inProgressCases / donutCasesTotal) * 100 : 0)}`}
                  strokeDashoffset={`-${(newCases / donutCasesTotal) * 100}`}
                />
                {/* Segment: Closed (teal) */}
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke="#14b8a6"
                  strokeWidth="3.5"
                  strokeDasharray={`${closedCases > 0 ? (closedCases / donutCasesTotal) * 100 : 0} ${100 - (closedCases > 0 ? (closedCases / donutCasesTotal) * 100 : 0)}`}
                  strokeDashoffset={`-${((newCases + inProgressCases) / donutCasesTotal) * 100}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-bold text-slate-800">{totalCases}</span>
                <span className="text-[10px] text-gray-400 font-semibold uppercase">Total Cases</span>
              </div>
            </div>

            <div className="w-full space-y-2 text-xs">
              <div className="flex justify-between items-center px-4 py-1.5 bg-slate-50 rounded-lg">
                <span className="flex items-center gap-2 font-semibold text-slate-700">
                  <span className="h-2 w-2 rounded-full bg-purple-500"></span> New Cases
                </span>
                <span className="text-gray-500 font-bold">{newCases} ({totalCases > 0 ? ((newCases / totalCases) * 100).toFixed(0) : 0}%)</span>
              </div>
              <div className="flex justify-between items-center px-4 py-1.5 bg-slate-50 rounded-lg">
                <span className="flex items-center gap-2 font-semibold text-slate-700">
                  <span className="h-2 w-2 rounded-full bg-orange-500"></span> In Progress
                </span>
                <span className="text-gray-500 font-bold">{inProgressCases} ({totalCases > 0 ? ((inProgressCases / totalCases) * 100).toFixed(0) : 0}%)</span>
              </div>
              <div className="flex justify-between items-center px-4 py-1.5 bg-slate-50 rounded-lg">
                <span className="flex items-center gap-2 font-semibold text-slate-700">
                  <span className="h-2 w-2 rounded-full bg-teal-500"></span> Closed Cases
                </span>
                <span className="text-gray-500 font-bold">{closedCases} ({totalCases > 0 ? ((closedCases / totalCases) * 100).toFixed(0) : 0}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm ">
          <h3 className="text-slate-800 font-bold text-base mb-2">Financial Accounts Report</h3>
          <span className="text-xs text-gray-400 font-medium block">Total Collected Amount</span>
          <span className="text-xl font-bold text-emerald-600 mt-1 block">{formatAED(totalPaymentsCollected)}</span>

          <div className="w-full h-48 mt-4">
            <svg className="w-full h-full text-gray-200" viewBox="0 0 200 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* Path line */}
              <path
                d={paymentData7Days.reduce((path, d, i) => {
                  const maxAmt = Math.max(...paymentData7Days.map(x => x.amount), 1);
                  const x = (i / 6) * 200;
                  const y = 90 - (d.amount / maxAmt) * 70;
                  return path + `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                }, '')}
                className="stroke-emerald-500 stroke-2 fill-none"
              />
              {/* Fill area */}
              <path
                d={paymentData7Days.reduce((path, d, i) => {
                  const maxAmt = Math.max(...paymentData7Days.map(x => x.amount), 1);
                  const x = (i / 6) * 200;
                  const y = 90 - (d.amount / maxAmt) * 70;
                  return path + `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                }, '') + ' L 200 95 L 0 95 Z'}
                fill="url(#chartGrad)"
              />
            </svg>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm  flex flex-col justify-between">
          <h3 className="text-slate-800 font-bold text-base mb-4">Documents Verification Ratio</h3>

          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative h-32 w-32">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e2e8f0" strokeWidth="3" />

                {/* Segment: Verified (blue) */}
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3.5"
                  strokeDasharray={`${verifiedDocs > 0 ? (verifiedDocs / donutDocsTotal) * 100 : 0} ${100 - (verifiedDocs > 0 ? (verifiedDocs / donutDocsTotal) * 100 : 0)}`}
                  strokeDashoffset="0"
                />
                {/* Segment: Pending (slate/gray) */}
                <circle
                  cx="18"
                  cy="18"
                  r="15.915"
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="3.5"
                  strokeDasharray={`${pendingDocs > 0 ? (pendingDocs / donutDocsTotal) * 100 : 0} ${100 - (pendingDocs > 0 ? (pendingDocs / donutDocsTotal) * 100 : 0)}`}
                  strokeDashoffset={`-${(verifiedDocs / donutDocsTotal) * 100}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-bold text-slate-800">{totalUploadedDocs}</span>
                <span className="text-[10px] text-gray-400 font-semibold uppercase">Total Files</span>
              </div>
            </div>

            <div className="w-full space-y-2 text-xs">
              <div className="flex justify-between items-center px-4 py-1.5 bg-slate-50 rounded-lg">
                <span className="flex items-center gap-2 font-semibold text-slate-700">
                  <span className="h-2 w-2 rounded-full bg-blue-500"></span> Verified
                </span>
                <span className="text-gray-500 font-bold">{verifiedDocs} ({totalUploadedDocs > 0 ? ((verifiedDocs / totalUploadedDocs) * 100).toFixed(0) : 0}%)</span>
              </div>
              <div className="flex justify-between items-center px-4 py-1.5 bg-slate-50 rounded-lg">
                <span className="flex items-center gap-2 font-semibold text-slate-700">
                  <span className="h-2 w-2 rounded-full bg-slate-400"></span> Pending
                </span>
                <span className="text-gray-500 font-bold">{pendingDocs} ({totalUploadedDocs > 0 ? ((pendingDocs / totalUploadedDocs) * 100).toFixed(0) : 0}%)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm  flex flex-col justify-between">
          <div>
            <h3 className="text-slate-800 font-bold text-base mb-4">Top Performing Users</h3>
            <div className="space-y-4">
              {topUsers.map((u, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-gray-50 last:border-0 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center">
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{u.name}</p>
                      <p className="text-[10px] text-gray-400">{u.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-600 font-bold block">{u.assignedLeadsCount > 0 ? '100%' : '0%'}</span>
                    <span className="text-[10px] text-gray-400 block">{u.assignedLeadsCount || 0} Leads</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Link to="/users" className="flex items-center justify-center gap-2 py-2 border border-gray-150 rounded-lg text-xs font-semibold text-blue-600 bg-white hover:bg-blue-50 transition-colors mt-4">
            View Full Report <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm ">
        <h3 className="text-slate-800 font-bold text-base mb-4">Recent Activity Overview</h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800">Lead assigned</p>
              <p className="text-[10px] text-gray-400 mt-0.5">LEAD-1001</p>
              <span className="text-[9px] text-slate-400 block mt-2">2 mins ago</span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
              <Folder className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800">New case created</p>
              <p className="text-[10px] text-gray-400 mt-0.5">CASE-1001</p>
              <span className="text-[9px] text-slate-400 block mt-2">15 mins ago</span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800">Document uploaded</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Proof_Deytal.pdf</p>
              <span className="text-[9px] text-slate-400 block mt-2">1 hour ago</span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
              <DollarSign className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800">Payment received</p>
              <p className="text-[10px] text-gray-400 mt-0.5">AED 324.00</p>
              <span className="text-[9px] text-slate-400 block mt-2">2 hours ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsPanel;
