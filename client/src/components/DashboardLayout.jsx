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
  const [logoIcon, setLogoIcon] = useState('');
  const [faviconIcon, setFaviconIcon] = useState('');
  const [appName, setAppName] = useState('EVG CRM');
  const navigate = useNavigate();

  const getImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('blob:') || path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    const baseUrl = import.meta.env.VITE_API_URL || 'https://evs-crm.towsindia.com';
    return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  useEffect(() => {
    if (user) {
      axios.get('/api/v1/notifications').then((res) => setNotifications(res.data.data || []));
      axios
        .get('/api/v1/settings/branding')
        .then((res) => {
          if (res.data.success && res.data.data) {
            const { logo_icon, favicon_icon, app_name } = res.data.data;
            if (logo_icon) setLogoIcon(logo_icon);
            if (favicon_icon) {
              setFaviconIcon(favicon_icon);
              let link = document.querySelector("link[rel~='icon']");
              if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.getElementsByTagName('head')[0].appendChild(link);
              }
              link.href = getImageUrl(favicon_icon);
            }
            if (app_name) {
              setAppName(app_name);
              document.title = app_name;
            }
          }
        })
        .catch(() => { });
    }
  }, [user]);

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearchVal(val);
    if (val.trim().length > 1) {
      axios.get(`/api/v1/search?q=${val}`).then((res) => setSearchResults(res.data.data || []));
    } else {
      setSearchResults([]);
    }
  };

  const markNotifRead = (id) => {
    axios.patch(`/api/v1/notifications/${id}/read`).then(() => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    });
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex">
      <Sidebar
        user={user}
        logout={logout}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        logoIcon={logoIcon}
        appName={appName}
      />

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
