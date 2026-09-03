import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Folder, ShieldCheck, FileText, ListChecks, Edit2, Trash2, FileCheck, Car, BookOpen, AlertCircle } from 'lucide-react';
import { Modal } from '../components/Modal';

export const DocumentCategoriesList = () => {


  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [isRequired, setIsRequired] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = () => {
    setLoading(true);
    axios.get('/api/v1/document-types')
      .then(res => {
        setCategories(res.data.data || []);
      })
      .catch(err => {
        console.error('Failed to fetch categories:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setName('');
    setDesc('');
    setIsRequired(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cat) => {
    setEditingCategory(cat);
    setName(cat.name || '');
    setDesc(cat.description || '');
    setIsRequired(!!cat.is_required);
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      alert('Please enter a Category Name');
      return;
    }

    setSubmitting(true);
    const payload = {
      name: name.trim(),
      description: desc.trim() || null,
      is_required: isRequired
    };

    if (editingCategory) {
      axios.put(`/api/v1/document-types/${editingCategory.id}`, payload)
        .then(() => {
          setIsModalOpen(false);
          fetchCategories();
        })
        .catch(err => {
          alert(err.response?.data?.message || 'Failed to update category');
        })
        .finally(() => setSubmitting(false));
    } else {
      axios.post('/api/v1/document-types', payload)
        .then(() => {
          setIsModalOpen(false);
          fetchCategories();
        })
        .catch(err => {
          alert(err.response?.data?.message || 'Failed to create category');
        })
        .finally(() => setSubmitting(false));
    }
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Are you sure you want to delete category "${name}"?`)) {
      axios.delete(`/api/v1/document-types/${id}`)
        .then(() => fetchCategories())
        .catch(err => {
          alert(err.response?.data?.message || 'Failed to delete category');
        });
    }
  };

  const totalCategories = categories.length;
  const requiredCategories = categories.filter(c => c.is_required).length;
  const optionalCategories = categories.filter(c => !c.is_required).length;

  const getCategoryIcon = (index, nameStr) => {
    const nameLower = (nameStr || '').toLowerCase();
    if (nameLower.includes('license') || nameLower.includes('licence') || nameLower.includes('drive')) {
      return { Icon: Car, bg: 'bg-emerald-50 text-emerald-600' };
    }
    if (nameLower.includes('form')) {
      return { Icon: FileText, bg: 'bg-amber-50 text-amber-600' };
    }
    if (nameLower.includes('passport') || nameLower.includes('visa') || nameLower.includes('id')) {
      return { Icon: BookOpen, bg: 'bg-blue-50 text-blue-600' };
    }
    const colorStyles = [
      { Icon: FileCheck, bg: 'bg-purple-50 text-purple-600' },
      { Icon: Car, bg: 'bg-emerald-50 text-emerald-600' },
      { Icon: FileText, bg: 'bg-amber-50 text-amber-600' },
      { Icon: BookOpen, bg: 'bg-blue-50 text-blue-600' }
    ];
    return colorStyles[index % colorStyles.length];
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Document Categories (Checklist Requirements)</h1>
          <p className="text-sm text-slate-500 mt-1">Manage and organize document categories required for leads and cases.</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 transition-all self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" /> Add Category
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 flex-shrink-0">
            <Folder className="h-6 w-6" />
          </div>
          <div>
            <span className="text-2xl font-bold text-slate-900 block leading-none">{totalCategories}</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mt-1.5">Total Categories</span>
            <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">All document categories</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <span className="text-2xl font-bold text-slate-900 block leading-none">{requiredCategories}</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mt-1.5">Required Categories</span>
            <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">Mandatory for process</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <span className="text-2xl font-bold text-slate-900 block leading-none">{optionalCategories}</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mt-1.5">Optional Categories</span>
            <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">Not mandatory</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
            <ListChecks className="h-6 w-6" />
          </div>
          <div>
            <span className="text-2xl font-bold text-slate-900 block leading-none">100%</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mt-1.5">Up to Date</span>
            <span className="text-[11px] text-slate-400 font-semibold block mt-0.5">All categories active</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-16">
            <Folder className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">No Document Categories Found</h3>
            <p className="text-sm text-slate-400 mt-1">Get started by creating your first document category requirement.</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full border border-slate-100 rounded-xl">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-blue-50/50 text-blue-900 font-bold uppercase text-xs tracking-wider border-b border-blue-100">
                  <th className="px-6 py-4">Category Name</th>
                  <th className="px-6 py-4">Description</th>
                  <th className="px-6 py-4">Is Required?</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((cat, idx) => {
                  const { Icon, bg } = getCategoryIcon(idx, cat.name);
                  return (
                    <tr key={cat.id} className="hover:bg-slate-50/70 transition-colors">

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3.5">

                          <span className="font-bold text-slate-800 text-sm">{cat.name}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-slate-500 font-medium text-sm whitespace-nowrap">
                        {cat.description || 'N/A'}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {cat.is_required ? (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 inline-block">
                            Yes
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 inline-block">
                            No
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(cat)}
                            className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                            title="Edit Category"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(cat.id, cat.name)}
                            className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                            title="Delete Category"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6 pt-4 border-t border-slate-100">
          <span className="text-xs text-slate-500 font-medium">
            Showing 1 to {categories.length} of {categories.length} entries
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
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCategory ? 'Edit Document Category' : 'Add Document Category'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Category Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Passport, Contract 1, Driving Licence"
              className="w-full text-sm border border-slate-200 rounded-xl p-3 focus:ring-1 focus:ring-blue-600 focus:outline-none bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Description (Optional)</label>
            <textarea
              rows="3"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Enter category description or requirements..."
              className="w-full text-sm border border-slate-200 rounded-xl p-3 focus:ring-1 focus:ring-blue-600 focus:outline-none bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Is Required?</label>
            <select
              value={isRequired ? 'true' : 'false'}
              onChange={(e) => setIsRequired(e.target.value === 'true')}
              className="w-full text-sm border border-slate-200 rounded-xl p-3 bg-white focus:ring-1 focus:ring-blue-600 focus:outline-none"
            >
              <option value="false">No (Optional Document)</option>
              <option value="true">Yes (Mandatory Document)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-sm font-bold shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all"
            >
              {submitting ? 'Saving...' : (editingCategory ? 'Update Category' : 'Save Category')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DocumentCategoriesList;
