import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Plus, Edit, Trash2, CheckCircle, XCircle, Package, DollarSign } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { DataTable } from '../components/DataTable';
import { formatAED } from '../utils/formatters';

export const PackagesList = () => {
  const [pkgs, setPkgs] = useState([]);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = () => {
    axios.get('/api/v1/packages').then(res => setPkgs(res.data.data || []));
  };

  const resetForm = () => {
    setName('');
    setDesc('');
    setAmount('');
    setEditingId(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setOpen(true);
  };

  const handleOpenEdit = (pkg) => {
    setEditingId(pkg.id);
    setName(pkg.name || '');
    setDesc(pkg.description || '');
    setAmount(pkg.amount || '');
    setOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert('Product / Service name is required');
      return;
    }

    const payload = {
      name: name.trim(),
      description: desc,
      amount: amount ? parseFloat(amount) : 0
    };

    if (editingId) {
      axios.put(`/api/v1/packages/${editingId}`, payload).then(() => {
        resetForm();
        setOpen(false);
        fetchPackages();
      }).catch(err => alert(err.response?.data?.message || 'Failed to update item'));
    } else {
      axios.post('/api/v1/packages', payload).then(() => {
        resetForm();
        setOpen(false);
        fetchPackages();
      }).catch(err => alert(err.response?.data?.message || 'Failed to create item'));
    }
  };

  const toggleStatus = (id, currentStatus) => {
    axios.patch(`/api/v1/packages/${id}/status`, { status: !currentStatus }).then(() => fetchPackages());
  };

  const handleDelete = (id, itemName) => {
    if (window.confirm(`Are you sure you want to delete "${itemName}"?`)) {
      axios.delete(`/api/v1/packages/${id}`).then(() => fetchPackages());
    }
  };

  const filtered = pkgs.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products & Services Manager</h1>
          <p className="text-sm text-gray-500 mt-1">Manage standard products, visa packages, and service offerings for Lead creation</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm cursor-pointer ml-auto md:ml-0"
        >
          <Plus className="h-4 w-4" /> Add Product / Service
        </button>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products, visa categories or services..."
            className="w-full pl-10 pr-4 py-2 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-slate-500 bg-slate-50 border border-gray-100"
          />
        </div>
      </div>

      <Card>
        <DataTable
          headers={['PRODUCT / SERVICE NAME', 'DESCRIPTION', 'DEFAULT PRICE (AED)', 'STATUS', 'ACTIONS']}
          rows={filtered.map(p => [
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                <Package className="h-4 w-4" />
              </div>
              <span className="font-bold text-slate-800 text-sm">{p.name}</span>
            </div>,
            <span className="text-xs text-gray-600 max-w-xs truncate block">{p.description || 'No description provided'}</span>,
            <span className="font-semibold text-slate-800 text-sm">{formatAED(p.amount)}</span>,
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 ${p.status ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-gray-100 text-gray-600'}`}>
              {p.status ? 'Active' : 'Inactive'}
            </span>,
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenEdit(p)}
                className="p-1.5 rounded-lg bg-slate-50 text-blue-600 hover:bg-blue-100 transition-colors"
                title="Edit Product"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={() => toggleStatus(p.id, p.status)}
                className={`p-1.5 rounded-lg transition-colors ${p.status ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                title={p.status ? 'Deactivate' : 'Activate'}
              >
                {p.status ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
              </button>
              <button
                onClick={() => handleDelete(p.id, p.name)}
                className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                title="Delete Product"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ])}
        />
      </Card>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h2 className="text-xl font-bold text-gray-900 border-b border-gray-100 pb-3">
              {editingId ? 'Edit Product / Service' : 'Add New Product / Service'}
            </h2>
            <div className="space-y-4">
              <Input
                label="Product / Service Name *"
                id="pkg_name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Canada Visit Visa / Schengen Visa"
              />
              <Input
                label="Description"
                id="pkg_desc"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="Brief description of product features..."
              />
              <Input
                label="Default Package Amount (AED)"
                id="pkg_amount"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleSave}>{editingId ? 'Update Product' : 'Save Product'}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PackagesList;
