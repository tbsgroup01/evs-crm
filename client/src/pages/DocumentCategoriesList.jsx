import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';

export const DocumentCategoriesList = () => {
  const [categories, setCategories] = useState([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [required, setRequired] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = () => {
    axios.get('/api/v1/document-types').then(res => setCategories(res.data.data || []));
  };

  const handleCreate = () => {
    axios.post('/api/v1/document-types', { name, description: desc, is_required: required }).then(() => {
      setName('');
      setDesc('');
      setRequired(true);
      setOpen(false);
      fetchCategories();
    });
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete category?')) {
      axios.delete(`/api/v1/document-types/${id}`)
        .then(() => fetchCategories())
        .catch(err => {
          alert(err.response?.data?.message || 'Failed to delete category');
        });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Document Categories (Checklist Requirements)</h1>
        <Button onClick={() => setOpen(true)}>Add Category</Button>
      </div>

      <Card>
        <DataTable
          headers={['Category Name', 'Description', 'Is Required?', 'Actions']}
          rows={categories.map(c => [
            c.name,
            c.description || 'N/A',
            c.is_required ? 'Yes' : 'No',
            <button onClick={() => handleDelete(c.id)} className="text-xs text-red-600 font-medium hover:underline">Delete</button>
          ])}
        />
      </Card>

      <Modal isOpen={open} onClose={() => setOpen(false)} title="Add Document Category">
        <div className="space-y-4">
          <Input label="Category Name" id="cat_name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Passport copy" />
          <Input label="Description" id="cat_desc" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <Select
            label="Is Required?"
            id="cat_req"
            options={[
              { value: 'true', label: 'Required' },
              { value: 'false', label: 'Optional' }
            ]}
            value={required.toString()}
            onChange={(e) => setRequired(e.target.value === 'true')}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Save Category</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
