import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import {
  Bell,
  Send,
  CheckCircle,
  AlertTriangle,
  Info,
  Check,
  Users,
  Loader2,
  MailCheck,
  AlertCircle,
  Mail,
  Search,
  Filter,
  UserCheck
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { AuthContext } from '../App';

export const NotificationsList = () => {
  const { user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [usersList, setUsersList] = useState([]);

  // User Broadcast State
  const [dispatchGroup, setDispatchGroup] = useState('ALL');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('SYSTEM_ALERT');
  const [submitting, setSubmitting] = useState(false);
  const [alertStatus, setAlertStatus] = useState(null);

  // Lead Broadcast Modal State
  const [openLeadsModal, setOpenLeadsModal] = useState(false);
  const [leadsList, setLeadsList] = useState([]);
  const [leadSearch, setLeadSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedLeadIds, setSelectedLeadIds] = useState([]);
  const [allLeadsFlag, setAllLeadsFlag] = useState(false);
  const [leadSubject, setLeadSubject] = useState('');
  const [leadMessage, setLeadMessage] = useState('');
  const [sendingLeadsEmail, setSendingLeadsEmail] = useState(false);
  const [leadsAlert, setLeadsAlert] = useState(null);

  const canBroadcast = ['ADMIN', 'LEAD_MANAGER'].includes(user?.role);

  useEffect(() => {
    fetchNotifications();
    if (canBroadcast) {
      fetchUsers();
    }
  }, [user]);

  const fetchNotifications = () => {
    axios.get('/api/v1/notifications').then((res) => {
      setNotifications(res.data.data || []);
    });
  };

  const fetchUsers = () => {
    axios.get('/api/v1/users').then((res) => {
      setUsersList(res.data.data || []);
    });
  };

  const fetchLeads = () => {
    axios.get('/api/v1/leads?limit=1000').then((res) => {
      const list = res.data.data?.leads || (Array.isArray(res.data.data) ? res.data.data : []);
      setLeadsList(list);
    }).catch(() => {
      setLeadsList([]);
    });
  };

  const handleMarkAsRead = (id) => {
    axios.patch(`/api/v1/notifications/${id}/read`).then(() => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    });
  };

  const handleMarkAllAsRead = () => {
    axios.patch('/api/v1/notifications/read-all').then(() => {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    });
  };

  const toggleUserSelection = (uid) => {
    setSelectedUserIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const toggleLeadSelection = (leadId) => {
    setAllLeadsFlag(false);
    setSelectedLeadIds((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
    );
  };

  // Filtered Leads
  const safeLeadsList = Array.isArray(leadsList) ? leadsList : [];
  const filteredLeads = safeLeadsList.filter((lead) => {
    const matchesSearch =
      !leadSearch ||
      lead.client_name?.toLowerCase().includes(leadSearch.toLowerCase()) ||
      lead.email?.toLowerCase().includes(leadSearch.toLowerCase()) ||
      lead.mobile?.includes(leadSearch) ||
      lead.lead_number?.toLowerCase().includes(leadSearch.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || lead.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSelectAllFilteredLeads = (e) => {
    const checked = e.target.checked;
    if (checked) {
      const ids = filteredLeads.map((l) => l.id);
      setSelectedLeadIds(ids);
    } else {
      setSelectedLeadIds([]);
      setAllLeadsFlag(false);
    }
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    setAlertStatus(null);

    if (!title || !message) {
      setAlertStatus({ type: 'error', message: 'Title and message are required fields.' });
      return;
    }

    if (dispatchGroup === 'SPECIFIC' && selectedUserIds.length === 0) {
      setAlertStatus({ type: 'error', message: 'Please select at least one recipient user.' });
      return;
    }

    setSubmitting(true);

    let targetType = 'ALL';
    let targetRole = null;

    if (dispatchGroup.startsWith('ROLE_')) {
      targetType = 'ROLE';
      targetRole = dispatchGroup.replace('ROLE_', '');
    } else if (dispatchGroup === 'SPECIFIC') {
      targetType = 'SPECIFIC';
    }

    try {
      const res = await axios.post('/api/v1/notifications/send', {
        targetType,
        targetRole,
        userIds: targetType === 'SPECIFIC' ? selectedUserIds : [],
        title,
        message,
        type
      });

      if (res.data.success) {
        setAlertStatus({
          type: 'success',
          message: `${res.data.message} Email notifications dispatched to recipient inboxes.`
        });
        setTitle('');
        setMessage('');
        setSelectedUserIds([]);
        fetchNotifications();
      }
    } catch (err) {
      setAlertStatus({
        type: 'error',
        message: err.response?.data?.message || 'Failed to dispatch broadcast notification.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendLeadsEmailBroadcast = async (e) => {
    e.preventDefault();
    setLeadsAlert(null);

    if (!leadSubject || !leadMessage) {
      setLeadsAlert({ type: 'error', message: 'Email subject and message content are required.' });
      return;
    }

    if (!allLeadsFlag && selectedLeadIds.length === 0) {
      setLeadsAlert({ type: 'error', message: 'Please select at least one lead or choose "All Leads".' });
      return;
    }

    setSendingLeadsEmail(true);

    try {
      const res = await axios.post('/api/v1/notifications/send-leads', {
        allLeads: allLeadsFlag,
        leadIds: allLeadsFlag ? [] : selectedLeadIds,
        statusFilter,
        subject: leadSubject,
        message: leadMessage
      });

      if (res.data.success) {
        setLeadsAlert({
          type: 'success',
          message: res.data.message || 'Email announcement sent successfully to leads!'
        });
        setLeadSubject('');
        setLeadMessage('');
        setSelectedLeadIds([]);
        setAllLeadsFlag(false);
      }
    } catch (err) {
      setLeadsAlert({
        type: 'error',
        message: err.response?.data?.message || 'Failed to send broadcast email to leads.'
      });
    } finally {
      setSendingLeadsEmail(false);
    }
  };

  const getIcon = (t) => {
    switch (t) {
      case 'SUCCESS':
        return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case 'WARNING':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      default:
        return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications & Broadcasts</h1>
          <p className="text-sm text-slate-500 mt-0.5">Read system alerts, send corporate broadcasts, or email announcements to leads.</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {canBroadcast && (
            <Button
              onClick={() => {
                fetchLeads();
                setOpenLeadsModal(true);
              }}
              className="flex items-center gap-2 bg-indigo-950 text-white hover:bg-slate-800"
            >
              <Mail className="h-4 w-4" /> Broadcast Email to Leads
            </Button>
          )}

          {notifications.some((n) => !n.is_read) && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
            >
              <Check className="h-4 w-4" /> Mark All as Read
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Notification Inbox */}
        <div className="lg:col-span-2 space-y-4">
          <Card title="My Inbox">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                <Bell className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                No notifications found.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => !n.is_read && handleMarkAsRead(n.id)}
                    className={`flex items-start gap-4 p-4 transition-colors cursor-pointer rounded-xl ${
                      !n.is_read ? 'bg-blue-50/40 hover:bg-blue-50/70 border-l-4 border-blue-600' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">{getIcon(n.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm ${!n.is_read ? 'font-bold text-slate-900' : 'text-slate-700 font-medium'}`}>
                          {n.title}
                        </p>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap">
                          {new Date(n.created_at || n.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">{n.message}</p>
                    </div>
                    {!n.is_read && <span className="h-2 w-2 rounded-full bg-blue-600 flex-shrink-0 mt-2" />}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Send Broadcast Panel */}
        {canBroadcast && (
          <div className="space-y-6">
            <Card title="Send Broadcast Notification">
              <form onSubmit={handleSendNotification} className="space-y-4">
                {alertStatus && (
                  <div
                    className={`p-3 rounded-lg flex items-start gap-2 text-xs font-medium ${
                      alertStatus.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {alertStatus.type === 'success' ? (
                      <MailCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    )}
                    <span>{alertStatus.message}</span>
                  </div>
                )}

                <Select
                  label="Recipients Group"
                  id="dispatchGroup"
                  options={[
                    { value: 'ALL', label: 'All Active Users (Bulk Broadcast)' },
                    { value: 'ROLE_COUNSELOR', label: 'Counselors Only' },
                    { value: 'ROLE_CASE_MANAGER', label: 'Case Managers Only' },
                    { value: 'ROLE_LEAD_MANAGER', label: 'Lead Managers Only' },
                    { value: 'ROLE_ADMIN', label: 'Administrators Only' },
                    { value: 'SPECIFIC', label: 'Select Specific Users' }
                  ]}
                  value={dispatchGroup}
                  onChange={(e) => setDispatchGroup(e.target.value)}
                />

                {dispatchGroup === 'SPECIFIC' && (
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Select User Recipients</label>
                    <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2.5 space-y-2 bg-white">
                      {usersList
                        .filter((u) => u.status === 'ACTIVE')
                        .map((u) => (
                          <label key={u.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={selectedUserIds.includes(u.id)}
                              onChange={() => toggleUserSelection(u.id)}
                              className="rounded border-gray-300 text-slate-900 focus:ring-slate-500 h-3.5 w-3.5"
                            />
                            <span>
                              {u.name} <span className="text-[10px] text-gray-400">({u.role})</span>
                            </span>
                          </label>
                        ))}
                    </div>
                  </div>
                )}

                <Select
                  label="Alert Category"
                  id="type"
                  options={[
                    { value: 'SYSTEM_ALERT', label: 'System Alert (Blue)' },
                    { value: 'SUCCESS', label: 'Success Notification (Green)' },
                    { value: 'WARNING', label: 'Warning Alert (Orange)' }
                  ]}
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                />

                <Input
                  label="Broadcast Title"
                  id="title"
                  placeholder="e.g., Monthly Meeting Update"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />

                <div className="space-y-1">
                  <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-1">
                    Message Content
                  </label>
                  <textarea
                    id="message"
                    rows="4"
                    placeholder="Enter full broadcast text to send to in-app & email..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
                  />
                </div>

                <Button type="submit" className="w-full flex items-center justify-center gap-2 mt-2" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {submitting ? 'Sending Broadcast...' : 'Send Broadcast & Email'}
                </Button>
              </form>
            </Card>
          </div>
        )}
      </div>

      {/* Broadcast Email to Leads Modal */}
      <Modal
        isOpen={openLeadsModal}
        onClose={() => setOpenLeadsModal(false)}
        title="Broadcast Announcement Email to Leads"
      >
        <form onSubmit={handleSendLeadsEmailBroadcast} className="space-y-4 max-w-2xl">
          {leadsAlert && (
            <div
              className={`p-3 rounded-lg flex items-start gap-2 text-xs font-medium ${
                leadsAlert.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {leadsAlert.type === 'success' ? (
                <MailCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              )}
              <span>{leadsAlert.message}</span>
            </div>
          )}

          {/* Lead Search and Filtering */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Search Leads</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by name, email, phone..."
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
              </div>
            </div>

            <Select
              label="Filter by Lead Status"
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'ALL', label: 'All Lead Statuses' },
                { value: 'NEW', label: 'New Leads' },
                { value: 'INTERESTED', label: 'Interested' },
                { value: 'FOLLOW_UP', label: 'Follow Up' },
                { value: 'COLD_LEAD', label: 'Cold Lead' },
                { value: 'CONVERTED', label: 'Converted' },
                { value: 'NOT_INTERESTED', label: 'Not Interested' }
              ]}
            />
          </div>

          {/* Lead Selection List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={
                    filteredLeads.length > 0 &&
                    filteredLeads.every((l) => selectedLeadIds.includes(l.id))
                  }
                  onChange={handleSelectAllFilteredLeads}
                  className="rounded border-gray-300 text-slate-900 focus:ring-slate-500 h-3.5 w-3.5"
                />
                <span>Select All Filtered Leads ({filteredLeads.length})</span>
              </label>

              <span className="text-xs text-slate-600 font-semibold">
                {allLeadsFlag
                  ? 'All System Leads Selected'
                  : `${selectedLeadIds.length} lead(s) selected`}
              </span>
            </div>

            <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2 divide-y divide-gray-100 bg-gray-50/50">
              {filteredLeads.length === 0 ? (
                <div className="py-6 text-center text-xs text-gray-500">
                  No matching leads found for "{leadSearch}".
                </div>
              ) : (
                filteredLeads.map((lead) => (
                  <label
                    key={lead.id}
                    className="flex items-center justify-between gap-3 p-2 hover:bg-white rounded-md cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={selectedLeadIds.includes(lead.id)}
                        onChange={() => toggleLeadSelection(lead.id)}
                        className="rounded border-gray-300 text-slate-900 focus:ring-slate-500 h-3.5 w-3.5 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">
                          {lead.client_name} <span className="text-[10px] text-gray-500 font-normal">({lead.lead_number})</span>
                        </p>
                        <p className="text-[11px] text-gray-500 truncate">
                          {lead.email || 'No Email'} {lead.mobile ? `• ${lead.mobile}` : ''}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={lead.status} />
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Email Content Inputs */}
          <Input
            label="Email Subject"
            id="leadSubject"
            placeholder="e.g., Special Announcement from EVS Immigration"
            value={leadSubject}
            onChange={(e) => setLeadSubject(e.target.value)}
            required
          />

          <div className="space-y-1">
            <label htmlFor="leadMessage" className="block text-xs font-semibold text-gray-700 mb-1">
              Email Message Body
            </label>
            <textarea
              id="leadMessage"
              rows="5"
              placeholder="Type your announcement or message for the leads..."
              value={leadMessage}
              onChange={(e) => setLeadMessage(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
            />
          </div>

          {/* Modal Action Buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setOpenLeadsModal(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={sendingLeadsEmail}
              className="flex items-center gap-2 bg-indigo-950 hover:bg-slate-800 text-white"
            >
              {sendingLeadsEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sendingLeadsEmail ? 'Sending Email...' : `Send Email Broadcast (${allLeadsFlag ? 'All' : selectedLeadIds.length})`}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default NotificationsList;
