import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Search, Upload } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Select } from '../components/Select';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { AuthContext } from '../App';

export const DocumentList = () => {
  const { user } = useContext(AuthContext);
  const [docs, setDocs] = useState([]);
  const [cases, setCases] = useState([]);
  const [docTypes, setDocTypes] = useState([]);
  const [open, setOpen] = useState(false);
  const [caseSel, setCaseSel] = useState('');
  const [docTypeSel, setDocTypeSel] = useState('');
  const [docFile, setDocFile] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [caseFilter, setCaseFilter] = useState('');

  useEffect(() => {
    fetchDocuments();
    axios.get('/api/v1/cases').then(res => setCases(res.data.data.cases || []));
    axios.get('/api/v1/document-types').then(res => setDocTypes(res.data.data || []));
  }, []);

  const fetchDocuments = () => {
    axios.get('/api/v1/documents').then(res => setDocs(res.data.data || []));
  };

  const handleUpload = () => {
    if (!docFile || !caseSel || !docTypeSel) return;
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
      setOpen(false);
      fetchDocuments();
    }).catch(err => {
      alert(err.response?.data?.message || 'Failed upload');
    });
  };

  const handleVerify = (id, newStatus) => {
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

  const sortHeader = (label) => (
    <div className="flex items-center gap-1 cursor-pointer select-none">
      <span>{label}</span>
      <span className="text-gray-400 text-xs">↕</span>
    </div>
  );

  const filteredDocs = docs.filter(d => {
    const matchesSearch = d.file_name?.toLowerCase().includes(search.toLowerCase()) || d.Case?.case_number?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter ? d.status === statusFilter : true;
    const matchesType = typeFilter ? String(d.document_type_id) === typeFilter : true;
    const matchesCase = caseFilter ? String(d.case_id) === caseFilter : true;
    return matchesSearch && matchesStatus && matchesType && matchesCase;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Global Documents Checklist</h1>
          <p className="text-sm text-gray-500 mt-1">Total Uploaded Documents: {filteredDocs.length}</p>
        </div>
        <button onClick={() => setOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
          <Upload className="h-4 w-4" /> Upload Document
        </button>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm ">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by file name or case..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-slate-500 bg-white"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-48 px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white text-gray-700 focus:outline-none"
          >
            <option value="">Filter by Status</option>
            <option value="PENDING">PENDING</option>
            <option value="VERIFIED">VERIFIED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full md:w-48 px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white text-gray-700 focus:outline-none"
          >
            <option value="">Filter by Type</option>
            {docTypes.map(dt => (
              <option key={dt.id} value={dt.id}>{dt.name}</option>
            ))}
          </select>
          <select
            value={caseFilter}
            onChange={(e) => setCaseFilter(e.target.value)}
            className="w-full md:w-48 px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white text-gray-700 focus:outline-none"
          >
            <option value="">Filter by Case</option>
            {cases.map(c => (
              <option key={c.id} value={c.id}>{c.case_number}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm ">
        <DataTable
          headers={[
            sortHeader('CASE FILE'),
            sortHeader('TYPE'),
            sortHeader('FILE NAME'),
            sortHeader('UPLOADED BY'),
            sortHeader('STATUS'),
            'ACTIONS'
          ]}
          rows={filteredDocs.map(d => [
            d.Case?.case_number,
            d.DocumentType?.name,
            <button onClick={() => handleDownload(d.id, d.file_name)} className="text-blue-600 font-semibold hover:underline text-left">
              {d.file_name}
            </button>,
            d.uploader?.name,
            <StatusBadge status={d.status} />,
            d.status === 'PENDING' && (user?.role === 'ADMIN' || user?.role === 'CASE_MANAGER' || user?.role === 'LEAD_MANAGER') ? (
              <div className="flex gap-1.5">
                <button onClick={() => handleVerify(d.id, 'VERIFIED')} className="px-2 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors">
                  Verify
                </button>
                <button onClick={() => handleVerify(d.id, 'REJECTED')} className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors">
                  Reject
                </button>
              </div>
            ) : (
              <span className="text-xs text-gray-400 font-semibold">Processed</span>
            )
          ])}
        />
      </div>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Upload Document File">
        <div className="space-y-4">
          <Select
            label="Select Case"
            id="case_sel"
            options={[
              { value: '', label: 'Select Case file...' },
              ...cases.map(c => ({ value: c.id, label: `${c.case_number} (${c.Lead?.client_name})` }))
            ]}
            value={caseSel}
            onChange={(e) => setCaseSel(e.target.value)}
          />
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
            <label className="block text-sm font-semibold text-gray-700 mb-1">Select File</label>
            <input type="file" onChange={(e) => setDocFile(e.target.files[0])} className="w-full text-sm border border-gray-300 rounded p-1.5" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleUpload}>Upload</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default DocumentList;
