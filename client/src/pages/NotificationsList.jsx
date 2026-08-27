import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Bell, Send, CheckCircle, AlertTriangle, Info, Check, Users } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { AuthContext } from '../App';

export const NotificationsList = () => {
  const { user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  
  const [dispatchType, setDispatchType] = useState('ALL');
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('SYSTEM_ALERT');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchNotifications();
    if (user?.role === 'ADMIN') {
      fetchUsers();
    }
  }, [user]);

  const fetchNotifications = () => {
    axios.get('/api/v1/notifications').then(res => {
      setNotifications(res.data.data || []);
    });
  };

  const fetchUsers = () => {
    axios.get('/api/v1/users').then(res => {
      setUsers(res.data.data || []);
    });
  };

  const handleMarkAsRead = (id) => {
    axios.patch(`/api/v1/notifications/${id}/read`).then(() => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    });
  };

  const handleMarkAllAsRead = () => {
    axios.patch('/api/v1/notifications/read-all').then(() => {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    });
  };

  const toggleUserSelection = (uid) => {
    setSelectedUserIds(prev =>
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleSendNotification = (e) => {
    e.preventDefault();
    if (!title || !message) {
      alert('Title and message are required');
      return;
    }

    if (dispatchType === 'SPECIFIC' && selectedUserIds.length === 0) {
      alert('Please select at least one recipient user');
      return;
    }

    setSubmitting(true);
    axios.post('/api/v1/notifications/send', {
      allUsers: dispatchType === 'ALL',
      userIds: dispatchType === 'SPECIFIC' ? selectedUserIds : [],
      title,
      message,
      type
    }).then(res => {
      alert(res.data.message || 'Notification sent successfully');
      setTitle('');
      setMessage('');
      setSelectedUserIds([]);
      setSubmitting(false);
    }).catch(err => {
      alert(err.response?.data?.message || 'Failed to dispatch notification');
      setSubmitting(false);
    });
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-1">Read system alerts and corporate broadcasts</p>
        </div>
        {notifications.some(n => !n.is_read) && (
          <button
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 transition-colors ml-auto md:ml-0"
          >
            <Check className="h-4 w-4" /> Mark All as Read
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card title="Inbox">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                <Bell className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                No notifications found.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => !n.is_read && handleMarkAsRead(n.id)}
                    className={`flex items-start gap-4 p-4 transition-colors cursor-pointer rounded-xl ${!n.is_read ? 'bg-blue-50/40 hover:bg-blue-50/70' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm ${!n.is_read ? 'font-bold text-slate-900' : 'text-slate-700 font-medium'}`}>
                          {n.title}
                        </p>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap">
                          {new Date(n.created_at || n.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 leading-relaxed">{n.message}</p>
                    </div>
                    {!n.is_read && (
                      <span className="h-2 w-2 rounded-full bg-blue-600 flex-shrink-0 mt-2" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {user?.role === 'ADMIN' && (
          <div className="space-y-6">
            <Card title="Send Broadcast">
              <form onSubmit={handleSendNotification} className="space-y-4">
                <Select
                  label="Recipients Group"
                  id="dispatchType"
                  options={[
                    { value: 'ALL', label: 'All Active Users (Bulk)' },
                    { value: 'SPECIFIC', label: 'Select Specific Users' }
                  ]}
                  value={dispatchType}
                  onChange={(e) => setDispatchType(e.target.value)}
                />

                {dispatchType === 'SPECIFIC' && (
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Select Recipients</label>
                    <div className="max-h-40 overflow-y-auto border border-gray-150 rounded-lg p-2.5 space-y-2 bg-white">
                      {users.filter(u => u.status === 'ACTIVE').map(u => (
                        <label key={u.id} className="flex items-center gap-2.5 text-xs text-slate-700 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={selectedUserIds.includes(u.id)}
                            onChange={() => toggleUserSelection(u.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                          />
                          <span>{u.name} <span className="text-[10px] text-gray-400">({u.role})</span></span>
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
                  label="Title"
                  id="title"
                  placeholder="Notification Heading..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />

                <div className="space-y-1">
                  <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-1">Message Content</label>
                  <textarea
                    id="message"
                    rows="4"
                    placeholder="Type broadcast message details here..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-slate-500 bg-white"
                  />
                </div>

                <Button type="submit" className="w-full flex items-center justify-center gap-2 mt-2" disabled={submitting}>
                  <Send className="h-4 w-4" /> {submitting ? 'Sending...' : 'Send Notification'}
                </Button>
              </form>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsList;
