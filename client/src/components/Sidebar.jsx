import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Clipboard, Folder, Users, FileText, User as UserIcon, Activity, Settings, LogOut, X, Bell } from 'lucide-react';

export const Sidebar = ({ user, logout, mobileOpen, setMobileOpen, logoIcon, appName }) => {
  const location = useLocation();
  const [imgError, setImgError] = useState(false);
  const [internalLogo, setInternalLogo] = useState(logoIcon || '');
  const [internalAppName, setInternalAppName] = useState(appName || 'EVG CRM');

  useEffect(() => {
    if (logoIcon) {
      setInternalLogo(logoIcon);
    }
    if (appName) {
      setInternalAppName(appName);
    }
  }, [logoIcon, appName]);

  useEffect(() => {
    setImgError(false);
  }, [internalLogo]);

  useEffect(() => {
    axios
      .get('/api/v1/settings/branding')
      .then((res) => {
        if (res.data.success && res.data.data) {
          if (res.data.data.logo_icon) setInternalLogo(res.data.data.logo_icon);
          if (res.data.data.app_name) setInternalAppName(res.data.data.app_name);
        }
      })
      .catch(() => { });
  }, []);

  const getImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('blob:') || path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    const baseUrl = import.meta.env.VITE_API_URL || 'https://evs-crm.towsindia.com';
    return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const overviewLinks = [
    { label: 'Dashboard', to: '/dashboard', icon: Clipboard }
  ];
  const crmLinks = [];
  const mgmtLinks = [];
  const reportLinks = [];
  const adminLinks = [];

  if (user?.role === 'ADMIN' || user?.role === 'LEAD_MANAGER') {
    crmLinks.push({ label: 'Leads', to: '/leads', icon: Users });
    crmLinks.push({ label: 'Cases', to: '/cases', icon: Folder });
    crmLinks.push({ label: 'Documents', to: '/documents', icon: FileText });
    reportLinks.push({ label: 'Reports', to: '/reports', icon: Clipboard });
  } else if (user?.role === 'COUNSELOR') {
    crmLinks.push({ label: 'My Leads', to: '/leads', icon: Users });
    crmLinks.push({ label: 'Cases', to: '/cases', icon: Folder });
    crmLinks.push({ label: 'Documents', to: '/documents', icon: FileText });
    crmLinks.push({ label: 'Notifications', to: '/notifications', icon: Bell });
  } else if (user?.role === 'CASE_MANAGER') {
    crmLinks.push({ label: 'My Cases', to: '/cases', icon: Folder });
    crmLinks.push({ label: 'Documents', to: '/documents', icon: FileText });
  }

  if (user?.role === 'ADMIN' || user?.role === 'LEAD_MANAGER' || user?.role === 'CASE_MANAGER' || user?.role === 'COUNSELOR') {
    mgmtLinks.push({ label: 'Payments Ledger', to: '/payments', icon: Clipboard });
  }

  if (user?.role === 'ADMIN') {
    mgmtLinks.push({ label: 'Doc Categories', to: '/document-categories', icon: FileText });
    mgmtLinks.push({ label: 'Users Manager', to: '/users', icon: UserIcon });
    adminLinks.push({ label: 'Notifications', to: '/notifications', icon: Bell });
    adminLinks.push({ label: 'Activity Logs', to: '/activity', icon: Activity });
    adminLinks.push({ label: 'Settings', to: '/settings', icon: Settings });
  }

  const renderSection = (title, items) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-1">
        <span className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 mt-4">{title}</span>
        {items.map(link => {
          const Icon = link.icon;
          const active = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${active ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/10' : 'text-slate-500 hover:bg-slate-100/70 hover:text-slate-800'}`}
            >
              <Icon className="mr-3 h-5 w-5" />
              {link.label}
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white text-slate-700 transform transition-transform duration-200 lg:translate-x-0 lg:static lg:h-screen lg:flex lg:flex-col border-r border-gray-100 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="h-20 flex items-center justify-center px-6 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-3 min-w-0">
          {internalLogo && !imgError ? (
            <img
              src={getImageUrl(internalLogo)}
              alt={internalAppName || 'EVG CRM'}
              className="h-10 max-w-[150px] object-contain"
              onError={() => setImgError(true)}
            />
          ) : (
            <>
              <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 flex-shrink-0">
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2L2 22h20L12 2zm0 3l7.5 15h-15L12 5z" />
                </svg>
              </div>
              <div className="min-w-0">
                <span className="text-base font-bold text-slate-800 tracking-wide block truncate">{internalAppName || 'EVG CRM'}</span>
                <span className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase block truncate">Lead to Success</span>
              </div>
            </>
          )}
        </div>
        <button onClick={() => setMobileOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-650">
          <X className="h-6 w-6" />
        </button>
      </div>
      <nav className="flex-1 px-4 py-4 space-y-4 overflow-y-auto">
        {renderSection('Overview', overviewLinks)}
        {renderSection('CRM', crmLinks)}
        {renderSection('Management', mgmtLinks)}
        {renderSection('Reports', reportLinks)}
        {renderSection('Administration', adminLinks)}
      </nav>
      <div className="p-4 border-t border-gray-100 bg-slate-50/40">
        <div className="flex items-center mb-3">
          <div className="h-9 w-9 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-sm">
            {user?.name?.charAt(0) || 'S'}
          </div>
          <div className="ml-3 overflow-hidden">
            <p className="text-sm font-semibold text-slate-800 truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 font-semibold truncate capitalize">{user?.role === 'ADMIN' ? 'Administrator' : user?.role}</p>
          </div>
        </div>
        <button onClick={logout} className="w-full flex items-center justify-center px-4 py-2 bg-slate-50 border border-gray-150 rounded-md text-sm font-semibold text-red-650 hover:bg-red-50/60 hover:text-red-700 transition-all">
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};
