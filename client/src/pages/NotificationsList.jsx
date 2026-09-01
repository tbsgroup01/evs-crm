import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import {
  Bell,
  Send,
  CheckCircle,
  AlertTriangle,
  Info,
  Check,
  Loader2,
  MailCheck,
  AlertCircle,
  Mail,
  Search,
  Users,
  Filter,
  Clock,
  Eye,
  Copy,
  Tag,
  FileText,
  Inbox,
  Sparkles
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
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [copied, setCopied] = useState(false);

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
      const list = res.data.data || [];
      setNotifications(list);
      if (list.length > 0) {
        setSelectedNotification((prev) => {
          if (!prev) return list[0];
          const updated = list.find((item) => item.id === prev.id);
          return updated || list[0];
        });
      }
    });
  };

  const handleCopyMessage = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSelectNotification = (n) => {
    setSelectedNotification(n);
    if (!n.is_read) {
      handleMarkAsRead(n.id);
    }
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
      setSelectedNotification((prev) => (prev && prev.id === id ? { ...prev, is_read: true } : prev));
    });
  };

  const handleMarkAllAsRead = () => {
    axios.patch('/api/v1/notifications/read-all').then(() => {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setSelectedNotification((prev) => (prev ? { ...prev, is_read: true } : prev));
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
        return (
          <div className="h-10 w-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 shadow-inner border border-emerald-200">
            <CheckCircle className="h-5 w-5" />
          </div>
        );
      case 'WARNING':
        return (
          <div className="h-10 w-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0 shadow-inner border border-amber-200">
            <AlertTriangle className="h-5 w-5" />
          </div>
        );
      default:
        return (
          <div className="h-10 w-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 shadow-inner border border-blue-200">
            <Info className="h-5 w-5" />
          </div>
        );
    }
  };

  const getHeaderGradient = (t) => {
    switch (t) {
      case 'SUCCESS':
        return 'from-emerald-600 via-teal-600 to-emerald-700 shadow-emerald-500/10';
      case 'WARNING':
        return 'from-amber-500 via-orange-500 to-amber-600 shadow-amber-500/10';
      default:
        return 'from-blue-600 via-indigo-600 to-blue-700 shadow-blue-500/10';
    }
  };

  return (
    <div className="space-y-6 mx-auto">
      {/* Top Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Notifications & Broadcasts</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">Read system alerts, inspect notification details, or dispatch corporate broadcasts.</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {canBroadcast && (
            <button
              onClick={() => {
                fetchLeads();
                setOpenLeadsModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-900 to-slate-900 text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Mail className="h-4 w-4 text-indigo-300" /> Broadcast Email to Leads
            </button>
          )}

          {notifications.some((n) => !n.is_read) && (
            <button
              onClick={handleMarkAllAsRead}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
            >
              <Check className="h-4 w-4 text-emerald-600" /> Mark All as Read
            </button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Inbox List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-blue-600" />
                <h2 className="text-base font-extrabold text-slate-900">Notification Inbox</h2>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-100">
                {notifications.length} Total
              </span>
            </div>

            {notifications.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs font-medium">
                <Bell className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                No notifications found.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
                {notifications.map((n) => {
                  const isSelected = selectedNotification?.id === n.id;

                  return (
                    <div
                      key={n.id}
                      onClick={() => handleSelectNotification(n)}
                      className={`flex items-start gap-3 p-3.5 rounded-2xl transition-all cursor-pointer border ${isSelected
                        ? 'bg-blue-50/70 border-blue-300 shadow-md ring-2 ring-blue-500/20'
                        : !n.is_read
                          ? 'bg-slate-50/90 border-blue-200/80 hover:bg-blue-50/40'
                          : 'bg-white border-slate-100 hover:bg-slate-50/70'
                        }`}
                    >
                      <div className="flex-shrink-0 mt-0.5">{getIcon(n.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-xs truncate ${!n.is_read ? 'font-black text-slate-900' : 'text-slate-700 font-bold'}`}>
                            {n.title}
                          </p>
                          {!n.is_read && <span className="h-2 w-2 rounded-full bg-blue-600 flex-shrink-0" />}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed font-medium">{n.message}</p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-1.5">
                          {new Date(n.created_at || n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Notification Details Viewer + Broadcast or Summary Widget */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Notification Details Viewer */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-600" />
                <h2 className="text-base font-extrabold text-slate-900">Notification Details</h2>
              </div>


            </div>

            {selectedNotification ? (
              <div className="space-y-5">
                {/* Hero Header Banner for Selected Notification */}
                <div className={`bg-gradient-to-r ${getHeaderGradient(selectedNotification.type)} rounded-2xl p-5 text-white shadow-lg relative overflow-hidden`}>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black bg-white/20 text-white uppercase tracking-wider backdrop-blur-md">
                      {selectedNotification.type || 'SYSTEM_ALERT'}
                    </span>
                    <span className="text-[11px] text-white/80 font-medium">
                      {new Date(selectedNotification.created_at || selectedNotification.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-white leading-snug">{selectedNotification.title}</h3>
                </div>

                {/* Metadata Info Badges Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 flex items-center gap-3">
                    <div className="h-9 w-9 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-bold">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">RECEIVED TIME</p>
                      <p className="text-xs font-black text-slate-900 mt-0.5">
                        {new Date(selectedNotification.created_at || selectedNotification.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 flex items-center gap-3">
                    <div className="h-9 w-9 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
                      <Eye className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">STATUS</p>
                      <p className="text-xs font-black text-slate-900 mt-0.5 flex items-center gap-1">
                        {selectedNotification.is_read ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                            <Check className="h-3 w-3" /> Read
                          </span>
                        ) : (
                          <span className="text-blue-600 font-bold">● Unread</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100 flex items-center gap-3">
                    <div className="h-9 w-9 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center font-bold">
                      <Tag className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">CATEGORY</p>
                      <p className="text-xs font-black text-slate-900 mt-0.5">{selectedNotification.type || 'SYSTEM_ALERT'}</p>
                    </div>
                  </div>
                </div>

                {/* Message Body Display Box */}
                <div className="bg-slate-50/60 p-5 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-slate-500 uppercase tracking-wider">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span>Notification Message</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 leading-relaxed pt-1 whitespace-pre-wrap">
                    {selectedNotification.message}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs font-medium">
                <Bell className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                Select a notification from the inbox list to view full details.
              </div>
            )}
          </div>

          {/* Card 2: Send Broadcast Panel (Admin/Manager) OR Inbox Stats Widget (Counselors) */}
          {canBroadcast ? (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Send className="h-5 w-5 text-blue-600" />
                <h2 className="text-base font-extrabold text-slate-900">Send Broadcast Notification</h2>
              </div>

              <form onSubmit={handleSendNotification} className="space-y-4">
                {alertStatus && (
                  <div
                    className={`p-3.5 rounded-xl flex items-start gap-2 text-xs font-semibold ${alertStatus.type === 'success'
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>

                {dispatchGroup === 'SPECIFIC' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-extrabold text-slate-700">Select User Recipients</label>
                    <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-3 space-y-2 bg-slate-50/50">
                      {usersList
                        .filter((u) => u.status === 'ACTIVE')
                        .map((u) => (
                          <label key={u.id} className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={selectedUserIds.includes(u.id)}
                              onChange={() => toggleUserSelection(u.id)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                            />
                            <span>
                              {u.name} <span className="text-[10px] text-slate-400 font-bold">({u.role})</span>
                            </span>
                          </label>
                        ))}
                    </div>
                  </div>
                )}

                <Input
                  label="Broadcast Title"
                  id="title"
                  placeholder="e.g., Monthly Strategy Meeting Announcement"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />

                <div className="space-y-1">
                  <label htmlFor="message" className="block text-xs font-extrabold text-slate-700 mb-1">
                    Message Content
                  </label>
                  <textarea
                    id="message"
                    rows="3"
                    placeholder="Enter full broadcast text to send to in-app inbox & email..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                  />
                </div>

                <Button type="submit" className="w-full flex items-center justify-center gap-2 mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2.5 rounded-xl shadow-md transition-all cursor-pointer" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {submitting ? 'Sending Broadcast...' : 'Send Broadcast & Email'}
                </Button>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <Sparkles className="h-5 w-5 text-indigo-600" />
                <h2 className="text-base font-extrabold text-slate-900">Inbox Summary & Quick Tips</h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50/70 border border-blue-100 p-4 rounded-2xl flex items-center gap-3">
                  <div className="h-10 w-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold flex-shrink-0 shadow-md shadow-blue-500/20">
                    <Inbox className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-blue-600 font-extrabold uppercase tracking-wider">TOTAL INBOX</p>
                    <p className="text-lg font-black text-slate-900 mt-0.5">{notifications.length}</p>
                  </div>
                </div>

                <div className="bg-amber-50/70 border border-amber-100 p-4 rounded-2xl flex items-center gap-3">
                  <div className="h-10 w-10 bg-amber-500 text-white rounded-xl flex items-center justify-center font-bold flex-shrink-0 shadow-md shadow-amber-500/20">
                    <Bell className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] text-amber-600 font-extrabold uppercase tracking-wider">UNREAD ALERTS</p>
                    <p className="text-lg font-black text-slate-900 mt-0.5">
                      {notifications.filter((n) => !n.is_read).length}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-50/60 border border-indigo-100/80 p-4 rounded-2xl space-y-1.5">
                <p className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                  <Info className="h-4 w-4 text-indigo-600" /> Counselor Notification Info
                </p>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  System notifications are automatically generated when leads are assigned or updated. Click any notification card in your inbox to read its full message and details.
                </p>
              </div>
            </div>
          )}
        </div>
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
              className={`p-3 rounded-lg flex items-start gap-2 text-xs font-medium ${leadsAlert.type === 'success'
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