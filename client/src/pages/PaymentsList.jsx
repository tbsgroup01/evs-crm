import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Search, Download, Filter, Upload, Plus, DollarSign, Calendar, Users, CreditCard, FileText, CheckCircle, Clock, X, ChevronRight, AlertCircle, Trash2 } from 'lucide-react';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { AuthContext } from '../App';
import { formatAED } from '../utils/formatters';
import { WhatsAppButton } from '../components/WhatsAppButton';

export const PaymentsList = () => {
  const { user } = useContext(AuthContext);
  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  const userRole = user?.role?.name || user?.role;
  const canManage = ['ADMIN', 'LEAD_MANAGER'].includes(userRole);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState(null);
  const [casePaymentLogs, setCasePaymentLogs] = useState([]);
  const [caseSummary, setCaseSummary] = useState(null);
  const [loadingDrawer, setLoadingDrawer] = useState(false);

  // Add payment modal inside drawer
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newAmount, setNewAmount] = useState('');
  const [newMethod, setNewMethod] = useState('CASH');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newTxId, setNewTxId] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const [page, setPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = () => {
    axios.get('/api/v1/payments').then(res => setPayments(res.data.data || []));
  };

  const handleBulkDelete = () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} selected payment entry/entries?`)) return;

    axios.post('/api/v1/payments/bulk-delete', { payment_ids: selectedIds })
      .then(res => {
        setSelectedIds([]);
        fetchPayments();
        if (selectedCase) openCaseDrawer(selectedCase);
      })
      .catch(err => {
        alert(err.response?.data?.message || 'Failed to delete payment records');
      });
  };

  const openCaseDrawer = (caseObj) => {
    if (!caseObj || !caseObj.id) return;
    setSelectedCase(caseObj);
    setDrawerOpen(true);
    setLoadingDrawer(true);

    Promise.all([
      axios.get(`/api/v1/cases/${caseObj.id}/payments`),
      axios.get(`/api/v1/cases/${caseObj.id}/payment-summary`)
    ]).then(([payRes, sumRes]) => {
      setCasePaymentLogs(payRes.data.data || []);
      setCaseSummary(sumRes.data.data || null);
    }).catch(err => {
      console.error('Failed to load case payments', err);
    }).finally(() => {
      setLoadingDrawer(false);
    });
  };

  const handleAddPaymentSubmit = () => {
    if (!selectedCase?.id || !newAmount || parseFloat(newAmount) <= 0) {
      alert('Please enter a valid positive payment amount');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (newDate && newDate > todayStr) {
      alert('Payment date cannot be greater than the current date.');
      return;
    }

    setSubmittingPayment(true);
    const fd = new FormData();
    fd.append('amount', newAmount);
    fd.append('payment_method', newMethod);
    fd.append('payment_date', newDate);
    if (newTxId) fd.append('transaction_id', newTxId);
    if (newNotes) fd.append('notes', newNotes);
    if (receiptFile) fd.append('file', receiptFile);

    axios.post(`/api/v1/cases/${selectedCase.id}/payments`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(() => {
      setAddModalOpen(false);
      setNewAmount('');
      setNewTxId('');
      setNewNotes('');
      setReceiptFile(null);
      // Refresh drawer & main ledger
      openCaseDrawer(selectedCase);
      fetchPayments();
    }).catch(err => {
      alert(err.response?.data?.message || 'Failed to record payment');
    }).finally(() => {
      setSubmittingPayment(false);
    });
  };

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

  const handleApprovePayment = (paymentId) => {
    if (!window.confirm('Are you sure you want to approve & confirm this payment entry?')) return;
    axios.patch(`/api/v1/payments/${paymentId}/approve`).then(() => {
      fetchPayments();
      if (selectedCase) openCaseDrawer(selectedCase);
    }).catch(err => {
      alert(err.response?.data?.message || 'Failed to approve payment');
    });
  };

  const handleRejectPayment = (paymentId) => {
    if (!window.confirm('Are you sure you want to reject this payment entry?')) return;
    axios.patch(`/api/v1/payments/${paymentId}/reject`).then(() => {
      fetchPayments();
      if (selectedCase) openCaseDrawer(selectedCase);
    }).catch(err => {
      alert(err.response?.data?.message || 'Failed to reject payment');
    });
  };

  const handleExportCSV = () => {
    let csv = '\ufeffFile ID,Lead Number,Client Name,Mobile,Service Category,Package Amount,Paid Entry Amount,Pending Balance,Payment Method,Transaction ID,Recorded By,Date\n';
    filteredPayments.forEach(p => {
      const caseNum = p.Case?.case_number || 'N/A';
      const leadNum = p.Case?.Lead?.lead_number || 'N/A';
      const clientName = (p.Case?.Lead?.client_name || 'N/A').replace(/"/g, '""');
      const mobile = p.Case?.Lead?.mobile || 'N/A';
      const service = (p.Case?.Lead?.service_required || 'N/A').replace(/"/g, '""');
      const pkgAmt = parseFloat(p.Case?.Lead?.package_amount || 0).toFixed(2);
      const paidEntry = parseFloat(p.amount || 0).toFixed(2);

      const totalPaid = parseFloat(p.Case?.Lead?.paid_amount || 0);
      const pendAmt = p.Case?.Lead?.pending_amount !== null && p.Case?.Lead?.pending_amount !== undefined
        ? parseFloat(p.Case?.Lead?.pending_amount)
        : Math.max(0, parseFloat(pkgAmt) - totalPaid);

      const method = p.payment_method || 'N/A';
      const txId = p.transaction_id || 'N/A';
      const loggedBy = (p.creator?.name || 'System').replace(/"/g, '""');
      const date = new Date(p.payment_date).toLocaleDateString();

      csv += `"${caseNum}","${leadNum}","${clientName}","${mobile}","${service}",${pkgAmt},${paidEntry},${pendAmt.toFixed(2)},"${method}","${txId}","${loggedBy}","${date}"\n`;
    });
    const url = window.URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `payments_ledger_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setMethodFilter('');
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
    const searchLower = search.trim().toLowerCase();
    const matchesSearch = !searchLower ||
      (p.Case?.Lead?.client_name && p.Case.Lead.client_name.toLowerCase().includes(searchLower)) ||
      (p.Case?.Lead?.mobile && p.Case.Lead.mobile.toLowerCase().includes(searchLower)) ||
      (p.Case?.case_number && p.Case.case_number.toLowerCase().includes(searchLower)) ||
      (p.Case?.Lead?.lead_number && p.Case.Lead.lead_number.toLowerCase().includes(searchLower)) ||
      (p.transaction_id && p.transaction_id.toLowerCase().includes(searchLower));

    const methodMatch = methodFilter ? p.payment_method === methodFilter : true;

    let statusMatch = true;
    if (statusFilter) {
      if (statusFilter === 'PENDING_APPROVAL' || statusFilter === 'PENDING') statusMatch = p.status === 'PENDING';
      else if (statusFilter === 'APPROVED') statusMatch = p.status === 'APPROVED';
      else if (statusFilter === 'REJECTED') statusMatch = p.status === 'REJECTED';
      else {
        const pkgAmt = parseFloat(p.Case?.Lead?.package_amount || 0);
        const paidAmt = parseFloat(p.Case?.Lead?.paid_amount || 0);
        const pendAmt = p.Case?.Lead?.pending_amount !== null && p.Case?.Lead?.pending_amount !== undefined
          ? parseFloat(p.Case?.Lead?.pending_amount)
          : Math.max(0, pkgAmt - paidAmt);

        if (statusFilter === 'FULLY_PAID') statusMatch = pendAmt <= 0 && pkgAmt > 0;
        if (statusFilter === 'PARTIAL') statusMatch = pendAmt > 0 && paidAmt > 0;
      }
    }

    return matchesSearch && methodMatch && statusMatch;
  });

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage) || 1;
  const paginatedPayments = filteredPayments.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const totalPaymentsCount = filteredPayments.length;
  const totalAmountCollected = filteredPayments
    .filter(p => p.status === 'APPROVED')
    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  const thisMonthAmount = filteredPayments
    .filter(p => {
      const d = new Date(p.payment_date);
      return p.status === 'APPROVED' && d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear();
    })
    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  const uniqueCasesMap = new Map();
  filteredPayments.forEach(p => {
    if (p.Case?.id) {
      uniqueCasesMap.set(p.Case.id, p.Case);
    }
  });

  let totalPendingBalance = 0;
  uniqueCasesMap.forEach(c => {
    const pkg = parseFloat(c.Lead?.package_amount || 0);
    const paid = parseFloat(c.Lead?.paid_amount || 0);
    const pend = c.Lead?.pending_amount !== null && c.Lead?.pending_amount !== undefined
      ? parseFloat(c.Lead.pending_amount)
      : Math.max(0, pkg - paid);
    totalPendingBalance += pend;
  });

  const uniqueClientsCount = uniqueCasesMap.size;

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payments Ledger & Payment Tracking</h1>
          <p className="text-sm text-gray-500 mt-1">
            Complete financial tracking from lead entry to case settlement
            {userRole === 'COUNSELOR' && <span className="ml-2 font-semibold text-blue-600">(Showing payment records for assigned clients only)</span>}
            {userRole === 'CASE_MANAGER' && <span className="ml-2 font-semibold text-indigo-600">(Showing payment records for assigned cases only)</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {canManage && selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
          )}
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors">
            <Download className="h-4 w-4" /> Export CSV Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Total Entries</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">{totalPaymentsCount}</span>
          </div>
          <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <FileText className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Approved Collected</span>
            <span className="text-2xl font-bold text-emerald-600 mt-1 block">{formatAED(totalAmountCollected)}</span>
          </div>
          <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">This Month Approved</span>
            <span className="text-2xl font-bold text-purple-600 mt-1 block">{formatAED(thisMonthAmount)}</span>
          </div>
          <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
            <Calendar className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Outstanding Balance</span>
            <span className="text-2xl font-bold text-amber-600 mt-1 block">{formatAED(totalPendingBalance)}</span>
          </div>
          <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Unique Paying Clients</span>
            <span className="text-2xl font-bold text-slate-800 mt-1 block">{uniqueClientsCount}</span>
          </div>
          <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Users className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by client name, mobile, case number or lead number..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-slate-500 bg-white"
            />
          </div>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="w-full md:w-48 px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white text-gray-700 focus:outline-none"
          >
            <option value="">All Payment Methods</option>
            <option value="CASH">CASH</option>
            <option value="BANK_TRANSFER">BANK TRANSFER</option>
            <option value="ONLINE">ONLINE</option>
            <option value="CARD">CREDIT CARD</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-48 px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white text-gray-700 focus:outline-none"
          >
            <option value="">All Approval Statuses</option>
            <option value="PENDING_APPROVAL">PENDING APPROVAL (RED)</option>
            <option value="APPROVED">CONFIRMED / APPROVED (GREEN)</option>
            <option value="REJECTED">REJECTED</option>
            <option value="FULLY_PAID">CASE FULLY PAID</option>
            <option value="PARTIAL">CASE PARTIALLY PAID</option>
          </select>

          <button onClick={handleResetFilters} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-red-500 bg-white hover:bg-red-50 transition-colors">
            Reset
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <DataTable
          onRowClick={(row, idx) => {
            const p = paginatedPayments[idx];
            if (p?.Case) openCaseDrawer(p.Case);
          }}
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
            sortHeader('FILE / LEAD ID'),
            sortHeader('CLIENT NAME & CONTACT'),
            sortHeader('SERVICE CATEGORY'),
            sortHeader('PACKAGE DEAL'),
            sortHeader('ENTRY AMOUNT'),
            sortHeader('PENDING BALANCE'),
            sortHeader('PAYMENT METHOD'),
            sortHeader('RECORDED BY'),
            sortHeader('DATE & APPROVAL STATUS'),
            'ACTIONS'
          ]}
          rows={paginatedPayments.map(p => {
            const lead = p.Case?.Lead;
            const pkgAmt = parseFloat(lead?.package_amount || 0);
            const totalPaid = parseFloat(lead?.paid_amount || 0);
            const pendAmt = lead?.pending_amount !== null && lead?.pending_amount !== undefined
              ? parseFloat(lead.pending_amount)
              : Math.max(0, pkgAmt - totalPaid);

            const isApproved = p.status === 'APPROVED';
            const isRejected = p.status === 'REJECTED';

            let approvalBadge = (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-red-100 text-red-800 border border-red-300 block max-w-fit">
                PENDING APPROVAL
              </span>
            );
            if (isApproved) {
              approvalBadge = (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 block max-w-fit">
                  CONFIRMED
                </span>
              );
            } else if (isRejected) {
              approvalBadge = (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-gray-100 text-gray-700 border border-gray-300 block max-w-fit">
                  REJECTED
                </span>
              );
            }

            const canManage = ['ADMIN', 'LEAD_MANAGER'].includes(user?.role);

            return [
              <input
                type="checkbox"
                checked={selectedIds.includes(p.id)}
                onChange={() => toggleSelect(p.id)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />,
              <div>
                {p.Case?.id ? (
                  <button
                    onClick={() => openCaseDrawer(p.Case)}
                    className="text-blue-600 font-bold hover:underline block text-xs text-left"
                  >
                    {p.Case.case_number}
                  </button>
                ) : (
                  <span className="text-xs font-bold text-purple-700 block">{p.Case?.case_number || lead?.lead_number || 'Unconverted Lead'}</span>
                )}
                {lead?.lead_number && p.Case?.id && (
                  <span className="text-[10px] text-gray-400 font-semibold block">{lead.lead_number}</span>
                )}
              </div>,
              <div onClick={() => p.Case && openCaseDrawer(p.Case)} className="cursor-pointer">
                <span className="font-bold text-slate-800 text-xs block hover:text-blue-600">{lead?.client_name || 'N/A'}</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-gray-400 text-[10px] block">{lead?.mobile || 'N/A'}</span>
                  {lead?.mobile && (
                    <WhatsAppButton phone={lead.mobile} variant="icon" className="!w-4 !h-4" />
                  )}
                </div>
              </div>,
              <span className="text-xs font-semibold text-slate-700">{lead?.service_required || 'Standard Package'}</span>,
              <span className="text-xs font-bold text-slate-800">{formatAED(pkgAmt)}</span>,
              <span className={`text-xs font-extrabold ${isApproved ? 'text-emerald-600' : isRejected ? 'text-gray-400 line-through' : 'text-amber-600'}`}>
                {formatAED(p.amount)}
              </span>,
              <span className={`text-xs font-extrabold ${pendAmt > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {formatAED(pendAmt)}
              </span>,
              <div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 block max-w-fit uppercase">
                  {p.payment_method || 'CASH'}
                </span>
              </div>,
              <div>
                <span className="text-xs font-bold text-slate-800 block">{p.creator?.name || 'System'}</span>

              </div>,
              <div>
                <span className="text-xs font-semibold text-slate-700 block">{new Date(p.payment_date).toLocaleDateString()}</span>
                <div className="mt-1">{approvalBadge}</div>
              </div>,
              <div className="flex items-center gap-1.5">
                {canManage && !isApproved && !isRejected ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleApprovePayment(p.id); }}
                      className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all"
                      title="Approve Payment"
                    >
                      Approve
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRejectPayment(p.id); }}
                      className="px-2 py-1 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-all"
                      title="Reject Payment"
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 font-semibold">
                    {isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Pending'}
                  </span>
                )}
                {canManage && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Are you sure you want to delete this payment record?')) {
                        axios.post('/api/v1/payments/bulk-delete', { payment_ids: [p.id] })
                          .then(() => fetchPayments())
                          .catch(err => alert(err.response?.data?.message || 'Failed to delete payment'));
                      }
                    }}
                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                    title="Delete Payment"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ];
          })}
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

      {/* RIGHT-SIDE SLIDE-OVER DRAWER MODAL */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
            onClick={() => setDrawerOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-2xl bg-white shadow-2xl flex flex-col">
              {/* Drawer Header */}
              <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white">
                      {selectedCase?.case_number}
                    </span>
                    {selectedCase?.Lead?.lead_number && (
                      <span className="text-xs text-slate-400 font-semibold">{selectedCase.Lead.lead_number}</span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold mt-1">{selectedCase?.Lead?.client_name || 'Case Payment Details'}</h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedCase?.Lead?.service_required || 'Standard Service Package'} • {selectedCase?.Lead?.mobile || 'No Phone'}
                  </p>
                </div>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
                {/* Financial Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Package Price</span>
                    <span className="text-sm font-extrabold text-slate-900 mt-1 block">
                      {formatAED(caseSummary?.packageAmount || selectedCase?.Lead?.package_amount || 0)}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Paid / Received</span>
                    <span className="text-sm font-extrabold text-blue-600 mt-1 block">
                      {formatAED(caseSummary?.totalReceived !== undefined ? caseSummary.totalReceived : (selectedCase?.Lead?.paid_amount || 0))}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Approved Payment</span>
                    <span className="text-sm font-extrabold text-emerald-600 mt-1 block">
                      {formatAED(caseSummary?.approvedAmount !== undefined ? caseSummary.approvedAmount : (selectedCase?.Lead?.paid_amount || 0))}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Payment Awaiting Approval</span>
                    <span className="text-sm font-extrabold text-amber-600 mt-1 block">
                      {formatAED(caseSummary?.awaitingApprovalAmount || 0)}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Pending Balance</span>
                    <span className="text-sm font-extrabold text-red-600 mt-1 block">
                      {formatAED(caseSummary?.pendingBalance !== undefined ? caseSummary.pendingBalance : (selectedCase?.Lead?.pending_amount || 0))}
                    </span>
                  </div>
                </div>

                {/* Log New Payment Button */}
                <button
                  onClick={() => setAddModalOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 transition-all"
                >
                  <Plus className="h-4 w-4" /> Log New Payment Entry
                </button>

                {/* Payment History Timeline */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                      Payment Logs History ({casePaymentLogs.length})
                    </h3>
                  </div>

                  {loadingDrawer ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full" />
                    </div>
                  ) : casePaymentLogs.length === 0 ? (
                    <div className="bg-white rounded-xl p-6 border border-gray-200 text-center">
                      <Clock className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-600">No explicit payment logs found</p>
                      <p className="text-xs text-slate-400 mt-1">Initial deal payment stored on file registration.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {casePaymentLogs.map((log, idx) => {
                        const isApproved = log.status === 'APPROVED';
                        const isRejected = log.status === 'REJECTED';
                        const canManage = ['ADMIN', 'LEAD_MANAGER'].includes(user?.role);

                        return (
                          <div key={log.id || idx} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative">
                            <div className="flex items-start justify-between">
                              <div>
                                <span className={`text-base font-extrabold block ${isApproved ? 'text-emerald-600' : isRejected ? 'text-gray-400 line-through' : 'text-amber-600'}`}>
                                  {formatAED(log.amount)}
                                </span>
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 inline-block uppercase">
                                    {log.payment_method || 'CASH'}
                                  </span>
                                  {isApproved ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      CONFIRMED
                                    </span>
                                  ) : isRejected ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-gray-100 text-gray-700 border border-gray-200">
                                      REJECTED
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-100 text-red-800 border border-red-200">
                                      PENDING APPROVAL
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-xs font-semibold text-slate-500 block">
                                  {new Date(log.payment_date).toLocaleDateString()}
                                </span>
                                {log.transaction_id && (
                                  <span className="text-[10px] font-mono text-gray-400 block mt-0.5">
                                    TX: {log.transaction_id}
                                  </span>
                                )}
                              </div>
                            </div>

                            {log.notes && (
                              <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg mt-3 border border-slate-100">
                                {log.notes}
                              </p>
                            )}

                            <div className="flex items-center justify-between border-t border-gray-100 pt-2.5 mt-3 text-[11px] text-slate-400">
                              <span>Logged by: <strong className="text-slate-700">{log.creator?.name || 'Staff'}</strong></span>
                              <div className="flex items-center gap-2">
                                {canManage && !isApproved && !isRejected && (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleApprovePayment(log.id)}
                                      className="px-2 py-0.5 text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => handleRejectPayment(log.id)}
                                      className="px-2 py-0.5 text-[10px] font-bold text-white bg-red-600 hover:bg-red-700 rounded"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                )}
                                {log.receipt_path && (
                                  <button
                                    onClick={() => handleDownloadProof(log.id)}
                                    className="text-blue-600 font-bold hover:underline flex items-center gap-1"
                                  >
                                    <Download className="h-3 w-3" /> Download Receipt
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-gray-200 bg-white flex justify-end">
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="px-5 py-2 bg-slate-100 text-slate-700 font-semibold text-sm rounded-lg hover:bg-slate-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LOG NEW PAYMENT MODAL */}
      <Modal isOpen={addModalOpen} onClose={() => setAddModalOpen(false)} title={`Log Payment for ${selectedCase?.case_number}`}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Amount (AED) *</label>
            <input
              type="number"
              step="0.01"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full text-sm border border-gray-300 rounded-lg p-2.5 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
              <select
                value={newMethod}
                onChange={(e) => setNewMethod(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg p-2.5 bg-white"
              >
                <option value="CASH">CASH</option>
                <option value="BANK_TRANSFER">BANK TRANSFER</option>
                <option value="ONLINE">ONLINE</option>
                <option value="CREDIT_CARD">CREDIT CARD</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Date</label>
              <input
                type="date"
                value={newDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded-lg p-2.5 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Transaction Ref / ID (Optional)</label>
            <input
              type="text"
              value={newTxId}
              onChange={(e) => setNewTxId(e.target.value)}
              placeholder="e.g. TX-9823145"
              className="w-full text-sm border border-gray-300 rounded-lg p-2.5"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Remarks (Optional)</label>
            <textarea
              rows="2"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="e.g. Second installment paid via bank transfer"
              className="w-full text-sm border border-gray-300 rounded-lg p-2.5"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Upload Receipt Proof (Optional)</label>
            <input
              type="file"
              onChange={(e) => setReceiptFile(e.target.files[0])}
              className="w-full text-sm border border-gray-300 rounded-lg p-1.5"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button
              onClick={() => setAddModalOpen(false)}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAddPaymentSubmit}
              disabled={submittingPayment}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5"
            >
              {submittingPayment ? 'Saving...' : 'Confirm & Save Payment'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default PaymentsList;
