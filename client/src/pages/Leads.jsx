import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { Plus, Download, Upload, Filter, Calendar, MessageSquare, Trash2, ArrowRight, Search, Users, Phone, Mail, MapPin, User, FolderPlus, ArrowLeft, Check, Activity, FileText, Eye, PlusCircle, DollarSign, Globe, UserCheck } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { AuthContext } from '../App';
import { formatAED } from '../utils/formatters';
import { isValidPhone, isValidEmail } from '../utils/validators';
import { PhoneInput } from '../components/PhoneInput';
import { CountrySelect } from '../components/CountrySelect';
import { COUNTRIES } from '../data/countries';
import { WhatsAppButton } from '../components/WhatsAppButton';

export const LeadList = () => {
  const { user } = useContext(AuthContext);
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [counselors, setCounselors] = useState([]);
  const [counselorFilter, setCounselorFilter] = useState('');

  const [selectedIds, setSelectedIds] = useState([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignCounselorId, setAssignCounselorId] = useState('');

  const navigate = useNavigate();
  const userRole = user?.role?.name || user?.role;
  const canManageProfit = userRole === 'ADMIN' || userRole === 'LEAD_MANAGER';
  const canCreateLead = userRole !== 'CASE_MANAGER';

  useEffect(() => {
    fetchLeads();
  }, [page, status, counselorFilter, search]);

  useEffect(() => {
    if (canManageProfit) {
      axios.get('/api/v1/users').then(res => {
        setCounselors(res.data.data.filter(u => u.role === 'COUNSELOR'));
      });
    }
  }, [user, canManageProfit]);

  const fetchLeads = () => {
    const params = { page, limit: 15 };
    if (search) params.search = search;
    if (status) params.status = status;
    if (counselorFilter) params.counselor_id = counselorFilter;

    axios.get('/api/v1/leads', { params }).then(res => {
      setLeads(res.data.data.leads || []);
      setTotal(res.data.data.total || 0);
      setTotalPages(res.data.data.totalPages || 1);
    });
    axios.get('/api/v1/leads/stats').then(res => {
      setStats(res.data.data);
    });
  };

  const handleExportCSV = () => {
    axios.get('/api/v1/leads/export', { responseType: 'blob' })
      .then(res => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `leads_export_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
      })
      .catch(() => {
        alert('Failed to export leads');
      });
  };

  const handleBulkAssign = () => {
    if (!assignCounselorId) return;
    axios.post('/api/v1/leads/bulk-assign', {
      lead_ids: selectedIds,
      counselor_id: assignCounselorId
    }).then(() => {
      setSelectedIds([]);
      setAssignOpen(false);
      fetchLeads();
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} selected lead(s)?`)) {
      axios.post('/api/v1/leads/bulk-delete', {
        lead_ids: selectedIds
      }).then(() => {
        setSelectedIds([]);
        fetchLeads();
      }).catch(err => {
        alert(err.response?.data?.message || 'Failed to delete leads');
      });
    }
  };

  const handleSingleAssign = (leadId, newCounselorId) => {
    if (!newCounselorId) return;
    axios.post('/api/v1/leads/bulk-assign', {
      lead_ids: [leadId],
      counselor_id: newCounselorId
    }).then(() => {
      fetchLeads();
    }).catch(err => {
      alert(err.response?.data?.message || 'Failed to assign counselor');
    });
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leads Management</h1>
          <p className="text-sm text-gray-500 mt-1">Total Leads: {total}</p>
        </div>
        <div className="flex items-center gap-3">
          {canManageProfit && (
            <>
              <button onClick={() => navigate('/leads/import')} className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                <Upload className="h-4 w-4" /> Import Leads
              </button>
              <button
                disabled={selectedIds.length === 0}
                onClick={() => setAssignOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed rounded-lg text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Assign Counselor {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
              </button>
              <button
                disabled={selectedIds.length === 0}
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 disabled:bg-red-300 disabled:cursor-not-allowed rounded-lg text-sm font-semibold text-white hover:bg-red-700 transition-colors"
              >
                <Trash2 className="h-4 w-4" /> Delete {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
              </button>
            </>
          )}
          {canCreateLead && (
            <button onClick={() => navigate('/leads/new')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
              <Plus className="h-4 w-4" /> Create Lead
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <button
          type="button"
          onClick={() => { setStatus(''); setPage(1); }}
          className={`bg-white rounded-xl p-4 shadow-sm border text-left transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer flex items-center justify-between ${
            status === '' ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-100 hover:border-blue-200'
          }`}
        >
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Leads</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">
              {stats?.totalLeads ?? stats?.total ?? total}
            </span>
          </div>
          <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <Users className="h-5 w-5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => { setStatus(status === 'NEW' ? '' : 'NEW'); setPage(1); }}
          className={`bg-white rounded-xl p-4 shadow-sm border text-left transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer flex items-center justify-between ${
            status === 'NEW' ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/30' : 'border-gray-100 hover:border-blue-200'
          }`}
        >
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">New Leads</span>
            <span className="text-2xl font-bold text-blue-600 mt-1 block">
              {stats?.newLeads ?? stats?.ratios?.new ?? leads.filter(l => l.status === 'NEW').length}
            </span>
          </div>
          <div className="h-10 w-10 rounded-full bg-sky-50 flex items-center justify-center text-sky-600">
            <UserCheck className="h-5 w-5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => { setStatus(status === 'INTERESTED' ? '' : 'INTERESTED'); setPage(1); }}
          className={`bg-white rounded-xl p-4 shadow-sm border text-left transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer flex items-center justify-between ${
            status === 'INTERESTED' ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/30' : 'border-gray-100 hover:border-emerald-200'
          }`}
        >
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Interested</span>
            <span className="text-2xl font-bold text-emerald-600 mt-1 block">
              {stats?.interestedLeads ?? stats?.ratios?.interested ?? leads.filter(l => l.status === 'INTERESTED').length}
            </span>
          </div>
          <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <Check className="h-5 w-5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => { setStatus(status === 'FOLLOW_UP' ? '' : 'FOLLOW_UP'); setPage(1); }}
          className={`bg-white rounded-xl p-4 shadow-sm border text-left transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer flex items-center justify-between ${
            status === 'FOLLOW_UP' ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/30' : 'border-gray-100 hover:border-amber-200'
          }`}
        >
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Follow Up</span>
            <span className="text-2xl font-bold text-amber-600 mt-1 block">
              {stats?.followUpLeads ?? stats?.ratios?.followUp ?? leads.filter(l => l.status === 'FOLLOW_UP').length}
            </span>
          </div>
          <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
            <Calendar className="h-5 w-5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => { setStatus(status === 'CONVERTED' ? '' : 'CONVERTED'); setPage(1); }}
          className={`bg-white rounded-xl p-4 shadow-sm border text-left transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer flex items-center justify-between ${
            status === 'CONVERTED' ? 'border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/30' : 'border-gray-100 hover:border-purple-200'
          }`}
        >
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Converted</span>
            <span className="text-2xl font-bold text-purple-600 mt-1 block">
              {stats?.convertedLeads ?? stats?.ratios?.converted ?? leads.filter(l => l.status === 'CONVERTED').length}
            </span>
          </div>
          <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
            <FolderPlus className="h-5 w-5" />
          </div>
        </button>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, mobile, email or lead number..."
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
            <option value="INTERESTED">INTERESTED</option>
            <option value="FOLLOW_UP">FOLLOW UP</option>
            <option value="NOT_INTERESTED">NOT INTERESTED</option>
            <option value="COLD_LEAD">COLD LEAD</option>
            <option value="CONVERTED">CONVERTED</option>
          </select>
          {canManageProfit && (
            <select
              value={counselorFilter}
              onChange={(e) => setCounselorFilter(e.target.value)}
              className="w-full md:w-56 px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white text-gray-700 focus:outline-none"
            >
              <option value="">Filter by Counselor</option>
              {counselors.map(c => (
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
              checked={leads.length > 0 && selectedIds.length === leads.length}
              onChange={() => {
                if (selectedIds.length === leads.length) {
                  setSelectedIds([]);
                } else {
                  setSelectedIds(leads.map(l => l.id));
                }
              }}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />,
            sortHeader('LEAD NUMBER'),
            sortHeader('NAME & MOBILE'),
            sortHeader('NATIONALITY'),
            sortHeader('SERVICE / CATEGORY'),
            sortHeader('PAX (ADULTS/KIDS)'),
            sortHeader('PACKAGE / PENDING'),
            sortHeader('COUNSELOR'),
            ...(canManageProfit ? [sortHeader('PROFIT')] : []),
            sortHeader('STATUS'),
            'ACTIONS'
          ]}
          rows={leads.map(l => {
            const numAdults = parseInt(l.adults || 1);
            const numKids = parseInt(l.kids || 0);
            const totalPax = l.total_pax || (numAdults + numKids);
            const pkgAmt = parseFloat(l.package_amount || 0);
            const paidAmt = parseFloat(l.paid_amount || 0);
            const pendAmt = l.pending_amount !== null && l.pending_amount !== undefined ? parseFloat(l.pending_amount) : Math.max(0, pkgAmt - paidAmt);

            return [
              <input
                type="checkbox"
                checked={selectedIds.includes(l.id)}
                onChange={() => toggleSelect(l.id)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />,
              l.lead_number,
              <div>
                <Link to={`/leads/${l.id}`} className="text-blue-600 font-semibold hover:underline block">{l.client_name}</Link>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-gray-500 block">{l.mobile}</span>
                  {l.mobile && (
                    <WhatsAppButton phone={l.mobile} variant="icon" className="!w-4 !h-4" />
                  )}
                </div>
              </div>,
              <span className="text-xs font-semibold text-slate-700">{l.nationality || l.country || 'N/A'}</span>,
              <span className="text-xs font-semibold text-slate-700">{l.service_required || 'N/A'}</span>,
              <div className="text-xs">
                <span className="font-bold text-slate-800">{totalPax} Pax</span>
                <span className="text-gray-400 block text-[10px]">{numAdults} Adult(s), {numKids} Kid(s)</span>
              </div>,
              <div className="text-xs">
                <span className="font-bold text-slate-800">{formatAED(pkgAmt)}</span>
                <span className={`block text-[10px] font-semibold ${pendAmt > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {pendAmt > 0 ? `Pending: ${formatAED(pendAmt)}` : 'Fully Paid'}
                </span>
              </div>,
              canManageProfit ? (
                <select
                  value={l.counselor_id || ''}
                  onChange={(e) => handleSingleAssign(l.id, e.target.value)}
                  className={`text-xs py-1.5 px-2.5 border rounded-lg font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer shadow-sm transition-all max-w-[140px] ${!l.counselor_id
                    ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-white hover:border-blue-300'
                    }`}
                >
                  <option value="" disabled className="text-amber-800 font-bold bg-amber-50">
                    Unassigned
                  </option>
                  {counselors.map(c => (
                    <option key={c.id} value={c.id} className="bg-white text-slate-800 font-medium">
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : (
                l.counselor ? (
                  l.counselor.name
                ) : (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    Unassigned
                  </span>
                )
              ),
              ...(canManageProfit ? [
                <span className="text-xs font-bold text-emerald-600">
                  {l.profit !== null && l.profit !== undefined ? formatAED(l.profit) : 'N/A'}
                </span>
              ] : []),
              <StatusBadge status={l.status} />,
              <div className="flex items-center gap-2">
                <Link to={`/leads/${l.id}`} className="p-1.5 border border-gray-200 rounded-lg bg-white text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-all flex items-center justify-center" title="View Details">
                  <Eye className="h-4 w-4" />
                </Link>
                <Link to={`/leads/edit/${l.id}`} className="p-1.5 border border-gray-200 rounded-lg bg-white text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-all flex items-center justify-center" title="Edit Profile">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </Link>
                {canManageProfit && (
                  <button
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete lead ${l.lead_number}?`)) {
                        axios.delete(`/api/v1/leads/${l.id}`).then(() => fetchLeads()).catch(err => alert(err.response?.data?.message || 'Failed to delete lead'));
                      }
                    }}
                    className="p-1.5 border border-gray-200 rounded-lg bg-white text-gray-500 hover:text-red-600 hover:border-red-300 transition-all flex items-center justify-center"
                    title="Delete Lead"
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

      <Modal isOpen={assignOpen} onClose={() => setAssignOpen(false)} title="Assign Counselor">
        <div className="space-y-4">
          <Select
            label="Select Counselor"
            id="assign_counselor"
            options={[
              { value: '', label: 'Choose...' },
              ...counselors.map(c => ({ value: c.id, label: c.name }))
            ]}
            value={assignCounselorId}
            onChange={(e) => setAssignCounselorId(e.target.value)}
          />
          <Button onClick={handleBulkAssign} className="w-full">Assign Leads</Button>
        </div>
      </Modal>
    </div>
  );
};

export const LeadDetail = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const userRole = user?.role?.name || user?.role;
  const canCreateCase = userRole !== 'CASE_MANAGER';
  const [lead, setLead] = useState(null);
  const [interactions, setInteractions] = useState([]);

  // Modals
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteVal, setNoteVal] = useState('');
  const [noteStatus, setNoteStatus] = useState('');
  const [followOpen, setFollowOpen] = useState(false);
  const [followDate, setFollowDate] = useState('');
  const [followNotes, setFollowNotes] = useState('');

  // Conversion Modal State
  const [convertOpen, setConvertOpen] = useState(false);
  const [convCaseNumber, setConvCaseNumber] = useState('');
  const [convNationality, setConvNationality] = useState('');
  const [convService, setConvService] = useState('');
  const [convAdults, setConvAdults] = useState(1);
  const [convKids, setConvKids] = useState(0);
  const [convPkgAmount, setConvPkgAmount] = useState('');
  const [convPaidAmount, setConvPaidAmount] = useState('');
  const [convNewPaymentAmount, setConvNewPaymentAmount] = useState('');
  const [convPaymentDate, setConvPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [convNotes, setConvNotes] = useState('');
  const [convProfit, setConvProfit] = useState('');

  const [showAllLogs, setShowAllLogs] = useState(false);
  const navigate = useNavigate();

  const canManageProfit = user?.role === 'ADMIN' || user?.role === 'LEAD_MANAGER';

  useEffect(() => {
    fetchLeadDetails();
  }, [id]);

  const fetchLeadDetails = () => {
    axios.get(`/api/v1/leads/${id}`).then(res => {
      const data = res.data.data;
      if (data) {
        data.package_amount = data.package_amount !== null && data.package_amount !== undefined ? parseFloat(data.package_amount) : 0;
        data.paid_amount = data.paid_amount !== null && data.paid_amount !== undefined ? parseFloat(data.paid_amount) : 0;
        data.pending_amount = Math.max(0, data.package_amount - data.paid_amount);
      }
      setLead(data);
    });
    axios.get(`/api/v1/leads/${id}/interactions`).then(res => setInteractions(res.data.data || []));
  };

  const handleAddInteraction = () => {
    axios.post(`/api/v1/leads/${id}/interactions`, {
      interaction_type: 'NOTE',
      notes: noteVal,
      new_status: noteStatus || lead.status
    }).then(() => {
      setNoteVal('');
      setNoteOpen(false);
      fetchLeadDetails();
    });
  };

  const handleAddFollowup = () => {
    axios.post(`/api/v1/leads/${id}/follow-up`, {
      follow_up_date: followDate,
      notes: followNotes
    }).then(() => {
      setFollowDate('');
      setFollowNotes('');
      setFollowOpen(false);
      fetchLeadDetails();
    });
  };

  const openConvertModal = () => {
    const pkg = lead?.package_amount !== undefined && lead?.package_amount !== null ? parseFloat(lead.package_amount) : 0;
    const paid = lead?.paid_amount !== undefined && lead?.paid_amount !== null ? parseFloat(lead.paid_amount) : 0;

    setConvCaseNumber(`FILE-${1000 + parseInt(id || 1)}`);
    setConvNationality(lead?.nationality || lead?.country || '');
    setConvService(lead?.service_required || '');
    setConvAdults(lead?.adults !== undefined && lead?.adults !== null ? lead.adults : 1);
    setConvKids(lead?.kids !== undefined && lead?.kids !== null ? lead.kids : 0);
    setConvPkgAmount(pkg);
    setConvPaidAmount(paid);
    setConvNewPaymentAmount('');
    setConvPaymentDate(lead?.payment_date || new Date().toISOString().split('T')[0]);
    setConvNotes(lead?.notes || '');
    setConvProfit(lead?.profit !== undefined && lead?.profit !== null ? lead.profit : '');
    setConvertOpen(true);
  };

  const handleConfirmConvert = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (convPaymentDate && convPaymentDate > todayStr) {
      alert('Payment date cannot be greater than the current date.');
      return;
    }

    const pkg = convPkgAmount !== '' && convPkgAmount !== null ? parseFloat(convPkgAmount) : (lead?.package_amount ? parseFloat(lead.package_amount) : 0);
    const newPaid = convNewPaymentAmount !== '' && convNewPaymentAmount !== null ? parseFloat(convNewPaymentAmount) : 0;

    const payload = {
      case_number: convCaseNumber,
      nationality: convNationality,
      service_required: convService,
      adults: parseInt(convAdults || 0),
      kids: parseInt(convKids || 0),
      package_amount: pkg,
      new_payment_amount: newPaid,
      payment_date: convPaymentDate,
      notes: convNotes
    };

    if (canManageProfit && convProfit !== '') {
      payload.profit = parseFloat(convProfit);
    }

    axios.post(`/api/v1/leads/${id}/convert`, payload).then(() => {
      setConvertOpen(false);
      navigate('/cases');
    }).catch(err => {
      alert(err.response?.data?.message || 'Conversion failed');
    });
  };

  const getInteractionDetails = (type) => {
    const t = (type || '').toUpperCase();
    if (t.includes('NOTE')) return { color: 'text-amber-600 bg-amber-50', icon: 'MessageSquare', label: 'Note Added' };
    if (t.includes('FOLLOW')) return { color: 'text-blue-600 bg-blue-50', icon: 'Calendar', label: 'Follow-up Scheduled' };
    if (t.includes('CONVERT')) return { color: 'text-purple-600 bg-purple-50', icon: 'Check', label: 'Lead Converted' };
    if (t.includes('CREATE')) return { color: 'text-emerald-600 bg-emerald-50', icon: 'Check', label: 'Lead Created' };
    if (t.includes('ASSIGN')) return { color: 'text-indigo-600 bg-indigo-50', icon: 'Activity', label: 'Counselor Assigned' };
    if (t.includes('UPDATE')) return { color: 'text-sky-600 bg-sky-50', icon: 'Activity', label: 'Lead Updated' };
    return { color: 'text-slate-600 bg-slate-50', icon: 'Activity', label: (type || 'Activity').replace(/_/g, ' ') };
  };

  const resolveIntIcon = (iconName) => {
    switch (iconName) {
      case 'MessageSquare': return <MessageSquare className="h-4 w-4" />;
      case 'Calendar': return <Calendar className="h-4 w-4" />;
      case 'Check': return <Check className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  if (!lead) return <div className="text-center py-10">Loading Details...</div>;

  const totalPax = (parseInt(lead.adults || 1)) + (parseInt(lead.kids || 0));
  const pkgAmt = parseFloat(lead.package_amount || 0);
  const paidAmt = parseFloat(lead.paid_amount || 0);
  const pendAmt = lead.pending_amount !== null && lead.pending_amount !== undefined ? parseFloat(lead.pending_amount) : Math.max(0, pkgAmt - paidAmt);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-600 mb-2">
        <Link to="/leads" className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Leads
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-slate-800">Lead Details</span>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700">{lead.lead_number}</span>
              <div className="flex items-center gap-3 mt-1">
                <h1 className="text-2xl font-extrabold text-gray-900 leading-none">{lead.client_name}</h1>
                <StatusBadge status={lead.status} />
              </div>
              <p className="text-xs text-gray-500 mt-1.5 font-semibold">
                Source: <span className="text-slate-800">{lead.lead_source || 'N/A'}</span> • Created on: <span className="text-slate-800">{new Date(lead.created_at || lead.createdAt).toLocaleString()}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setFollowOpen(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer"
            >
              <Calendar className="h-4 w-4 text-blue-100" />
              <span>Schedule Follow-up</span>
            </button>

            {lead.status !== 'CONVERTED' ? (
              canCreateCase && (
                <button
                  onClick={openConvertModal}
                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer"
                >
                  <FolderPlus className="h-4 w-4 text-emerald-100" />
                  <span>Convert To Case</span>
                </button>
              )
            ) : (
              <span className="px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs rounded-xl flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" /> Converted
              </span>
            )}

            <button
              onClick={() => setNoteOpen(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer"
            >
              <MessageSquare className="h-4 w-4 text-purple-100" />
              <span>Change status</span>
            </button>

            <button
              onClick={() => navigate(`/leads/edit/${lead.id}`)}
              className="px-4 py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer"
            >
              <User className="h-4 w-4 text-slate-300" />
              <span>Edit Profile</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 pt-6 border-t border-gray-100 w-full">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Mobile Number</p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-sm text-slate-800 font-bold">{lead.mobile || 'N/A'}</p>
                {lead.mobile && (
                  <WhatsAppButton phone={lead.mobile} />
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Email Address</p>
              <p className="text-sm text-slate-800 font-bold mt-0.5 truncate max-w-[180px]" title={lead.email}>{lead.email || 'N/A'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Nationality</p>
              <p className="text-sm text-slate-800 font-bold mt-0.5">{lead.nationality || lead.country || 'N/A'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Pax Count</p>
              <p className="text-sm text-slate-800 font-bold mt-0.5">{totalPax} Total ({lead.adults || 1} A, {lead.kids || 0} K)</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Counselor</p>
              <p className="text-sm text-slate-800 font-bold mt-0.5">{lead.counselor?.name || 'Unassigned'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <Card title="Lead Details & Financial Deal Overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Service Requested / Category</p>
                <p className="text-slate-800 font-bold mt-1 text-sm">{lead.service_required || 'N/A'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-9 w-9 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <DollarSign className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Package Amount</p>
                <p className="text-slate-800 font-bold mt-1 text-sm">{formatAED(pkgAmt)}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-9 w-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Paid Amount & Payment Date</p>
                <p className="text-slate-800 font-bold mt-1 text-sm">
                  {formatAED(paidAmt)} {lead.payment_date ? `(Paid on ${lead.payment_date})` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="h-9 w-9 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Pending Balance</p>
                <p className={`font-bold mt-1 text-sm ${pendAmt > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {formatAED(pendAmt)}
                </p>
              </div>
            </div>

            {canManageProfit && (
              <div className="flex items-start gap-3 md:col-span-2 bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-100">
                <div className="h-9 w-9 bg-emerald-600 text-white rounded-lg flex items-center justify-center flex-shrink-0">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-emerald-800 font-bold uppercase tracking-wider">Profit Margin (Admin & Manager Only)</p>
                  <p className="text-emerald-950 font-extrabold mt-0.5 text-base">
                    {lead.profit !== null && lead.profit !== undefined ? formatAED(lead.profit) : 'Not set'}
                  </p>
                </div>
              </div>
            )}

            <div className="md:col-span-2">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Notes & Special Instructions</p>
              <p className="text-slate-800 font-medium mt-1 text-sm bg-slate-50 p-3 rounded-lg border border-gray-100">
                {lead.notes || lead.requirement_details || 'No additional notes logged.'}
              </p>
            </div>
          </div>
        </Card>

        <Card title="Activity & Interactions History">
          {interactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              <Activity className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              No logged interactions yet.
            </div>
          ) : (
            <div>
              <div className="relative pl-6 border-l border-slate-100 space-y-6 mt-2 ml-3">
                {(showAllLogs ? interactions : interactions.slice(0, 5)).map((item) => {
                  const details = getInteractionDetails(item.interaction_type);
                  const rawDate = item.interaction_date || item.createdAt || item.created_at;
                  let dateObj = rawDate ? new Date(rawDate) : new Date();
                  if (isNaN(dateObj.getTime())) dateObj = new Date();

                  const dStr = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
                  const tStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

                  return (
                    <div key={item.id} className="relative flex items-start justify-between gap-4 py-1">
                      <div className={`absolute -left-[38px] top-0.5 h-7 w-7 rounded-full flex items-center justify-center border-4 border-white shadow-sm ${details.color}`}>
                        {resolveIntIcon(details.icon)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-extrabold text-slate-900 text-sm">{details.label}</p>
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-100 text-slate-600 uppercase tracking-wider">{item.interaction_type}</span>
                          {item.User?.name && (
                            <span className="text-xs text-slate-500 font-medium">• By: <strong className="text-slate-800">{item.User.name}</strong></span>
                          )}
                        </div>
                        <p className="text-sm text-slate-700 font-medium mt-1.5 leading-relaxed">{item.notes}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-slate-800 font-bold">{dStr}</p>
                        <p className="text-[11px] text-gray-500 font-semibold mt-0.5">{tStr}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {interactions.length > 5 && (
                <div className="mt-4 pt-3 border-t border-slate-100 text-center">
                  <button
                    onClick={() => setShowAllLogs(!showAllLogs)}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                  >
                    {showAllLogs ? 'Show Recent Logs (5)' : `Show All Logs (${interactions.length})`}
                  </button>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* CONVERT TO CASE MODAL */}
      <Modal isOpen={convertOpen} onClose={() => setConvertOpen(false)} title="Convert Lead to Active Case">
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            Assign unique File ID, package amount, payment details, pax count, and notes for this case file.
          </p>

          <Input label="Unique File ID / Case Number *" id="conv_case_number" value={convCaseNumber} onChange={(e) => setConvCaseNumber(e.target.value)} placeholder="e.g. FILE-1005 or CASE-1005" />
          <CountrySelect label="Nationality" id="conv_nationality" value={convNationality} onChange={(val) => setConvNationality(val)} />
          <Input label="Required Service / Category" id="conv_service" value={convService} onChange={(e) => setConvService(e.target.value)} />

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Adults</label>
              <input
                type="number"
                min="0"
                value={convAdults}
                onChange={(e) => setConvAdults(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Kids</label>
              <input
                type="number"
                min="0"
                value={convKids}
                onChange={(e) => setConvKids(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Total Pax</label>
              <input
                type="number"
                readOnly
                value={(parseInt(convAdults || 0) + parseInt(convKids || 0))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100 font-bold"
              />
            </div>
          </div>

          {parseFloat(lead?.paid_amount || 0) > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-blue-900 block">Already Paid on Lead Creation</span>
                <span className="text-[11px] text-blue-700 block">This initial token payment will be linked to the new Case ledger.</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-extrabold text-blue-900 block">{formatAED(lead.paid_amount)}</span>
                {lead.payment_date && <span className="text-[10px] text-blue-600 font-semibold block">Date: {lead.payment_date}</span>}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Total Package Amount (AED)</label>
              <input
                type="number"
                step="0.01"
                value={convPkgAmount}
                onChange={(e) => setConvPkgAmount(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">New Additional Payment (AED)</label>
              <input
                type="number"
                step="0.01"
                value={convNewPaymentAmount}
                onChange={(e) => setConvNewPaymentAmount(e.target.value)}
                placeholder="0.00 (Optional)"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Date (For New Payment)</label>
              <input
                type="date"
                value={convPaymentDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setConvPaymentDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Pending Amount (AED)</label>
              <input
                type="number"
                readOnly
                value={(() => {
                  const calc = Math.max(0, parseFloat(convPkgAmount || 0) - parseFloat(lead?.paid_amount || 0) - parseFloat(convNewPaymentAmount || 0));
                  return calc % 1 === 0 ? calc : calc.toFixed(2);
                })()}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100 font-bold text-amber-700"
              />
            </div>
          </div>

          {canManageProfit && (
            <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
              <label className="block text-xs font-bold text-emerald-800 mb-1">Profit Amount (AED) - Admin/Manager Only</label>
              <input
                type="number"
                step="0.01"
                value={convProfit}
                onChange={(e) => setConvProfit(e.target.value)}
                placeholder="Enter net profit amount..."
                className="w-full px-3 py-2 border border-emerald-300 rounded-lg text-sm bg-white font-bold text-emerald-950"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Notes / Instructions</label>
            <textarea
              value={convNotes}
              onChange={(e) => setConvNotes(e.target.value)}
              rows="3"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
              placeholder="Add conversion notes..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setConvertOpen(false)}>Cancel</Button>
            <Button onClick={handleConfirmConvert}>Confirm & Convert to Case</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={noteOpen} onClose={() => setNoteOpen(false)} title="Log Contact Interaction">
        <div className="space-y-4">
          <Select
            label="Transition Lead Status"
            id="note_status"
            options={[
              { value: '', label: 'Keep current status' },
              { value: 'INTERESTED', label: 'INTERESTED' },
              { value: 'FOLLOW_UP', label: 'FOLLOW UP' },
              { value: 'COLD_LEAD', label: 'COLD LEAD' },
              { value: 'NOT_INTERESTED', label: 'NOT INTERESTED' }
            ]}
            value={noteStatus}
            onChange={(e) => setNoteStatus(e.target.value)}
          />
          <Input
            label="Call Notes / Summary"
            id="notes"
            value={noteVal}
            onChange={(e) => setNoteVal(e.target.value)}
            placeholder="Discussed immigration requirements..."
          />
          <Button onClick={handleAddInteraction} className="w-full">Save Note</Button>
        </div>
      </Modal>

      <Modal isOpen={followOpen} onClose={() => setFollowOpen(false)} title="Schedule Next Follow-Up">
        <div className="space-y-4">
          <Input
            label="Target Follow-Up Date"
            id="follow_date"
            type="date"
            value={followDate}
            onChange={(e) => setFollowDate(e.target.value)}
          />
          <Input
            label="Task Notes / Reminders"
            id="follow_notes"
            value={followNotes}
            onChange={(e) => setFollowNotes(e.target.value)}
            placeholder="Call to verify statement attachment..."
          />
          <Button onClick={handleAddFollowup} className="w-full">Schedule Task</Button>
        </div>
      </Modal>
    </div>
  );
};

export const LeadForm = () => {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState(null);
  const [packagesList, setPackagesList] = useState([]);
  const [counselorsList, setCounselorsList] = useState([]);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      nationality: 'United Arab Emirates',
      country: 'United Arab Emirates',
      mobile: '+971',
      adults: 1,
      kids: 0,
      total_pax: 1
    }
  });

  const canManageProfit = user?.role === 'ADMIN' || user?.role === 'LEAD_MANAGER';

  useEffect(() => {
    axios.get('/api/v1/packages')
      .then(res => setPackagesList(res.data.data || []))
      .catch(() => {});

    if (canManageProfit) {
      axios.get('/api/v1/users')
        .then(res => setCounselorsList((res.data.data || []).filter(u => u.role === 'COUNSELOR')))
        .catch(() => {});
    }
  }, [canManageProfit]);

  const adultsVal = watch('adults');
  const kidsVal = watch('kids');
  const pkgVal = watch('package_amount');
  const paidVal = watch('paid_amount');
  const mobileVal = watch('mobile');
  const nationalityVal = watch('nationality');

  useEffect(() => {
    register('mobile');
    register('nationality');
    register('country');
  }, [register]);

  useEffect(() => {
    const tot = parseInt(adultsVal || 0) + parseInt(kidsVal || 0);
    setValue('total_pax', tot);
  }, [adultsVal, kidsVal, setValue]);

  useEffect(() => {
    const pend = Math.max(0, parseFloat(pkgVal || 0) - parseFloat(paidVal || 0));
    setValue('pending_amount', pend);
  }, [pkgVal, paidVal, setValue]);

  useEffect(() => {
    if (id) {
      axios.get(`/api/v1/leads/${id}`).then(res => {
        const d = res.data.data;
        if (d.country && !d.nationality) d.nationality = d.country;
        if (!d.country && d.nationality) d.country = d.nationality;
        reset(d);
      });
    }
  }, [id, reset]);

  const onSubmit = (data) => {
    setErrorMsg(null);
    if (!canManageProfit) {
      delete data.profit;
    }

    if (!isValidPhone(data.mobile)) {
      setErrorMsg('Please enter a valid mobile number (must contain numbers only, 7 to 15 digits).');
      return;
    }

    if (data.email && !isValidEmail(data.email)) {
      setErrorMsg('Please enter a valid email address (e.g. client@example.com).');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    if (data.payment_date && data.payment_date > todayStr) {
      setErrorMsg('Payment date cannot be greater than the current date.');
      return;
    }

    const action = id ? axios.put(`/api/v1/leads/${id}`, data) : axios.post('/api/v1/leads', data);
    action.then(() => {
      navigate('/leads');
    }).catch(err => {
      const msg = err.response?.data?.message || 'Submission failed. Please check the entered fields.';
      setErrorMsg(msg);
    });
  };

  return (
    <div className="mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
          <Link to="/leads" className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Leads
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-slate-800">{id ? 'Edit Lead Profile' : 'Create Lead Profile'}</span>
        </div>
        <button
          type="button"
          onClick={() => navigate(id ? `/leads/${id}` : '/leads')}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 bg-white border border-gray-200 px-3.5 py-2 rounded-xl shadow-sm hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 text-slate-500" /> Back
        </button>
      </div>

      <Card title={id ? 'Edit Lead Profile' : 'Create New Lead Profile'}>
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {errorMsg && (
            <div className="md:col-span-2 bg-red-50 border border-red-200 text-red-800 p-3.5 rounded-xl text-xs font-bold flex items-center justify-between">
              <span>⚠️ {errorMsg}</span>
              <button type="button" onClick={() => setErrorMsg(null)} className="text-red-600 hover:text-red-900 font-extrabold ml-2">✕</button>
            </div>
          )}
          <Input label="Client Name *" id="client_name" register={register} errors={errors} required />
          <CountrySelect
            label="Nationality"
            id="nationality"
            value={nationalityVal || ''}
            onChange={(countryName) => {
              setValue('nationality', countryName, { shouldValidate: true });
              setValue('country', countryName);
            }}
            onSelectCountry={(country) => {
              setValue('nationality', country.name, { shouldValidate: true });
              setValue('country', country.name);

              // Auto attach dial code to mobile number according to selected country
              const currentMobile = watch('mobile') || '';
              let digitsOnly = '';
              if (currentMobile.startsWith('+')) {
                const sortedCountries = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
                const matched = sortedCountries.find(c => currentMobile.startsWith(c.dialCode));
                if (matched) {
                  digitsOnly = currentMobile.slice(matched.dialCode.length).replace(/\D/g, '');
                } else {
                  digitsOnly = currentMobile.replace(/\D/g, '');
                }
              } else {
                digitsOnly = currentMobile.replace(/\D/g, '');
              }

              const updatedMobile = digitsOnly ? `${country.dialCode}${digitsOnly}` : `${country.dialCode}`;
              setValue('mobile', updatedMobile, { shouldValidate: true });
            }}
            errors={errors}
          />
          <Input
            label="Email Address"
            id="email"
            type="email"
            placeholder="client@example.com"
            register={register}
            errors={errors}
          />
          <PhoneInput
            label="Mobile Number *"
            id="mobile"
            value={mobileVal || ''}
            onChange={(fullNum) => setValue('mobile', fullNum, { shouldValidate: true })}
            onCountryChange={(c) => {
              setValue('nationality', c.name, { shouldValidate: true });
              setValue('country', c.name);
            }}
            errors={errors}
            required
          />
          <Select
            label="Required Product / Service *"
            id="service_required"
            register={register}
            errors={errors}
            options={[
              { value: '', label: 'Select Product / Service...' },
              ...packagesList.map(p => ({ value: p.name, label: `${p.name}${p.amount ? ` (AED ${parseFloat(p.amount).toLocaleString()})` : ''}` }))
            ]}
            onChange={(e) => {
              const selectedVal = e.target.value;
              setValue('service_required', selectedVal);
              const foundPkg = packagesList.find(p => p.name === selectedVal);
              if (foundPkg && foundPkg.amount) {
                setValue('package_amount', foundPkg.amount);
              }
            }}
          />
          <Input label="Lead Source" id="lead_source" register={register} errors={errors} placeholder="e.g. Website / Referral" />

          {canManageProfit && (
            <Select
              label="Assign Sales Team Member"
              id="counselor_id"
              register={register}
              errors={errors}
              options={[
                { value: '', label: 'Unassigned' },
                ...counselorsList.map(c => ({ value: c.id, label: c.name }))
              ]}
            />
          )}

          <div className="grid grid-cols-3 gap-3 md:col-span-2 bg-slate-50 p-4 rounded-xl border border-gray-200">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Adults Count</label>
              <input
                type="number"
                min="0"
                {...register('adults')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Kids Count</label>
              <input
                type="number"
                min="0"
                {...register('kids')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Total Pax</label>
              <input
                type="number"
                readOnly
                {...register('total_pax')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:col-span-2 bg-slate-50 p-4 rounded-xl border border-gray-200">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Total Package Amount (AED)</label>
              <input
                type="number"
                step="0.01"
                {...register('package_amount')}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Paid Amount (AED)</label>
              <input
                type="number"
                step="0.01"
                {...register('paid_amount')}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Payment Date</label>
              <input
                type="date"
                max={new Date().toISOString().split('T')[0]}
                {...register('payment_date')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Pending Amount (AED)</label>
              <input
                type="number"
                readOnly
                {...register('pending_amount')}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100 font-bold text-amber-700"
              />
            </div>
          </div>

          {canManageProfit && (
            <div className="md:col-span-2 bg-emerald-50 p-4 rounded-xl border border-emerald-200">
              <label className="block text-xs font-bold text-emerald-800 mb-1">Profit Amount (AED) - Admin & Lead Manager Only</label>
              <input
                type="number"
                step="0.01"
                {...register('profit')}
                placeholder="Enter net profit..."
                className="w-full px-3 py-2 border border-emerald-300 rounded-lg text-sm bg-white font-bold text-emerald-950"
              />
            </div>
          )}

          <div className="md:col-span-2">
            <Input label="Notes & Special Requirements" id="notes" register={register} errors={errors} placeholder="Add notes or custom requirements..." />
          </div>

          <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" type="button" onClick={() => navigate(id ? `/leads/${id}` : '/leads')}>Cancel</Button>
            <Button type="submit">Save Profile</Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export const LeadImportWizard = () => {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [strategy, setStrategy] = useState('SKIP_DUPLICATE');
  const navigate = useNavigate();

  const handleUpload = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      setFile(selected);
      const fd = new FormData();
      fd.append('file', selected);

      const endpoint = selected.name.endsWith('.pdf') ? '/api/v1/leads/import/pdf' : '/api/v1/leads/import/parse';

      axios.post(endpoint, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      }).then(res => {
        setPreview(res.data.data);
        setStep(2);
      }).catch(err => {
        alert(err.response?.data?.message || 'Failed to parse file');
      });
    }
  };

  const handleConfirm = () => {
    axios.post('/api/v1/leads/import/confirm', {
      file_name: preview.file_name,
      file_type: preview.file_type,
      rows: preview.rows,
      duplicate_strategy: strategy
    }).then(() => {
      navigate('/leads');
    }).catch(err => {
      alert(err.response?.data?.message || 'Confirm import failed');
    });
  };

  return (
    <div className="mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Import Leads Wizard</h1>

      {step === 1 && (
        <Card title="Step 1: Upload Spreadsheets or PDF">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-10 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 cursor-pointer relative">
            <input type="file" onChange={handleUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
            <Upload className="h-10 w-10 text-gray-400 mb-4 animate-bounce" />
            <p className="text-sm font-semibold text-gray-700">Drag and drop file here, or click to browse</p>
            <p className="text-xs text-gray-400 mt-1">Supports Excel (.xlsx, .xls), CSV (.csv) or PDF (.pdf)</p>
          </div>
        </Card>
      )}

      {step === 2 && preview && (
        <Card title="Step 2: Preview & Validation Check">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card className="text-center p-4">
              <p className="text-xs text-gray-500 font-medium">Total Rows</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{preview.total_rows}</p>
            </Card>
            <Card className="text-center p-4 bg-emerald-50 border-emerald-100">
              <p className="text-xs text-emerald-600 font-medium">Valid Rows</p>
              <p className="text-2xl font-bold text-emerald-950 mt-1">{preview.valid_rows}</p>
            </Card>
            <Card className="text-center p-4 bg-red-50 border-red-100">
              <p className="text-xs text-red-600 font-medium">Invalid Rows</p>
              <p className="text-2xl font-bold text-red-950 mt-1">{preview.invalid_rows}</p>
            </Card>
            <Card className="text-center p-4 bg-amber-50 border-amber-100">
              <p className="text-xs text-amber-600 font-medium">Duplicate Rows</p>
              <p className="text-2xl font-bold text-amber-950 mt-1">{preview.duplicate_rows}</p>
            </Card>
          </div>

          <div className="mb-6 p-4 border border-gray-200 rounded-md">
            <Select
              label="Select Duplicate Strategy"
              id="strategy"
              options={[
                { value: 'SKIP_DUPLICATE', label: 'Skip duplicate rows (Ignore matches)' },
                { value: 'UPDATE_EXISTING', label: 'Update existing lead matches with import details' },
                { value: 'IMPORT_AS_NEW', label: 'Import all rows as brand new records' }
              ]}
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
            />
          </div>

          <DataTable
            headers={['Row', 'Name', 'Phone', 'Email', 'Source', 'Validation', 'Duplicate']}
            rows={preview.rows.slice(0, 10).map(r => [
              r.row_index,
              r.data.client_name || <span className="text-red-500 italic">Missing</span>,
              r.data.mobile || <span className="text-red-500 italic">Missing</span>,
              r.data.email || 'N/A',
              r.data.lead_source || 'N/A',
              r.valid ? <span className="text-xs text-green-600 font-medium">PASS</span> : <span className="text-xs text-red-600 font-medium">FAIL ({r.errors.join(', ')})</span>,
              r.duplicate ? <span className="text-xs text-amber-600 font-medium">MATCH</span> : <span className="text-xs text-gray-400">UNIQUE</span>
            ])}
          />
          {preview.rows.length > 10 && (
            <p className="text-xs text-gray-400 text-center mt-3">Previewing first 10 rows of {preview.total_rows}</p>
          )}

          <div className="flex justify-end gap-3 mt-6 border-t border-gray-100 pt-4">
            <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={handleConfirm}>Import Leads</Button>
          </div>
        </Card>
      )}
    </div>
  );
};
