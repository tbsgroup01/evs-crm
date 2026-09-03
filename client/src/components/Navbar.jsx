import React, { useEffect, useRef } from 'react';
import { Menu, Search, Bell, MessageSquare, Moon, Maximize } from 'lucide-react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export const Navbar = ({
  user,
  searchVal,
  handleSearch,
  searchResults,
  setSearchVal,
  setSearchResults,
  unreadCount,
  notifOpen,
  setNotifOpen,
  notifications,
  markNotifRead,
  setNotifications,
  setMobileOpen
}) => {
  const navigate = useNavigate();
  const notifRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    };

    if (notifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [notifOpen, setNotifOpen]);

  useEffect(() => {
    const handleClickOutsideSearch = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchResults([]);
      }
    };

    if (searchResults.length > 0) {
      document.addEventListener('mousedown', handleClickOutsideSearch);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutsideSearch);
    };
  }, [searchResults, setSearchResults]);

  return (
    <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-6 z-30 shrink-0">
      <div className="flex items-center">
        <button onClick={() => setMobileOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700 mr-4">
          <Menu className="h-6 w-6" />
        </button>
        <div ref={searchRef} className="relative w-64 md:w-96">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchVal}
            onChange={handleSearch}
            placeholder="Search leads, cases, clients, documents..."
            className="w-full pl-9 pr-16 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-slate-500 bg-gray-50/50"
          />
          <div className="absolute right-3 top-3 text-[10px] font-bold text-gray-400 border border-gray-200 rounded px-1.5 py-0.5 bg-white leading-none">
            Ctrl + K
          </div>
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 mt-2 bg-white rounded-md border border-gray-200 shadow-lg z-50 max-h-80 overflow-y-auto">
              {searchResults.map((r, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSearchVal('');
                    setSearchResults([]);
                    navigate(r.quickAction);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 flex items-center justify-between text-sm"
                >
                  <div>
                    <span className="font-semibold text-gray-900">{r.name}</span>
                    <span className="text-xs text-gray-400 ml-2">[{r.category}]</span>
                  </div>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded uppercase font-semibold">{r.status}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div ref={notifRef} className="relative">
          <button onClick={() => setNotifOpen(!notifOpen)} className="p-2 text-slate-400 hover:text-slate-600 relative rounded-full hover:bg-slate-50 transition-colors">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 h-4 w-4 bg-red-600 rounded-full flex items-center justify-center text-[10px] text-white font-bold leading-none">
                {unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-md border border-gray-200 shadow-lg z-50 py-2 max-h-96 overflow-y-auto">
              <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                <span className="font-semibold text-sm text-gray-900">Notifications</span>
                <button
                  onClick={() => {
                    axios.patch('/api/v1/notifications/read-all').then(() => {
                      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
                    });
                  }}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Mark all read
                </button>
              </div>
              {notifications.length === 0 ? (
                <p className="text-center text-xs text-gray-500 py-4">No notifications.</p>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => {
                      markNotifRead(n.id);
                      if (n.entity_type === 'Lead') navigate(`/leads/${n.entity_id}`);
                      if (n.entity_type === 'Case') navigate(`/cases/${n.entity_id}`);
                      setNotifOpen(false);
                    }}
                    className={`px-4 py-3 hover:bg-gray-50 border-b border-gray-100 cursor-pointer text-xs ${!n.is_read ? 'bg-slate-50 font-medium' : ''}`}
                  >
                    <p className="text-gray-900 mb-0.5">{n.title}</p>
                    <p className="text-gray-500">{n.message}</p>
                  </div>
                ))
              )}
              <div className="px-4 py-2 border-t border-gray-100 text-center">
                <button
                  onClick={() => {
                    navigate('/notifications');
                    setNotifOpen(false);
                  }}
                  className="text-xs text-blue-600 hover:underline font-semibold"
                >
                  View All Notifications
                </button>
              </div>
            </div>
          )}
        </div>


        <div className="flex items-center gap-3 border-l pl-4 border-gray-100">
          <div className="h-9 w-9 rounded-full bg-purple-600 text-white font-bold text-sm flex items-center justify-center">
            {user?.name?.charAt(0) || 'S'}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-bold text-slate-900 leading-none">{user?.name}</p>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5 capitalize">{user?.role === 'ADMIN' ? 'Administrator' : user?.role}</p>
          </div>
        </div>
      </div>
    </header>
  );
};
