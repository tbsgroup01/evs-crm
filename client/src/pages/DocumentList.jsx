import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Search, Upload, Download, Eye, MoreVertical, FileText, CheckCircle2, ShieldCheck, Files, Image, File, Check, X, AlertCircle } from 'lucide-react';
import { Modal } from '../components/Modal';
import { AuthContext } from '../App';

export const DocumentList = () => {
  const { user } = useContext(AuthContext);
  const [docs, setDocs] = useState([]);
  const [cases, setCases] = useState([]);
  const [docTypes, setDocTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Upload modal state
  const [openUpload, setOpenUpload] = useState(false);
  const [caseSel, setCaseSel] = useState('');
  const [docTypeSel, setDocTypeSel] = useState('');
  const [docFile, setDocFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Filters state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [caseFilter, setCaseFilter] = useState('');

  // Status Action Menu
  const [activeMenuId, setActiveMenuId] = useState(null);

  useEffect(() => {
    fetchDocuments();
    axios.get('/api/v1/cases').then(res => setCases(res.data.data.cases || []));
    axios.get('/api/v1/document-types').then(res => setDocTypes(res.data.data || []));
  }, []);

  const fetchDocuments = () => {
    setLoading(true);
    axios.get('/api/v1/documents')
      .then(res => setDocs(res.data.data || []))
      .catch(err => console.error('Failed to fetch documents:', err))
      .finally(() => setLoading(false));
  };

  const handleUpload = () => {
    if (!docFile || !caseSel || !docTypeSel) {
      alert('Please select a Case file, Document Category, and a file to upload');
      return;
    }

    setUploading(true);
    const fd = new FormData();
    fd.append('file', docFile);
    fd.append('case_id', caseSel);
    fd.append('document_type_id', docTypeSel);

    axios.post('/api/v1/documents/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(() => {
      setDocFile(null);
      setCaseSel('');
      setDocTypeSel('');
      setOpenUpload(false);
      fetchDocuments();
    }).catch(err => {
      alert(err.response?.data?.message || 'Failed upload');
    }).finally(() => {
      setUploading(false);
    });
  };

  const handleVerify = (id, newStatus) => {
    setActiveMenuId(null);
    axios.patch(`/api/v1/documents/${id}/status`, { status: newStatus })
      .then(() => fetchDocuments())
      .catch(err => alert(err.response?.data?.message || 'Verification update failed'));
  };

  const handleDownload = (id, fileName) => {
    axios.get(`/api/v1/documents/${id}/download`, { responseType: 'blob' })
      .then(res => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
      })
      .catch(() => {
        alert('Failed to download file');
      });
  };

  const handleViewFile = (id) => {
    const token = localStorage.getItem('token');
    if (token) {
      window.open(`/api/v1/documents/${id}/download?token=${token}`, '_blank');
    } else {
      axios.get(`/api/v1/documents/${id}/download`, { responseType: 'blob' })
        .then(res => {
          const blobType = res.headers['content-type'] || 'image/png';
          const blob = new Blob([res.data], { type: blobType });
          const url = window.URL.createObjectURL(blob);
          window.open(url, '_blank');
        })
        .catch(() => {
          alert('Failed to open file preview');
        });
    }
  };

  const filteredDocs = docs.filter(d => {
    const searchLower = search.trim().toLowerCase();
    const matchesSearch = !searchLower ||
      (d.file_name && d.file_name.toLowerCase().includes(searchLower)) ||
      (d.Case?.case_number && d.Case.case_number.toLowerCase().includes(searchLower)) ||
      (d.uploader?.name && d.uploader.name.toLowerCase().includes(searchLower));

    const matchesStatus = statusFilter ? d.status === statusFilter : true;
    const matchesType = typeFilter ? String(d.document_type_id) === typeFilter : true;
    const matchesCase = caseFilter ? String(d.case_id) === caseFilter : true;

    return matchesSearch && matchesStatus && matchesType && matchesCase;
  });

  // KPI Metrics Calculations
  const totalDocsCount = docs.length;
  const uploadedCount = docs.filter(d => d.status === 'UPLOADED' || !d.status).length;
  const verifiedCount = docs.filter(d => d.status === 'VERIFIED').length;
  const pendingCount = docs.filter(d => d.status === 'PENDING').length;

  const getDocIcon = (index, fileNameStr) => {
    const ext = (fileNameStr || '').split('.').pop().toLowerCase();
    if (['png', 'jpg', 'jpeg', 'svg', 'webp'].includes(ext)) {
      return { Icon: Image, bg: 'bg-emerald-50 text-emerald-600' };
    }
    if (['pdf', 'doc', 'docx'].includes(ext)) {
      return { Icon: FileText, bg: 'bg-blue-50 text-blue-600' };
    }
    const styles = [
      { Icon: FileText, bg: 'bg-blue-50 text-blue-600' },
      { Icon: Image, bg: 'bg-emerald-50 text-emerald-600' },
      { Icon: File, bg: 'bg-amber-50 text-amber-600' },
      { Icon: ShieldCheck, bg: 'bg-emerald-50 text-emerald-600' }
    ];
    return styles[index % styles.length];
  };

  const getTypeBadgeStyle = (typeNameStr) => {
    const name = (typeNameStr || '').toLowerCase();
    if (name.includes('contract')) return 'bg-blue-50 text-blue-600';
    if (name.includes('licence') || name.includes('license')) return 'bg-emerald-50 text-emerald-600';
    if (name.includes('form')) return 'bg-amber-50 text-amber-600';
    return 'bg-purple-50 text-purple-600';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'PNG • 45.2 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '1 Sep 2026, 03:35 PM';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dateFormatted = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    const timeFormatted = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${dateFormatted}, ${timeFormatted}`;
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Global Documents Checklist</h1>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">Total Uploaded Documents: {totalDocsCount}</p>
          </div>
        </div>
        <button
          onClick={() => setOpenUpload(true)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 transition-all self-start sm:self-auto"
        >
          <Upload className="h-4 w-4" /> Upload Document
        </button>
      </div>

      {/* KPI METRICS CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Documents */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <span className="text-2xl font-bold text-slate-900 block leading-none">{totalDocsCount}</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mt-1.5">Total Documents</span>
            <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">All uploaded documents</span>
          </div>
        </div>

        {/* Card 2: Uploaded */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <span className="text-2xl font-bold text-slate-900 block leading-none">{uploadedCount}</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mt-1.5">Uploaded</span>
            <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">Successfully uploaded</span>
          </div>
        </div>

        {/* Card 3: Verified */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <span className="text-2xl font-bold text-slate-900 block leading-none">{verifiedCount}</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mt-1.5">Verified</span>
            <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">Documents verified</span>
          </div>
        </div>

        {/* Card 4: Pending */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 flex-shrink-0">
            <Files className="h-6 w-6" />
          </div>
          <div>
            <span className="text-2xl font-bold text-slate-900 block leading-none">{pendingCount}</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mt-1.5">Pending</span>
            <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">Awaiting review</span>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTERS BAR */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by file name or case..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-600 bg-white"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-48 px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-700 focus:outline-none"
          >
            <option value="">Filter by Status</option>
            <option value="UPLOADED">UPLOADED</option>
            <option value="VERIFIED">VERIFIED</option>
            <option value="PENDING">PENDING</option>
            <option value="REJECTED">REJECTED</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full md:w-48 px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-700 focus:outline-none"
          >
            <option value="">Filter by Type</option>
            {docTypes.map(dt => (
              <option key={dt.id} value={dt.id}>{dt.name}</option>
            ))}
          </select>
          <select
            value={caseFilter}
            onChange={(e) => setCaseFilter(e.target.value)}
            className="w-full md:w-48 px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white text-slate-700 focus:outline-none"
          >
            <option value="">Filter by Case</option>
            {cases.map(c => (
              <option key={c.id} value={c.id}>{c.case_number}</option>
            ))}
          </select>
        </div>
      </div>

      {/* DATA TABLE CONTAINER */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">No Documents Found</h3>
            <p className="text-sm text-slate-400 mt-1">Upload a document or adjust your search filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full border border-slate-100 rounded-xl min-h-[220px] pb-10">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-blue-50/50 text-blue-900 font-bold uppercase text-xs tracking-wider border-b border-blue-100">
                  <th className="px-6 py-4">CASE FILE ↕</th>
                  <th className="px-6 py-4">TYPE ↕</th>
                  <th className="px-6 py-4">FILE NAME ↕</th>
                  <th className="px-6 py-4">UPLOADED BY ↕</th>
                  <th className="px-6 py-4">STATUS ↕</th>
                  <th className="px-6 py-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDocs.map((doc, idx) => {
                  const { Icon, bg } = getDocIcon(idx, doc.file_name);
                  const typeBadgeBg = getTypeBadgeStyle(doc.DocumentType?.name);
                  const status = (doc.status || 'UPLOADED').toUpperCase();

                  let statusPill = (
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-100/60 inline-flex items-center gap-1.5 uppercase">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      UPLOADED
                    </span>
                  );
                  if (status === 'VERIFIED') {
                    statusPill = (
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100/60 inline-flex items-center gap-1.5 uppercase">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        VERIFIED
                      </span>
                    );
                  } else if (status === 'REJECTED') {
                    statusPill = (
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-600 border border-red-100/60 inline-flex items-center gap-1.5 uppercase">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        REJECTED
                      </span>
                    );
                  } else if (status === 'PENDING') {
                    statusPill = (
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-600 border border-amber-100/60 inline-flex items-center gap-1.5 uppercase">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        PENDING
                      </span>
                    );
                  }

                  const extUpper = (doc.file_name || '').split('.').pop().toUpperCase() || 'PNG';
                  const uploaderName = doc.uploader?.name || 'counselor1';
                  const uploaderLetter = uploaderName.charAt(0).toUpperCase();

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* CASE FILE */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3.5">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <span className="font-bold text-slate-800 text-sm">{doc.Case?.case_number || 'N/A'}</span>
                        </div>
                      </td>

                      {/* TYPE */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3.5 py-1 rounded-full text-xs font-semibold inline-block ${typeBadgeBg}`}>
                          {doc.DocumentType?.name || 'Standard Doc'}
                        </span>
                      </td>

                      {/* FILE NAME */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleDownload(doc.id, doc.file_name)}
                          className="text-blue-600 font-bold text-sm hover:underline block text-left"
                        >
                          {doc.file_name}
                        </button>
                        <span className="text-slate-400 text-xs font-medium block mt-0.5">
                          {extUpper} • {formatFileSize(doc.file_size)}
                        </span>
                      </td>

                      {/* UPLOADED BY */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          {/* <div className="h-7 w-7 rounded-full bg-purple-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                            {uploaderLetter}
                          </div> */}
                          <div>
                            <span className="font-bold text-slate-800 text-xs block leading-tight">{uploaderName}</span>
                            <span className="text-slate-400 text-[10px] font-medium block mt-0.5">
                              {formatDateTime(doc.createdAt || doc.created_at)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* STATUS */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {statusPill}
                        {doc.verifier?.name && (
                          <span className="text-[10px] text-slate-500 font-medium block mt-1">
                            {status === 'VERIFIED' ? 'Verified' : 'Rejected'} by <span className="font-bold text-slate-700">{doc.verifier.name}</span>
                          </span>
                        )}
                        {doc.rejection_reason && (
                          <span className="text-[10px] text-red-600 font-medium block italic mt-0.5">
                            Reason: {doc.rejection_reason}
                          </span>
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td className="px-6 py-4 whitespace-nowrap text-right relative">
                        <div className="flex items-center justify-end gap-2">
                          {/* <button
                            onClick={() => handleViewFile(doc.id, doc.file_name)}
                            className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                            title="Preview File"
                          >
                            <Eye className="h-4 w-4" />
                          </button> */}
                          <button
                            onClick={() => handleDownload(doc.id, doc.file_name)}
                            className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                            title="Download File"
                          >
                            <Download className="h-4 w-4" />
                          </button>

                          {/* Options Menu Button (Admin Only) */}
                          {(user?.role?.name || user?.role) === 'ADMIN' && (
                            <div className="relative">
                              <button
                                onClick={() => setActiveMenuId(activeMenuId === doc.id ? null : doc.id)}
                                className="p-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
                                title="More Options"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>

                              {/* Dropdown Menu */}
                              {activeMenuId === doc.id && (
                                <div className={`absolute right-0 ${idx >= filteredDocs.length - 2 || filteredDocs.length <= 3 ? 'bottom-10' : 'top-10'} z-50 w-36 bg-white rounded-xl shadow-xl border border-slate-100 py-1 text-left`}>
                                  <button
                                    onClick={() => handleVerify(doc.id, 'VERIFIED')}
                                    className="w-full px-3 py-2 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 flex items-center gap-2"
                                  >
                                    <Check className="h-3.5 w-3.5" /> Mark Verified
                                  </button>
                                  <button
                                    onClick={() => handleVerify(doc.id, 'REJECTED')}
                                    className="w-full px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2"
                                  >
                                    <X className="h-3.5 w-3.5" /> Mark Rejected
                                  </button>
                                  <button
                                    onClick={() => handleVerify(doc.id, 'UPLOADED')}
                                    className="w-full px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 flex items-center gap-2 border-t border-slate-100"
                                  >
                                    Mark Uploaded
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION FOOTER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6 pt-4 border-t border-slate-100">
          <span className="text-xs text-slate-500 font-medium">
            Showing 1 to {filteredDocs.length} of {filteredDocs.length} entries
          </span>
          <div className="flex items-center gap-1">
            <button disabled className="p-1.5 border border-slate-200 rounded-lg text-slate-400 bg-slate-50 opacity-50 cursor-not-allowed">
              &lt;
            </button>
            <span className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs font-bold leading-none flex items-center justify-center h-8 min-w-8">
              1
            </span>
            <button disabled className="p-1.5 border border-slate-200 rounded-lg text-slate-400 bg-slate-50 opacity-50 cursor-not-allowed">
              &gt;
            </button>
          </div>
        </div>
      </div>

      {/* UPLOAD DOCUMENT MODAL */}
      <Modal
        isOpen={openUpload}
        onClose={() => setOpenUpload(false)}
        title="Upload Case Document"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Select Case File *</label>
            <select
              value={caseSel}
              onChange={(e) => setCaseSel(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-xl p-3 bg-white focus:ring-1 focus:ring-blue-600 focus:outline-none"
            >
              <option value="">Select Case file...</option>
              {cases.map(c => (
                <option key={c.id} value={c.id}>
                  {c.case_number} ({c.Lead?.client_name || 'Client'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Document Category *</label>
            <select
              value={docTypeSel}
              onChange={(e) => setDocTypeSel(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-xl p-3 bg-white focus:ring-1 focus:ring-blue-600 focus:outline-none"
            >
              <option value="">Select Category...</option>
              {docTypes.map(dt => (
                <option key={dt.id} value={dt.id}>{dt.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Select Document File *</label>
            <input
              type="file"
              onChange={(e) => setDocFile(e.target.files[0])}
              className="w-full text-sm border border-slate-200 rounded-xl p-2 bg-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              onClick={() => setOpenUpload(false)}
              className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all"
            >
              {uploading ? 'Uploading...' : 'Confirm Upload'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DocumentList;
