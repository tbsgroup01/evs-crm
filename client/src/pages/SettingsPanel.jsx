import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import {
  Globe,
  Mail,
  Send,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Loader2,
  ShieldCheck
} from 'lucide-react';

export const SettingsPanel = () => {
  const [activeTab, setActiveTab] = useState('general');

  // General Settings State
  const [appName, setAppName] = useState('EVS CRM');
  const [contactNo, setContactNo] = useState('+971 4 123 4567');
  const [contactEmail, setContactEmail] = useState('support@evscrm.com');
  const [logoPreview, setLogoPreview] = useState('');
  const [faviconPreview, setFaviconPreview] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [faviconFile, setFaviconFile] = useState(null);
  const [generalSaving, setGeneralSaving] = useState(false);
  const [generalAlert, setGeneralAlert] = useState(null);

  // Email Configuration State
  const [mailApp, setMailApp] = useState('Gmail');
  const [mailHost, setMailHost] = useState('smtp.gmail.com');
  const [mailPort, setMailPort] = useState('587');
  const [mailUser, setMailUser] = useState('');
  const [mailPass, setMailPass] = useState('');
  const [mailFromName, setMailFromName] = useState('EVS CRM System');
  const [mailFromAddress, setMailFromAddress] = useState('no-reply@evscrm.com');
  const [showPass, setShowPass] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailAlert, setEmailAlert] = useState(null);

  // Test Email State
  const [testEmail, setTestEmail] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get('/api/v1/settings');
      if (res.data.success && res.data.data) {
        const { general = {}, email = {} } = res.data.data;
        if (general.app_name) setAppName(general.app_name);
        if (general.contact_no) setContactNo(general.contact_no);
        if (general.contact_email) setContactEmail(general.contact_email);
        if (general.logo_icon) setLogoPreview(general.logo_icon);
        if (general.favicon_icon) setFaviconPreview(general.favicon_icon);

        if (email.mail_app) setMailApp(email.mail_app);
        if (email.mail_host) setMailHost(email.mail_host);
        if (email.mail_port) setMailPort(email.mail_port);
        if (email.mail_user) setMailUser(email.mail_user);
        if (email.mail_pass) setMailPass(email.mail_pass);
        if (email.mail_from_name) setMailFromName(email.mail_from_name);
        if (email.mail_from_address) setMailFromAddress(email.mail_from_address);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleFaviconChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFaviconFile(file);
      setFaviconPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveGeneral = async (e) => {
    e.preventDefault();
    setGeneralSaving(true);
    setGeneralAlert(null);

    try {
      const formData = new FormData();
      formData.append('group', 'general');
      formData.append('app_name', appName);
      formData.append('contact_no', contactNo);
      formData.append('contact_email', contactEmail);
      if (logoFile) formData.append('logo', logoFile);
      if (faviconFile) formData.append('favicon', faviconFile);

      const res = await axios.put('/api/v1/settings', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        setGeneralAlert({ type: 'success', message: 'General Settings saved successfully!' });
        fetchSettings();
      }
    } catch (err) {
      setGeneralAlert({
        type: 'error',
        message: err.response?.data?.message || 'Failed to save general settings'
      });
    } finally {
      setGeneralSaving(false);
    }
  };

  const handleSaveEmail = async (e) => {
    e.preventDefault();
    setEmailSaving(true);
    setEmailAlert(null);

    try {
      const res = await axios.put('/api/v1/settings', {
        group: 'email',
        mail_app: mailApp,
        mail_host: mailHost,
        mail_port: mailPort,
        mail_user: mailUser,
        mail_pass: mailPass,
        mail_from_name: mailFromName,
        mail_from_address: mailFromAddress
      });

      if (res.data.success) {
        setEmailAlert({ type: 'success', message: 'Email Configuration saved successfully!' });
      }
    } catch (err) {
      setEmailAlert({
        type: 'error',
        message: err.response?.data?.message || 'Failed to save email configuration'
      });
    } finally {
      setEmailSaving(false);
    }
  };

  const handleSendTestEmail = async (e) => {
    e.preventDefault();
    if (!testEmail) {
      setTestResult({ type: 'error', message: 'Please enter a target email address for testing.' });
      return;
    }

    setTestingEmail(true);
    setTestResult(null);

    try {
      const res = await axios.post('/api/v1/settings/test-email', {
        to_email: testEmail,
        mail_app: mailApp,
        mail_host: mailHost,
        mail_port: mailPort,
        mail_user: mailUser,
        mail_pass: mailPass
      });

      if (res.data.success) {
        setTestResult({ type: 'success', message: res.data.message });
      }
    } catch (err) {
      setTestResult({
        type: 'error',
        message: err.response?.data?.message || 'Failed to send test email.'
      });
    } finally {
      setTestingEmail(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
        <p className="text-sm text-slate-500">Manage branding, general preferences, and email integration.</p>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
              activeTab === 'general'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Globe className="w-4 h-4" />
            General Settings
          </button>

          <button
            onClick={() => setActiveTab('email')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
              activeTab === 'email'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Mail className="w-4 h-4" />
            Email Configuration
          </button>
        </nav>
      </div>

      {/* TAB 1: General Settings */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveGeneral} className="space-y-6">
          {generalAlert && (
            <div
              className={`p-4 rounded-lg flex items-center gap-3 text-sm font-medium ${
                generalAlert.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {generalAlert.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
              {generalAlert.message}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card title="System & Branding Identity">
                <div className="space-y-4">
                  <Input
                    label="App / System Name"
                    id="app_name"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    placeholder="EVS CRM"
                    required
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Contact Number"
                      id="contact_no"
                      value={contactNo}
                      onChange={(e) => setContactNo(e.target.value)}
                      placeholder="+971 4 123 4567"
                    />

                    <Input
                      label="Contact Email"
                      id="contact_email"
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="support@evscrm.com"
                    />
                  </div>
                </div>
              </Card>

              <Card title="Logos & Icons">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Logo Upload */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Logo Icon</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-slate-400 transition-colors bg-gray-50">
                      {logoPreview ? (
                        <div className="space-y-3">
                          <img src={logoPreview} alt="Logo Preview" className="h-16 mx-auto object-contain" />
                          <p className="text-xs text-gray-500">Current Logo Preview</p>
                        </div>
                      ) : (
                        <div className="space-y-2 py-2">
                          <ImageIcon className="w-8 h-8 mx-auto text-gray-400" />
                          <p className="text-xs text-gray-500">PNG, JPG or SVG (Max 2MB)</p>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="mt-3 block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Favicon Upload */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">Favicon Icon</label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-slate-400 transition-colors bg-gray-50">
                      {faviconPreview ? (
                        <div className="space-y-3">
                          <img src={faviconPreview} alt="Favicon Preview" className="h-12 w-12 mx-auto object-contain" />
                          <p className="text-xs text-gray-500">Current Favicon Preview</p>
                        </div>
                      ) : (
                        <div className="space-y-2 py-2">
                          <Globe className="w-8 h-8 mx-auto text-gray-400" />
                          <p className="text-xs text-gray-500">ICO, PNG (Max 1MB)</p>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFaviconChange}
                        className="mt-3 block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            <div className="space-y-6">
              <Card title="Summary Preview">
                <div className="space-y-4 text-sm text-gray-600">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-medium text-gray-700">System Name</span>
                    <span className="font-semibold text-slate-900">{appName || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-medium text-gray-700">Phone</span>
                    <span>{contactNo || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-medium text-gray-700">Email</span>
                    <span className="truncate max-w-[150px]">{contactEmail || 'N/A'}</span>
                  </div>
                </div>
                <div className="mt-6">
                  <Button type="submit" disabled={generalSaving} className="w-full flex justify-center items-center gap-2">
                    {generalSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Save General Settings
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </form>
      )}

      {/* TAB 2: Email Configuration */}
      {activeTab === 'email' && (
        <div className="space-y-6">
          {emailAlert && (
            <div
              className={`p-4 rounded-lg flex items-center gap-3 text-sm font-medium ${
                emailAlert.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {emailAlert.type === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
              {emailAlert.message}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Email Config Form */}
            <div className="lg:col-span-2">
              <Card title="Mail Server & App Settings">
                <form onSubmit={handleSaveEmail} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select
                      label="Mail App / Service"
                      id="mail_app"
                      value={mailApp}
                      onChange={(e) => {
                        const app = e.target.value;
                        setMailApp(app);
                        if (app === 'Gmail') {
                          setMailHost('smtp.gmail.com');
                          setMailPort('587');
                        } else if (app === 'Outlook') {
                          setMailHost('smtp.office365.com');
                          setMailPort('587');
                        } else if (app === 'Yahoo') {
                          setMailHost('smtp.mail.yahoo.com');
                          setMailPort('465');
                        }
                      }}
                      options={[
                        { value: 'Gmail', label: 'Gmail (Google App Password)' },
                        { value: 'Outlook', label: 'Outlook / Office 365' },
                        { value: 'Yahoo', label: 'Yahoo Mail' },
                        { value: 'Custom SMTP', label: 'Custom SMTP Server' }
                      ]}
                    />

                    <Input
                      label="SMTP Host"
                      id="mail_host"
                      value={mailHost}
                      onChange={(e) => setMailHost(e.target.value)}
                      placeholder="smtp.gmail.com"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="SMTP Port"
                      id="mail_port"
                      value={mailPort}
                      onChange={(e) => setMailPort(e.target.value)}
                      placeholder="587"
                      required
                    />

                    <Input
                      label="Mail User / Username"
                      id="mail_user"
                      type="email"
                      value={mailUser}
                      onChange={(e) => setMailUser(e.target.value)}
                      placeholder="youremail@gmail.com"
                      required
                    />
                  </div>

                  <div className="relative">
                    <Input
                      label="Mail Password / App Password"
                      id="mail_pass"
                      type={showPass ? 'text' : 'password'}
                      value={mailPass}
                      onChange={(e) => setMailPass(e.target.value)}
                      placeholder="Enter app password or SMTP password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-8 text-gray-400 hover:text-gray-600 text-xs flex items-center gap-1"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="From Name"
                      id="mail_from_name"
                      value={mailFromName}
                      onChange={(e) => setMailFromName(e.target.value)}
                      placeholder="EVS CRM System"
                    />

                    <Input
                      label="From Email Address"
                      id="mail_from_address"
                      type="email"
                      value={mailFromAddress}
                      onChange={(e) => setMailFromAddress(e.target.value)}
                      placeholder="no-reply@evscrm.com"
                    />
                  </div>

                  <div className="pt-2">
                    <Button type="submit" disabled={emailSaving} className="w-full flex justify-center items-center gap-2">
                      {emailSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      Save Email Configuration
                    </Button>
                  </div>
                </form>
              </Card>
            </div>

            {/* Test Email Section */}
            <div>
              <Card title="Test Email Configuration">
                <div className="space-y-4">
                  <p className="text-xs text-gray-500">
                    Send a test email to verify that your SMTP host, mail user, and app password are configured correctly.
                  </p>

                  <Input
                    label="Testing Email Address"
                    id="test_email"
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="recipient@example.com"
                  />

                  <Button
                    onClick={handleSendTestEmail}
                    disabled={testingEmail}
                    variant="secondary"
                    className="w-full flex justify-center items-center gap-2"
                  >
                    {testingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send Test Email
                  </Button>

                  {testResult && (
                    <div
                      className={`p-3 rounded-md text-xs font-medium ${
                        testResult.type === 'success'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {testResult.type === 'success' ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        )}
                        <span>{testResult.message}</span>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPanel;
