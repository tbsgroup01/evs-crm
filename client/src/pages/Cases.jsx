import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { Plus, Download, Upload, Filter, Calendar, MessageSquare, Clipboard, DollarSign, FileText, Search, ArrowLeft, Check, Activity, User, Folder, CreditCard, Trash2, Phone, UserCheck, Shield, Clock } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import { Modal } from '../components/Modal';
import { AuthContext } from '../App';

export const CaseList = () => {
  const { user } = useContext(AuthContext);
  const [cases, setCases] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [managers, setManagers] = useState([]);
  const [managerFilter, setManagerFilter] = useState('');

  const [selectedIds, setSelectedIds] = useState([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignManagerId, setAssignManagerId] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    fetchCases();
  }, [page, status, managerFilter, search]);

  useEffect(() => {
    if (user?.role === 'ADMIN' || user?.role === 'LEAD_MANAGER') {
      axios.get('/api/v1/users').then(res => {
        setManagers(res.data.data.filter(u => u.role === 'CASE_MANAGER'));
      });
    }
  }, [user]);

  const fetchCases = () => {
    const params = { page, limit: 15 };
    if (search) params.search = search;
    if (status) params.status = status;
    if (managerFilter) params.case_manager_id = managerFilter;

    axios.get('/api/v1/cases', { params }).then(res => {
      setCases(res.data.data.cases || []);
      setTotal(res.data.data.total || 0);
      setTotalPages(res.data.data.totalPages || 1);
    });
  };

  const handleBulkAssign = () => {
    if (!assignManagerId) return;
    axios.post('/api/v1/cases/bulk-assign', {
      case_ids: selectedIds,
      case_manager_id: assignManagerId
    }).then(() => {
      setSelectedIds([]);
      setAssignOpen(false);
      fetchCases();
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} selected case(s)?`)) {
      axios.post('/api/v1/cases/bulk-delete', {
        case_ids: selectedIds
      }).then(() => {
        setSelectedIds([]);
        fetchCases();
      }).catch(err => {
        alert(err.response?.data?.message || 'Failed to delete cases');
      });
    }
  };

  const handleSingleAssign = (caseId, newManagerId) => {
    if (!newManagerId) return;
    axios.post('/api/v1/cases/bulk-assign', {
      case_ids: [caseId],
      case_manager_id: newManagerId
    }).then(() => {
      fetchCases();
    }).catch(err => {
      alert(err.response?.data?.message || 'Failed to assign case manager');
    });
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleExportCSV = () => {
    axios.get('/api/v1/cases/export', { responseType: 'blob' })
      .then(res => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `cases_export_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      })
      .catch(() => {
        alert('Failed to export cases');
      });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'N/A';
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const sortHeader = (label) => (
    <div className="flex items-center gap-1 cursor-pointer select-none">
      <span>{label}</span>
      <span className="text-gray-400 text-xs">↕</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cases Management</h1>
          <p className="text-sm text-gray-500 mt-1">Total Cases: {total}</p>
        </div>
        <div className="flex items-center gap-3">
          {(user?.role === 'ADMIN' || user?.role === 'LEAD_MANAGER') && (
            <>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                <Upload className="h-4 w-4" /> Import Cases
              </button>
              <button
                disabled={selectedIds.length === 0}
                onClick={() => setAssignOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed rounded-lg text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Assign Manager {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
              </button>
              <button
                disabled={selectedIds.length === 0}
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 disabled:bg-red-300 disabled:cursor-not-allowed rounded-lg text-sm font-semibold text-white hover:bg-red-700 transition-colors"
              >
                <Trash2 className="h-4 w-4" /> Bulk Delete {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
              </button>
            </>
          )}
          <button onClick={() => navigate('/leads')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
            <Plus className="h-4 w-4" /> Create Case
          </button>
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
              placeholder="Search client name..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-slate-500 bg-white"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full md:w-48 px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white text-gray-700 focus:outline-none"
          >
            <option value="">Filter by Status</option>
            <option value="NEW">NEW</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="PENDING">PENDING</option>
            <option value="ON_HOLD">ON HOLD</option>
            <option value="COMPLETED">COMPLETED</option>
          </select>
          {(user?.role === 'ADMIN' || user?.role === 'LEAD_MANAGER') && (
            <select
              value={managerFilter}
              onChange={(e) => setManagerFilter(e.target.value)}
              className="w-full md:w-56 px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white text-gray-700 focus:outline-none"
            >
              <option value="">Filter by Case Manager</option>
              {managers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}

          <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <DataTable
          headers={[
            <input
              type="checkbox"
              checked={cases.length > 0 && selectedIds.length === cases.length}
              onChange={() => {
                if (selectedIds.length === cases.length) {
                  setSelectedIds([]);
                } else {
                  setSelectedIds(cases.map(c => c.id));
                }
              }}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />,
            sortHeader('CASE NUMBER'),
            sortHeader('CLIENT NAME'),
            sortHeader('CASE MANAGER'),
            sortHeader('TOTAL PACKAGE'),
            sortHeader('APPROVED PAID'),
            sortHeader('PENDING BALANCE'),
            sortHeader('PAYMENT STATUS'),
            sortHeader('CASE STATUS'),
            sortHeader('CREATED DATE'),
            'ACTIONS'
          ]}
          rows={cases.map(c => {
            const pkgAmt = parseFloat(c.package_amount || 0);
            const paidAmt = parseFloat(c.paid_amount || 0);
            const pendAmt = parseFloat(c.pending_amount !== undefined ? c.pending_amount : Math.max(0, pkgAmt - paidAmt));

            let payStatusBadge = (
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-50 text-red-700 border border-red-200">
                UNPAID
              </span>
            );
            if (c.payment_status === 'FULLY_PAID' || (pendAmt <= 0 && pkgAmt > 0)) {
              payStatusBadge = (
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  FULLY PAID
                </span>
              );
            } else if (c.payment_status === 'PARTIAL' || paidAmt > 0) {
              payStatusBadge = (
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                  PARTIAL
                </span>
              );
            }

            return [
              <input
                type="checkbox"
                checked={selectedIds.includes(c.id)}
                onChange={() => toggleSelect(c.id)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />,
              <div>
                <Link to={`/cases/${c.id}`} className="text-blue-600 font-bold hover:underline block text-xs">{c.case_number}</Link>
                {c.Lead?.lead_number && <span className="text-[10px] text-gray-400 block">{c.Lead.lead_number}</span>}
              </div>,
              <div>
                <span className="font-bold text-slate-800 text-xs block">{c.Lead?.client_name || 'N/A'}</span>
                <span className="text-gray-400 text-[10px] block">{c.Lead?.mobile || c.Lead?.email || 'N/A'}</span>
              </div>,
              (user?.role === 'ADMIN' || user?.role === 'LEAD_MANAGER') ? (
                <select
                  value={c.case_manager_id || c.caseManager?.id || ''}
                  onChange={(e) => handleSingleAssign(c.id, e.target.value)}
                  className={`text-xs py-1.5 px-2.5 border rounded-lg font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-sm transition-all max-w-[140px] ${!(c.case_manager_id || c.caseManager?.id)
                      ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold'
                      : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-white hover:border-blue-300'
                    }`}
                >
                  <option value="" disabled className="text-amber-800 font-bold bg-amber-50">
                    Unassigned
                  </option>
                  {managers.map(m => (
                    <option key={m.id} value={m.id} className="bg-white text-slate-800 font-medium">
                      {m.name}
                    </option>
                  ))}
                </select>
              ) : (
                c.caseManager ? (
                  c.caseManager.name
                ) : (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    Unassigned
                  </span>
                )
              ),
              <span className="text-xs font-bold text-slate-900">AED {pkgAmt.toFixed(2)}</span>,
              <span className="text-xs font-extrabold text-emerald-600">AED {paidAmt.toFixed(2)}</span>,
              <span className={`text-xs font-extrabold ${pendAmt > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                AED {pendAmt.toFixed(2)}
              </span>,
              payStatusBadge,
              <StatusBadge status={c.status} />,
              formatDate(c.created_at || c.createdAt),
              <div className="flex items-center gap-2">
                <Link to={`/cases/${c.id}`} className="p-1.5 border border-gray-200 rounded-lg bg-white text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-all flex items-center justify-center" title="View Case Details">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </Link>
                {(user?.role === 'ADMIN' || user?.role === 'LEAD_MANAGER') && (
                  <button
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete case ${c.case_number}?`)) {
                        axios.delete(`/api/v1/cases/${c.id}`).then(() => fetchCases()).catch(err => alert(err.response?.data?.message || 'Failed to delete case'));
                      }
                    }}
                    className="p-1.5 border border-gray-200 rounded-lg bg-white text-gray-500 hover:text-red-600 hover:border-red-300 transition-all flex items-center justify-center"
                    title="Delete Case"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ];
          })}
        />

        <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-4">
          <span className="text-xs text-gray-500">
            Showing {(page - 1) * 15 + 1} to {Math.min(page * 15, total)} of {total} results
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

      <Modal isOpen={assignOpen} onClose={() => setAssignOpen(false)} title="Assign Case Manager">
        <div className="space-y-4">
          <Select
            label="Select Case Manager"
            id="assign_manager"
            options={[
              { value: '', label: 'Choose...' },
              ...managers.map(c => ({ value: c.id, label: c.name }))
            ]}
            value={assignManagerId}
            onChange={(e) => setAssignManagerId(e.target.value)}
          />
          <Button onClick={handleBulkAssign} className="w-full">Assign Cases</Button>
        </div>
      </Modal>
    </div>
  );
};

export const CaseDetail = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const [caseObj, setCaseObj] = useState(null);
  const [interactions, setInteractions] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [docTypes, setDocTypes] = useState([]);
  const [payments, setPayments] = useState([]);
  const [packages, setPackages] = useState([]);
  const [summary, setSummary] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Interaction Modal State
  const [intOpen, setIntOpen] = useState(false);
  const [intType, setIntType] = useState('CALL');
  const [intNotes, setIntNotes] = useState('');
  const [intStatus, setIntStatus] = useState('');

  const [docOpen, setDocOpen] = useState(false);
  const [docFile, setDocFile] = useState(null);
  const [docTypeSel, setDocTypeSel] = useState('');

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('CASH');
  const [payTxId, setPayTxId] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [payFile, setPayFile] = useState(null);

  const [pkgOpen, setPkgOpen] = useState(false);
  const [pkgSel, setPkgSel] = useState('');

  const [statusVal, setStatusVal] = useState('');

  useEffect(() => {
    fetchCaseDetails();
    axios.get('/api/v1/document-types').then(res => setDocTypes(res.data.data || []));
    axios.get('/api/v1/packages').then(res => setPackages(res.data.data || []));
  }, [id]);

  const fetchCaseDetails = () => {
    axios.get(`/api/v1/cases/${id}`).then(res => {
      setCaseObj(res.data.data.case);
      setStatusVal(res.data.data.case.status);
    });
    axios.get(`/api/v1/cases/${id}/interactions`).then(res => {
      setInteractions(res.data.data || []);
    });
    axios.get(`/api/v1/documents?case_id=${id}`).then(res => setDocuments(res.data.data || []));
    axios.get(`/api/v1/cases/${id}/payments`).then(res => setPayments(res.data.data || []));
    axios.get(`/api/v1/cases/${id}/payment-summary`).then(res => setSummary(res.data.data || null));
  };

  const handleAddInteraction = () => {
    if (!intNotes) return;
    axios.post(`/api/v1/cases/${id}/interactions`, {
      interaction_type: intType,
      notes: intNotes,
      new_status: intStatus || statusVal
    }).then(() => {
      setIntNotes('');
      setIntOpen(false);
      fetchCaseDetails();
    }).catch(err => {
      alert(err.response?.data?.message || 'Failed to log interaction');
    });
  };

  const handleUploadDoc = () => {
    if (!docFile || !docTypeSel) return;
    const fd = new FormData();
    fd.append('file', docFile);
    fd.append('case_id', id);
    fd.append('document_type_id', docTypeSel);

    axios.post('/api/v1/documents/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(() => {
      setDocFile(null);
      setDocOpen(false);
      fetchCaseDetails();
    });
  };

  const handleVerifyDoc = (docId, status, reason = '') => {
    axios.patch(`/api/v1/documents/${docId}/status`, { status, rejection_reason: reason }).then(() => {
      fetchCaseDetails();
    });
  };

  const handleAddPayment = () => {
    const fd = new FormData();
    fd.append('amount', payAmount);
    fd.append('payment_method', payMethod);
    fd.append('transaction_id', payTxId);
    fd.append('notes', payNotes);
    if (payFile) {
      fd.append('file', payFile);
    }

    axios.post(`/api/v1/cases/${id}/payments`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(() => {
      setPayAmount('');
      setPayTxId('');
      setPayNotes('');
      setPayFile(null);
      setPaymentOpen(false);
      fetchCaseDetails();
    }).catch(err => {
      alert(err.response?.data?.message || 'Failed to log payment');
    });
  };

  const handleAssignPackage = () => {
    axios.post(`/api/v1/cases/${id}/package`, { package_id: pkgSel }).then(() => {
      setPkgOpen(false);
      fetchCaseDetails();
    });
  };

  const handleStatusChange = (val) => {
    setStatusVal(val);
    axios.patch(`/api/v1/cases/${id}/status`, { status: val }).then(() => {
      fetchCaseDetails();
    });
  };

  if (!caseObj) return <div className="text-center py-10">Loading Case Details...</div>;

  const getTeamBadge = (item) => {
    let roleLabel = 'User';
    if (item.author_role === 'ADMIN') roleLabel = 'Admin';
    else if (item.author_role === 'LEAD_MANAGER' || item.author_role === 'MANAGER') roleLabel = 'Manager';
    else if (item.author_role === 'CASE_MANAGER') roleLabel = 'Case Manager';
    else if (item.author_role === 'COUNSELOR') roleLabel = 'Counselor';

    if (item.author_role === 'ADMIN') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
          👑 {roleLabel} ({item.author})
        </span>
      );
    }
    if (item.author_role === 'COUNSELOR' || item.source === 'SALES_TEAM') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
          💼 {roleLabel} ({item.author})
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
        🛡️ {roleLabel} ({item.author})
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-600 mb-2">
        <Link to="/cases" className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Cases
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-slate-800">Case Details</span>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-xl bg-blue-50 text-blue-600 font-bold text-2xl flex items-center justify-center flex-shrink-0">
            {caseObj.Lead?.client_name?.charAt(0).toUpperCase() || 'C'}
          </div>
          <div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700">{caseObj.case_number}</span>
            <div className="flex items-center gap-3 mt-1">
              <h1 className="text-2xl font-extrabold text-gray-900 leading-none">{caseObj.Lead?.client_name}</h1>
              <StatusBadge status={caseObj.status} />
            </div>
            <p className="text-xs text-gray-500 mt-1.5 font-semibold flex items-center gap-4">
              <span>Case Manager: <strong className="text-slate-800">{caseObj.caseManager ? caseObj.caseManager.name : 'Unassigned'}</strong></span>
              <span>Client Phone: <strong className="text-slate-800">{caseObj.Lead?.mobile || 'N/A'}</strong></span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select
            id="status_change"
            containerClassName="mb-0 min-w-[130px]"
            className="!py-2.5 font-bold rounded-xl text-xs cursor-pointer border-gray-200"
            options={[
              { value: 'NEW', label: 'NEW' },
              { value: 'ACTIVE', label: 'ACTIVE' },
              { value: 'PENDING', label: 'PENDING' },
              { value: 'ON_HOLD', label: 'ON HOLD' },
              { value: 'COMPLETED', label: 'COMPLETED' }
            ]}
            value={statusVal}
            onChange={(e) => handleStatusChange(e.target.value)}
          />
          <Button onClick={() => setIntOpen(true)} className="flex items-center gap-2 whitespace-nowrap">
            <Phone className="h-4 w-4" /> Log Call / Activity
          </Button>
        </div>
      </div>

      <div className="flex border-b border-gray-150/60 mt-4">
        {['overview', 'activity_history', 'documents', 'payments'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-sm font-semibold capitalize border-b-2 transition-all -mb-px ${activeTab === tab ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-gray-500 hover:text-slate-850'
              }`}
          >
            {tab === 'activity_history' ? 'Activity & Interactions History' : tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            <Card title="Case Overview" className="h-full flex flex-col">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm flex-1">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Clipboard className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Case File ID</p>
                    <p className="text-slate-800 font-bold mt-1 text-sm">{caseObj.case_number}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Opened At</p>
                    <p className="text-slate-800 font-bold mt-1 text-sm">{new Date(caseObj.opened_at).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Requirement Details</p>
                    <p className="text-slate-800 font-bold mt-1 text-sm max-h-24 overflow-y-auto pr-1">{caseObj.Lead?.requirement_details || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Completed At</p>
                    <p className="text-slate-800 font-bold mt-1 text-sm">
                      {caseObj.completed_at ? new Date(caseObj.completed_at).toLocaleDateString() : 'Active File'}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Financial Summary" className="h-full flex flex-col">
              <div className="space-y-4 text-xs font-semibold flex-1 flex flex-col justify-around">
                <div className="flex justify-between border-b border-gray-50 pb-2.5">
                  <span className="text-gray-400">Package Amount</span>
                  <span className="font-bold text-slate-850">AED {summary?.packageAmount?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2.5">
                  <span className="text-gray-400">Total Paid</span>
                  <span className="font-bold text-emerald-600">AED {summary?.totalPaid?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between border-b border-gray-50 pb-2.5">
                  <span className="text-gray-400">Outstanding Balance</span>
                  <span className="font-bold text-red-650">AED {summary?.balance?.toFixed(2) || '0.00'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Payment Status</span>
                  <span className="text-[10px] uppercase font-bold text-slate-800 bg-slate-150/70 px-2 py-0.5 rounded">
                    {summary?.paymentStatus || 'PENDING'}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* COMBINED SALES & CASE TEAM INTERACTION HISTORY FULL WIDTH */}
          <Card title="Activity & Interactions Log (Sales Person & Case Team)" className="w-full">
            {interactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                <Activity className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                No logged calls or updates found yet.
              </div>
            ) : (
              <div className="relative pl-6 border-l border-slate-200 space-y-6 mt-2 ml-3">
                {interactions.slice(0, 5).map((item) => {
                  const dateObj = new Date(item.created_at);
                  const dStr = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
                  const tStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

                  return (
                    <div key={item.id} className="relative flex items-start justify-between gap-4">
                      <div className="absolute -left-9 top-0.5 h-6 w-6 rounded-full flex items-center justify-center border-4 border-white bg-blue-50 text-blue-600">
                        <Activity className="h-3 w-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {getTeamBadge(item)}
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700 uppercase">
                            {item.interaction_type}
                          </span>
                          {item.new_status && (
                            <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                              Status: {item.new_status}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-700 font-medium mt-1.5 leading-relaxed bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                          {item.notes}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[10px] text-slate-700 font-semibold">{dStr}</p>
                        <p className="text-[9px] text-gray-400 font-semibold mt-0.5">{tStr}</p>
                      </div>
                    </div>
                  );
                })}
                {interactions.length > 5 && (
                  <button
                    onClick={() => setActiveTab('activity_history')}
                    className="text-xs font-bold text-blue-600 hover:underline pt-2 block"
                  >
                    View All {interactions.length} Interactions & Call Updates →
                  </button>
                )}
              </div>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'activity_history' && (
        <Card title="Complete Activity & Call Interaction Log (Sales & Case Teams)">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Combined Interactions Timeline</h3>
              <p className="text-xs text-gray-500 mt-0.5">Logs of calls, meetings, and updates registered by sales persons (counselors) and case managers.</p>
            </div>
            <Button onClick={() => setIntOpen(true)} className="flex items-center gap-2">
              <Phone className="h-4 w-4" /> Log Call / Activity
            </Button>
          </div>

          {interactions.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              <Activity className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              No call logs or team activity updates recorded yet.
            </div>
          ) : (
            <div className="relative pl-8 border-l-2 border-slate-200 space-y-6 ml-2">
              {interactions.map(item => {
                const rawDate = item.created_at || item.createdAt || item.interaction_date;
                let dateObj = rawDate ? new Date(rawDate) : new Date();
                if (isNaN(dateObj.getTime())) dateObj = new Date();

                const dStr = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
                const tStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

                return (
                  <div key={item.id} className="relative flex items-start justify-between gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <div className="absolute -left-11 top-4 h-6 w-6 rounded-full flex items-center justify-center border-4 border-white bg-blue-600 text-white shadow-sm">
                      <Activity className="h-3 w-3" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {getTeamBadge(item)}
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                          {item.interaction_type}
                        </span>
                        {item.author && (
                          <span className="text-xs text-slate-500 font-medium">• By: <strong className="text-slate-800">{item.author}</strong></span>
                        )}
                        {item.new_status && (
                          <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                            Transitioned to: {item.new_status}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-800 font-medium leading-relaxed bg-slate-50/80 p-3 rounded-lg border border-slate-100">
                        {item.notes}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 pl-2">
                      <p className="text-xs text-slate-800 font-bold">{dStr}</p>
                      <p className="text-[11px] text-gray-500 font-semibold mt-0.5">{tStr}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {activeTab === 'documents' && (
        <Card>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-900">Documents Checklist</h2>
            <Button onClick={() => setDocOpen(true)} className="flex items-center gap-1.5"><Upload className="h-4 w-4" /> Upload Document</Button>
          </div>
          <DataTable
            headers={['Document Type', 'File Name', 'Uploaded By', 'Status', 'Actions']}
            rows={documents.map(d => [
              <span className="font-bold text-slate-700">{d.DocumentType?.name}</span>,
              <a href={`/api/v1/documents/${d.id}/download`} target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline">{d.file_name}</a>,
              <div>
                <span className="font-bold text-slate-800 text-xs block">{d.uploader?.name || 'N/A'}</span>
                <span className="text-slate-400 text-[10px] block">{d.created_at || d.createdAt ? new Date(d.created_at || d.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</span>
              </div>,
              <div>
                <StatusBadge status={d.status} />
                {d.verifier?.name && (
                  <span className="text-[11px] text-slate-500 font-medium block mt-1">
                    {d.status === 'VERIFIED' ? 'Verified' : 'Rejected'} by <span className="font-bold text-slate-700">{d.verifier.name}</span>
                  </span>
                )}
                {d.rejection_reason && (
                  <span className="text-[11px] text-red-600 font-medium block italic mt-0.5">
                    Reason: {d.rejection_reason}
                  </span>
                )}
              </div>,
              <div className="flex items-center gap-3">
                {(user?.role?.name || user?.role) === 'ADMIN' && d.status === 'UPLOADED' && (
                  <>
                    <button onClick={() => handleVerifyDoc(d.id, 'VERIFIED')} className="text-xs text-emerald-600 font-bold hover:underline">Verify</button>
                    <button onClick={() => {
                      const reason = prompt('Rejection reason:');
                      if (reason) handleVerifyDoc(d.id, 'REJECTED', reason);
                    }} className="text-xs text-red-650 font-bold hover:underline">Reject</button>
                  </>
                )}
              </div>
            ])}
          />
        </Card>
      )}

      {activeTab === 'payments' && (
        <Card>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-900">Payments Ledger</h2>
            <Button onClick={() => setPaymentOpen(true)} className="flex items-center gap-1.5"><Plus className="h-4 w-4" /> Add Payment</Button>
          </div>
          <DataTable
            headers={['Amount', 'Payment Method', 'Transaction ID', 'Approval Status', 'Notes', 'Recorded By', 'Receipt Proof', 'Date', 'Actions']}
            rows={payments.map(p => {
              const isApproved = p.status === 'APPROVED';
              const isRejected = p.status === 'REJECTED';
              const userRole = user?.role?.name || user?.role;
              const canManage = ['ADMIN', 'LEAD_MANAGER'].includes(userRole);

              let badge = (
                <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-red-100 text-red-800 border border-red-300">
                  PENDING APPROVAL
                </span>
              );
              if (isApproved) {
                badge = (
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    CONFIRMED
                  </span>
                );
              } else if (isRejected) {
                badge = (
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-gray-100 text-gray-700 border border-gray-300">
                    REJECTED
                  </span>
                );
              }

              return [
                <span className="font-bold text-slate-800">AED {parseFloat(p.amount).toFixed(2)}</span>,
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-50 text-slate-500 uppercase">{p.payment_method}</span>,
                <span className="font-mono text-xs">{p.transaction_id || 'N/A'}</span>,
                badge,
                <span className="text-xs text-gray-500 block max-w-xs truncate" title={p.notes}>{p.notes || 'N/A'}</span>,
                <div>
                  <span className="text-xs font-bold text-slate-800 block">{p.creator?.name || 'System'}</span>
                </div>,
                p.receipt_path ? (
                  <a href={`/api/v1/payments/${p.id}/download`} target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline flex items-center gap-1"><Download className="h-3.5 w-3.5" /> Download Proof</a>
                ) : <span className="text-xs text-gray-400">No Proof</span>,
                <span className="text-xs font-semibold text-slate-700">{new Date(p.payment_date).toLocaleDateString()}</span>,
                <div>
                  {canManage && !isApproved && !isRejected ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          if (window.confirm('Approve & confirm this payment entry?')) {
                            axios.patch(`/api/v1/payments/${p.id}/approve`).then(() => fetchCaseDetails());
                          }
                        }}
                        className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Reject this payment entry?')) {
                            axios.patch(`/api/v1/payments/${p.id}/reject`).then(() => fetchCaseDetails());
                          }
                        }}
                        className="px-2 py-1 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 font-semibold">{isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Pending'}</span>
                  )}
                </div>
              ];
            })}
          />
        </Card>
      )}

      {/* LOG CALL / INTERACTION MODAL */}
      <Modal isOpen={intOpen} onClose={() => setIntOpen(false)} title="Log Call / Interaction Update">
        <div className="space-y-4">
          <Select
            label="Interaction Type"
            id="int_type"
            options={[
              { value: 'CALL', label: '📞 Phone Call Log' },
              { value: 'MEETING', label: '🤝 Client Meeting' },
              { value: 'UPDATE', label: '📝 Case Status / Process Update' },
              { value: 'NOTE', label: '📌 Internal Note' }
            ]}
            value={intType}
            onChange={(e) => setIntType(e.target.value)}
          />

          <Select
            label="Update Case Status (Optional)"
            id="int_status"
            options={[
              { value: '', label: 'Keep current status' },
              { value: 'NEW', label: 'NEW' },
              { value: 'ACTIVE', label: 'ACTIVE' },
              { value: 'PENDING', label: 'PENDING' },
              { value: 'ON_HOLD', label: 'ON HOLD' },
              { value: 'COMPLETED', label: 'COMPLETED' }
            ]}
            value={intStatus}
            onChange={(e) => setIntStatus(e.target.value)}
          />

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Call Details & Update Notes *</label>
            <textarea
              value={intNotes}
              onChange={(e) => setIntNotes(e.target.value)}
              rows="4"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
              placeholder="Record call summary, client responses, or case updates..."
            />
          </div>

          <Button onClick={handleAddInteraction} className="w-full">Save Interaction Log</Button>
        </div>
      </Modal>

      <Modal isOpen={docOpen} onClose={() => setDocOpen(false)} title="Upload Required Document">
        <div className="space-y-4">
          <Select
            label="Document Category"
            id="doc_type"
            options={[
              { value: '', label: 'Select category...' },
              ...docTypes.map(dt => ({ value: dt.id, label: dt.name }))
            ]}
            value={docTypeSel}
            onChange={(e) => setDocTypeSel(e.target.value)}
          />
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Upload File Attachment</label>
            <input type="file" onChange={(e) => setDocFile(e.target.files[0])} className="w-full text-sm border border-gray-300 rounded p-1.5" />
          </div>
          <Button onClick={handleUploadDoc} className="w-full">Upload Document</Button>
        </div>
      </Modal>

      <Modal isOpen={paymentOpen} onClose={() => setPaymentOpen(false)} title="Log Customer Payment">
        <div className="space-y-4">
          <Input
            label="Payment Amount (AED)"
            id="amount"
            type="number"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
          />
          <Select
            label="Payment Method"
            id="method"
            options={[
              { value: 'CASH', label: 'CASH' },
              { value: 'BANK_TRANSFER', label: 'BANK TRANSFER' },
              { value: 'CARD', label: 'CREDIT CARD' }
            ]}
            value={payMethod}
            onChange={(e) => setPayMethod(e.target.value)}
          />
          <Input
            label="Reference Transaction ID"
            id="tx_id"
            value={payTxId}
            onChange={(e) => setPayTxId(e.target.value)}
            placeholder="TX-998822"
          />
          <Input
            label="Internal Remarks"
            id="pay_notes"
            value={payNotes}
            onChange={(e) => setPayNotes(e.target.value)}
          />
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Upload Payment Receipt / Proof</label>
            <input type="file" onChange={(e) => setPayFile(e.target.files[0])} className="w-full text-sm border border-gray-300 rounded p-1.5" />
          </div>
          <Button onClick={handleAddPayment} className="w-full">Log Payment</Button>
        </div>
      </Modal>

      <Modal isOpen={pkgOpen} onClose={() => setPkgOpen(false)} title="Assign Service Package">
        <div className="space-y-4">
          <Select
            label="Select Package template"
            id="pkg_sel"
            options={[
              { value: '', label: 'Select package template...' },
              ...packages.map(p => ({ value: p.id, label: `${p.name} (AED ${p.amount})` }))
            ]}
            value={pkgSel}
            onChange={(e) => setPkgSel(e.target.value)}
          />
          <Button onClick={handleAssignPackage} className="w-full">Bind Package</Button>
        </div>
      </Modal>
    </div>
  );
};
