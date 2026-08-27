import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

export const DashboardLayout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchVal, setSearchVal] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      axios.get('/api/v1/notifications').then(res => setNotifications(res.data.data || []));
    }
  }, [user]);

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearchVal(val);
    if (val.trim().length > 1) {
      axios.get(`/api/v1/search?q=${val}`).then(res => setSearchResults(res.data.data || []));
    } else {
      setSearchResults([]);
    }
  };

  const markNotifRead = (id) => {
    axios.patch(`/api/v1/notifications/${id}/read`).then(() => {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    });
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex">
      <Sidebar user={user} logout={logout} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-screen">
        <Navbar
          user={user}
          searchVal={searchVal}
          handleSearch={handleSearch}
          searchResults={searchResults}
          setSearchVal={setSearchVal}
          setSearchResults={setSearchResults}
          unreadCount={unreadCount}
          notifOpen={notifOpen}
          setNotifOpen={setNotifOpen}
          notifications={notifications}
          markNotifRead={markNotifRead}
          setNotifications={setNotifications}
          setMobileOpen={setMobileOpen}
        />
        
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
export default DashboardLayout;
