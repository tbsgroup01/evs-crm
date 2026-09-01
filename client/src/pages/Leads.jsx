import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { Plus, Download, Upload, Filter, Calendar, MessageSquare, Trash2, ArrowRight, Search, Users, Phone, Mail, MapPin, User, FolderPlus, ArrowLeft, Check, Activity, FileText, Eye, PlusCircle } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { AuthContext } from '../App';

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

  useEffect(() => {
    fetchLeads();
  }, [page, status, counselorFilter, search]);

  useEffect(() => {
    if (user?.role === 'ADMIN' || user?.role === 'LEAD_MANAGER') {
      axios.get('/api/v1/users').then(res => {
        setCounselors(res.data.data.filter(u => u.role === 'COUNSELOR'));
      });
    }
  }, [user]);

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
          {(user?.role === 'ADMIN' || user?.role === 'LEAD_MANAGER') && (
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
                <Trash2 className="h-4 w-4" /> Bulk Delete {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
              </button>
            </>
          )}
          <button onClick={() => navigate('/leads/new')} className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
            <Plus className="h-4 w-4" /> Create Lead
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl  p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Total Leads</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">{stats?.total || 0}</span>
          </div>
          <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <Users className="h-5 w-5" />
          </div>
        </div>
        <div className="bg-white rounded-xl  p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Assigned Leads</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">{stats?.assigned || 0}</span>
          </div>
          <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div className="bg-white rounded-xl  p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Unassigned Leads</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">{stats?.unassigned || 0}</span>
          </div>
          <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
        <div className="bg-white rounded-xl  p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block">Converted Leads</span>
            <span className="text-2xl font-bold text-slate-900 mt-1 block">
              {stats?.ratios?.converted || 0} <span className="text-xs text-slate-400 font-normal">({stats?.total > 0 ? ((stats.ratios.converted / stats.total) * 100).toFixed(0) : 0}%)</span>
            </span>
          </div>
          <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
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
              placeholder="Search name, mobile, email..."
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
          {(user?.role === 'ADMIN' || user?.role === 'LEAD_MANAGER') && (
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

      <div className="bg-white rounded-xl p-5 shadow-sm">
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
            sortHeader('NAME'),
            sortHeader('MOBILE'),
            sortHeader('EMAIL'),
            sortHeader('COUNSELOR'),
            sortHeader('STATUS'),
            'ACTIONS'
          ]}
          rows={leads.map(l => [
            <input
              type="checkbox"
              checked={selectedIds.includes(l.id)}
              onChange={() => toggleSelect(l.id)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />,
            l.lead_number,
            <Link to={`/leads/${l.id}`} className="text-blue-600 font-semibold hover:underline">{l.client_name}</Link>,
            l.mobile,
            l.email || 'N/A',
            (user?.role === 'ADMIN' || user?.role === 'LEAD_MANAGER') ? (
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
              {(user?.role === 'ADMIN' || user?.role === 'LEAD_MANAGER') && (
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
          ])}
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
  const [lead, setLead] = useState(null);
  const [interactions, setInteractions] = useState([]);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteVal, setNoteVal] = useState('');
  const [noteStatus, setNoteStatus] = useState('');
  const [followOpen, setFollowOpen] = useState(false);
  const [followDate, setFollowDate] = useState('');
  const [followNotes, setFollowNotes] = useState('');

  const [visibleHistory, setVisibleHistory] = useState(5);

  const navigate = useNavigate();

  useEffect(() => {
    fetchLeadDetails();
  }, [id]);

  const fetchLeadDetails = () => {
    axios.get(`/api/v1/leads/${id}`).then(res => setLead(res.data.data));
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

  const handleConvert = () => {
    axios.post(`/api/v1/leads/${id}/convert`).then(() => {
      navigate('/cases');
    }).catch(err => {
      alert(err.response?.data?.message || 'Conversion failed');
    });
  };

  const handleDownloadLead = () => {
    const content = `Lead Profile: ${lead.client_name}\nLead Number: ${lead.lead_number}\nMobile: ${lead.mobile}\nEmail: ${lead.email || 'N/A'}\nCountry: ${lead.country || 'N/A'}\nCity: ${lead.city || 'N/A'}\nService: ${lead.service_required || 'N/A'}\nStatus: ${lead.status}\nRequirement Details: ${lead.requirement_details || 'N/A'}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lead_${lead.lead_number}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getInteractionDetails = (type) => {
    const t = (type || '').toUpperCase();
    if (t.includes('NOTE')) return { color: 'text-amber-600 bg-amber-50', icon: 'MessageSquare', label: 'Note Added' };
    if (t.includes('FOLLOW')) return { color: 'text-blue-600 bg-blue-50', icon: 'Calendar', label: 'Follow-up Scheduled' };
    if (t.includes('CONVERT')) return { color: 'text-purple-600 bg-purple-50', icon: 'Check', label: 'Lead Converted' };
    return { color: 'text-slate-600 bg-slate-50', icon: 'Activity', label: type };
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-600 mb-2">
        <Link to="/leads" className="text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Leads
        </Link>
        <span className="text-gray-300">/</span>
        <span className="text-slate-800">Lead Details</span>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* <div className="h-16 w-16 rounded-xl bg-blue-50 text-blue-600 font-bold text-2xl flex items-center justify-center flex-shrink-0">
              {lead.client_name.charAt(0).toUpperCase()}
            </div> */}
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
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Calendar className="h-4 w-4 text-blue-100" />
              <span>Schedule Follow-up</span>
            </button>

            {lead.status !== 'CONVERTED' ? (
              <button
                onClick={handleConvert}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 cursor-pointer"
              >
                <FolderPlus className="h-4 w-4 text-emerald-100" />
                <span>Convert To Case</span>
              </button>
            ) : (
              <span className="px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs rounded-xl flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" /> Converted
              </span>
            )}

            <button
              onClick={() => setNoteOpen(true)}
              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-500/20 hover:shadow-lg hover:shadow-purple-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 cursor-pointer"
            >
              <MessageSquare className="h-4 w-4 text-purple-100" />
              <span>Change status</span>
            </button>

            <button
              onClick={() => navigate(`/leads/edit/${lead.id}`)}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md shadow-slate-900/10 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 cursor-pointer"
            >
              <User className="h-4 w-4 text-slate-300" />
              <span>Edit Profile</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-gray-100 w-full">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-50/70 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Mobile Number</p>
              <p className="text-sm text-slate-800 font-bold mt-0.5">{lead.mobile}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-50/70 text-blue-600 flex items-center justify-center flex-shrink-0">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Email Address</p>
              <p className="text-sm text-slate-800 font-bold mt-0.5 truncate max-w-[180px]" title={lead.email}>{lead.email || 'N/A'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-50/70 text-blue-600 flex items-center justify-center flex-shrink-0">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Country / City</p>
              <p className="text-sm text-slate-800 font-bold mt-0.5">{lead.country || 'N/A'}{lead.city ? `, ${lead.city}` : ''}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Lead Details Summary">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Service Requested</p>
                  <p className="text-slate-800 font-bold mt-1 text-sm">{lead.service_required || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-9 w-9 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Requirement Details</p>
                  <p className="text-slate-800 font-bold mt-1 text-sm max-h-24 overflow-y-auto pr-1">{lead.requirement_details || 'No additional requirements'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-9 w-9 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Owner Counselor</p>
                  <p className="text-slate-800 font-bold mt-1 text-sm">{lead.counselor ? lead.counselor.name : 'Unassigned'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="h-9 w-9 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Assigned On</p>
                  <p className="text-slate-800 font-bold mt-1 text-sm">
                    {lead.assigned_date ? new Date(lead.assigned_date).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
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
              <div className="relative pl-6 border-l border-slate-100 space-y-6 mt-2 ml-3">
                {interactions.slice(0, visibleHistory).map((item, idx) => {
                  const details = getInteractionDetails(item.interaction_type);
                  const dateObj = new Date(item.interaction_date || item.createdAt);
                  const dStr = dateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
                  const tStr = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

                  return (
                    <div key={item.id} className="relative flex items-start justify-between gap-4">
                      <div className={`absolute -left-9 top-0.5 h-6 w-6 rounded-full flex items-center justify-center border-4 border-white ${details.color}`}>
                        {resolveIntIcon(details.icon)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-800 text-xs">{details.label}</p>
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-50 text-slate-500 uppercase">{item.interaction_type}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.notes}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[10px] text-slate-700 font-semibold">{dStr}</p>
                        <p className="text-[9px] text-gray-400 font-semibold mt-0.5">{tStr}</p>
                      </div>
                      <div className="text-right text-[10px] text-gray-400 font-semibold flex-shrink-0 w-24 truncate" title={item.User?.name || 'System'}>
                        {item.User?.name || 'System'}
                      </div>
                    </div>
                  );
                })}

                {interactions.length > visibleHistory && (
                  <div className="text-center pt-2">
                    <button
                      onClick={() => setVisibleHistory(prev => prev + 5)}
                      className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                    >
                      View Full Activity &darr;
                    </button>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Process Status">
            <div className="relative pl-6 border-l border-slate-100 space-y-6 mt-2 ml-3">
              <div className="relative flex items-start gap-4">
                <div className="absolute -left-9 top-0.5 h-6 w-6 rounded-full flex items-center justify-center border-4 border-white bg-emerald-50 text-emerald-600">
                  <Check className="h-3 w-3" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-xs">New Lead</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Lead created successfully</p>
                </div>
                <span className="text-[9px] text-gray-400 font-semibold ml-auto">
                  {new Date(lead.created_at || lead.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="relative flex items-start gap-4">
                <div className={`absolute -left-9 top-0.5 h-6 w-6 rounded-full flex items-center justify-center border-4 border-white ${lead.status === 'CONVERTED' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'
                  }`}>
                  {lead.status === 'CONVERTED' ? <Check className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>}
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-xs">Converted</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {lead.status === 'CONVERTED' ? 'Lead converted to Case' : 'Conversion pending'}
                  </p>
                </div>
                {lead.status === 'CONVERTED' && (
                  <span className="text-[9px] text-gray-400 font-semibold ml-auto">
                    {new Date(lead.updated_at || lead.updatedAt).toLocaleDateString()}
                  </span>
                )}
              </div>

              <div className="relative flex items-start gap-4">
                <div className={`absolute -left-9 top-0.5 h-6 w-6 rounded-full flex items-center justify-center border-4 border-white ${lead.follow_up_date ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'
                  }`}>
                  {lead.follow_up_date ? <Check className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-slate-400"></span>}
                </div>
                <div>
                  <p className="font-bold text-slate-800 text-xs">Follow-up</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {lead.follow_up_date ? 'Next task scheduled' : 'No follow-up scheduled'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-emerald-50 rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">Next Follow-up</p>
                <p className="text-xs font-extrabold text-emerald-950 mt-0.5">
                  {lead.follow_up_date ? new Date(lead.follow_up_date).toLocaleDateString() : 'None Scheduled'}
                </p>
              </div>
              <button
                onClick={() => setFollowOpen(true)}
                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors"
              >
                Schedule Now
              </button>
            </div>
          </Card>

          <Card title="Additional Information">
            <div className="space-y-3.5 text-xs">
              <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-400 font-medium">Lead ID</span>
                <span className="font-bold text-slate-700 font-mono">{lead.lead_number}</span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-400 font-medium">Status</span>
                <StatusBadge status={lead.status} />
              </div>
              <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-400 font-medium">Created By</span>
                <span className="font-bold text-slate-700">{lead.counselor?.name || 'Super Admin User'}</span>
              </div>
              <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-400 font-medium">Created On</span>
                <span className="font-bold text-slate-700">{new Date(lead.created_at || lead.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400 font-medium">Last Updated</span>
                <span className="font-bold text-slate-700">{new Date(lead.updated_at || lead.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </Card>


        </div>
      </div>

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
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => {
    if (id) {
      axios.get(`/api/v1/leads/${id}`).then(res => {
        reset(res.data.data);
      });
    }
  }, [id]);

  const onSubmit = (data) => {
    setErrorMsg(null);
    const action = id ? axios.put(`/api/v1/leads/${id}`, data) : axios.post('/api/v1/leads', data);
    action.then(() => {
      navigate('/leads');
    }).catch(err => {
      const msg = err.response?.data?.message || 'Submission failed. Please check the entered fields.';
      setErrorMsg(msg);
    });
  };

  return (
    <div className=" mx-auto">
      <Card title={id ? 'Edit Lead Profile' : 'Create New Lead Profile'}>
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {errorMsg && (
            <div className="md:col-span-2 bg-red-50 border border-red-200 text-red-800 p-3.5 rounded-xl text-xs font-bold flex items-center justify-between">
              <span>⚠️ {errorMsg}</span>
              <button type="button" onClick={() => setErrorMsg(null)} className="text-red-600 hover:text-red-900 font-extrabold ml-2">✕</button>
            </div>
          )}
          <Input label="Client Name" id="client_name" register={register} errors={errors} required />
          <Input label="Mobile Number" id="mobile" register={register} errors={errors} required />
          <Input label="Email Address" id="email" type="email" register={register} errors={errors} />
          <Input label="Country" id="country" register={register} errors={errors} />
          <Input label="City" id="city" register={register} errors={errors} />
          <Input label="Required Service / Category" id="service_required" register={register} errors={errors} />
          <Input label="Lead Source" id="lead_source" register={register} errors={errors} />
          <Input label="Estimated Budget" id="estimated_budget" type="number" register={register} errors={errors} />
          <div className="md:col-span-2">
            <Input label="Requirement details" id="requirement_details" register={register} errors={errors} />
          </div>
          <div className="md:col-span-2 flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => navigate('/leads')}>Cancel</Button>
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
    <div className=" mx-auto space-y-6">
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
