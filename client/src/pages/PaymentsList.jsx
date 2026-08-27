import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Search, Download, Filter, Upload, Plus } from 'lucide-react';
import { DataTable } from '../components/DataTable';

export const PaymentsList = () => {
  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [managerFilter, setManagerFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  const [page, setPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    axios.get('/api/v1/payments').then(res => setPayments(res.data.data || []));
  }, []);

  const handleDownloadProof = (id) => {
    axios.get(`/api/v1/payments/${id}/download`, { responseType: 'blob' })
      .then(res => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `receipt_proof_${id}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      })
      .catch(() => {
        alert('Failed to download receipt proof');
      });
  };

  const handleExportCSV = () => {
    let csv = '\ufeffCase Number,Client Name,Amount,Payment Method,Transaction ID,Logged By,Date\n';
    filteredPayments.forEach(p => {
      const caseNum = p.Case?.case_number || 'N/A';
      const clientName = (p.Case?.Lead?.client_name || 'N/A').replace(/"/g, '""');
      const amount = parseFloat(p.amount).toFixed(2);
      const method = p.payment_method;
      const txId = p.transaction_id || 'N/A';
      const loggedBy = (p.creator?.name || 'System').replace(/"/g, '""');
      const date = new Date(p.payment_date).toLocaleDateString();

      csv += `"${caseNum}","${clientName}",${amount},"${method}","${txId}","${loggedBy}","${date}"\n`;
    });
    const url = window.URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `payments_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setManagerFilter('');
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const sortHeader = (label) => (
    <div className="flex items-center gap-1 cursor-pointer select-none">
      <span>{label}</span>
      <span className="text-gray-400 text-xs">↕</span>
    </div>
  );

  const filteredPayments = payments.filter(p => {
    const matchesSearch = p.Case?.Lead?.client_name?.toLowerCase().includes(search.toLowerCase()) || p.Case?.case_number?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter ? p.payment_method === statusFilter : true;
    const matchesManager = managerFilter ? p.creator?.name?.toLowerCase().includes(managerFilter.toLowerCase()) : true;
    return matchesSearch && matchesStatus && matchesManager;
  });

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage) || 1;
  const paginatedPayments = filteredPayments.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const totalPaymentsCount = filteredPayments.length;
  const totalAmount = filteredPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  const currentMonthName = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  const thisMonthAmount = filteredPayments
    .filter(p => {
      const d = new Date(p.payment_date);
      return d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
    })
    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  const uniqueClientsCount = new Set(filteredPayments.map(p => p.Case?.id).filter(Boolean)).size;

  const latestPayment = filteredPayments[0];
  const latestPaymentDateStr = latestPayment ? new Date(latestPayment.payment_date).toLocaleDateString() : 'N/A';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Global Payments Ledger</h1>
          <p className="text-sm text-gray-500 mt-1">Home &gt; Payments Ledger</p>
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Payments</span>
              <span className="text-xl font-bold text-slate-800 mt-1 block">{totalPaymentsCount}</span>
              <span className="text-[10px] text-slate-400 font-semibold mt-1 block">All time payments</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Total Amount</span>
              <span className="text-xl font-bold text-slate-800 mt-1 block">AED {totalAmount.toFixed(2)}</span>
              <span className="text-[10px] text-slate-400 font-semibold mt-1 block">All time amount</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 16c1.657 0 3-.895 3-2s-1.343-2-3-2" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">This Month Amount</span>
              <span className="text-xl font-bold text-slate-800 mt-1 block">AED {thisMonthAmount.toFixed(2)}</span>
              <span className="text-[10px] text-slate-400 font-semibold mt-1 block">{currentMonthName}</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 flex-shrink-0">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Unique Clients</span>
              <span className="text-xl font-bold text-slate-800 mt-1 block">{uniqueClientsCount}</span>
              <span className="text-[10px] text-slate-400 font-semibold mt-1 block">Total clients paid</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Pending Amount</span>
              <span className="text-xl font-bold text-slate-800 mt-1 block">AED 0.00</span>
              <span className="text-[10px] text-slate-400 font-semibold mt-1 block">No pending payments</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 flex-shrink-0">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Latest Payment</span>
              <span className="text-xl font-bold text-slate-800 mt-1 block">{latestPaymentDateStr}</span>
              <span className="text-[10px] text-slate-400 font-semibold mt-1 block">Most recent payment</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 flex-shrink-0">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
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
              placeholder="Search client name..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-slate-500 bg-white"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-48 px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white text-gray-700 focus:outline-none"
          >
            <option value="">Filter by Status</option>
            <option value="BANK_TRANSFER">BANK TRANSFER</option>
            <option value="CASH">CASH</option>
            <option value="CREDIT_CARD">CREDIT CARD</option>
            <option value="ONLINE">ONLINE</option>
          </select>
          <input
            type="text"
            value={managerFilter}
            onChange={(e) => setManagerFilter(e.target.value)}
            placeholder="Filter by Logged By..."
            className="w-full md:w-56 px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-slate-500 bg-white"
          />

          <button onClick={handleResetFilters} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-red-500 bg-white hover:bg-red-50 transition-colors flex items-center gap-1.5">
            Reset
          </button>
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm ">
        <DataTable
          headers={[
            <input
              type="checkbox"
              checked={filteredPayments.length > 0 && selectedIds.length === filteredPayments.length}
              onChange={() => {
                if (selectedIds.length === filteredPayments.length) {
                  setSelectedIds([]);
                } else {
                  setSelectedIds(filteredPayments.map(p => p.id));
                }
              }}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />,
            sortHeader('CASE NUMBER'),
            sortHeader('CLIENT NAME'),
            sortHeader('AMOUNT'),
            sortHeader('PAYMENT METHOD'),
            sortHeader('TRANSACTION ID'),
            sortHeader('LOGGED BY'),
            sortHeader('RECEIPT PROOF'),
            sortHeader('DATE')
          ]}
          rows={paginatedPayments.map(p => [
            <input
              type="checkbox"
              checked={selectedIds.includes(p.id)}
              onChange={() => toggleSelect(p.id)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />,
            p.Case ? (
              <Link to={`/cases/${p.Case.id}`} className="text-blue-600 font-semibold hover:underline">{p.Case.case_number}</Link>
            ) : 'N/A',
            p.Case?.Lead?.client_name || 'N/A',
            <span className="text-emerald-600 font-bold">AED {parseFloat(p.amount).toFixed(2)}</span>,
            p.payment_method,
            p.transaction_id || 'N/A',
            p.creator?.name || 'System',
            p.receipt_path ? (
              <button onClick={() => handleDownloadProof(p.id)} className="text-blue-600 font-semibold hover:underline">
                Download Proof
              </button>
            ) : <span className="text-xs text-gray-400">No Proof</span>,
            new Date(p.payment_date).toLocaleDateString()
          ])}
        />

        <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-4">
          <span className="text-xs text-gray-500">
            Showing {(page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, filteredPayments.length)} of {filteredPayments.length} results
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
