import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';

export const PackagesList = () => {
  const [pkgs, setPkgs] = useState([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = () => {
    axios.get('/api/v1/packages').then(res => setPkgs(res.data.data || []));
  };

  const handleCreate = () => {
    axios.post('/api/v1/packages', { name, description: desc, amount }).then(() => {
      setName('');
      setDesc('');
      setAmount('');
      setOpen(false);
      fetchPackages();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Packages Templates</h1>
        <Button onClick={() => setOpen(true)}>Create Package</Button>
      </div>

      <Card>
        <DataTable
          headers={['Package Name', 'Description', 'Amount', 'Status']}
          rows={pkgs.map(p => [
            p.name,
            p.description || 'N/A',
            `AED ${parseFloat(p.amount).toFixed(2)}`,
            <StatusBadge status={p.status ? 'VERIFIED' : 'REJECTED'} />
          ])}
        />
      </Card>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-sm w-full">
            <h2 className="text-xl font-bold text-gray-900 mb-4">New Package template</h2>
            <div className="space-y-4">
              <Input label="Name" id="pkg_name" value={name} onChange={(e) => setName(e.target.value)} />
              <Input label="Description" id="pkg_desc" value={desc} onChange={(e) => setDesc(e.target.value)} />
              <Input label="Amount (AED)" id="pkg_amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate}>Save Template</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
