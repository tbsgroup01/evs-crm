import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { DataTable } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';

export const SettingsPanel = () => {
  const [activeTab, setActiveTab] = useState('packages');
  const [companyName, setCompanyName] = useState('EVS Immigration');
  const [supportEmail, setSupportEmail] = useState('support@evscrm.com');

  const [pkgs, setPkgs] = useState([]);
  const [open, setOpen] = useState(false);
  const [pkgName, setPkgName] = useState('');
  const [pkgDesc, setPkgDesc] = useState('');
  const [pkgAmount, setPkgAmount] = useState('');

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = () => {
    axios.get('/api/v1/packages').then(res => setPkgs(res.data.data || []));
  };

  const handleCreatePackage = () => {
    axios.post('/api/v1/packages', { name: pkgName, description: pkgDesc, amount: pkgAmount }).then(() => {
      setPkgName('');
      setPkgDesc('');
      setPkgAmount('');
      setOpen(false);
      fetchPackages();
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>

      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('packages')}
          className={`px-6 py-3 text-sm font-semibold capitalize border-b-2 transition-all ${activeTab === 'packages' ? 'border-slate-800 text-slate-900' : 'border-transparent text-gray-500 hover:text-slate-800'}`}
        >
          Package Templates
        </button>
        <button
          onClick={() => setActiveTab('general')}
          className={`px-6 py-3 text-sm font-semibold capitalize border-b-2 transition-all ${activeTab === 'general' ? 'border-slate-800 text-slate-900' : 'border-transparent text-gray-500 hover:text-slate-800'}`}
        >
          General Preferences
        </button>
      </div>

      {activeTab === 'packages' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-900">Configured Packages</h2>
            <Button onClick={() => setOpen(true)}>Create Template</Button>
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
        </div>
      )}

      {activeTab === 'general' && (
        <Card title="Company Metadata Settings">
          <div className="max-w-md space-y-4">
            <Input
              label="Company Name"
              id="company_name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
            <Input
              label="Support Email Address"
              id="support_email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
            />
            <Button onClick={() => alert('Preferences saved successfully')} className="w-full">
              Save General Preferences
            </Button>
          </div>
        </Card>
      )}

      <Modal isOpen={open} onClose={() => setOpen(false)} title="New Package Template">
        <div className="space-y-4">
          <Input label="Name" id="p_name" value={pkgName} onChange={(e) => setPkgName(e.target.value)} />
          <Input label="Description" id="p_desc" value={pkgDesc} onChange={(e) => setPkgDesc(e.target.value)} />
          <Input label="Amount (AED)" id="p_amount" type="number" value={pkgAmount} onChange={(e) => setPkgAmount(e.target.value)} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreatePackage}>Save Template</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default SettingsPanel;
