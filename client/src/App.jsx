import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Menu, LogOut, User as UserIcon, Bell, Search, Folder, Users, FileText, Clipboard, Settings, Database, Activity, X, MessageSquare, Moon, Maximize } from 'lucide-react';

import Login from './pages/Login';
import { AdminDashboard, CounselorDashboard, CaseManagerDashboard } from './pages/Dashboards';
import { LeadList, LeadDetail, LeadForm, LeadImportWizard } from './pages/Leads';
import { CaseList, CaseDetail } from './pages/Cases';
import { UsersList } from './pages/UsersList';
import { ActivityLogsList } from './pages/ActivityLogsList';
import { PackagesList } from './pages/PackagesList';
import { DocumentList } from './pages/DocumentList';
import { ReportsPanel } from './pages/ReportsPanel';
import { DocumentCategoriesList } from './pages/DocumentCategoriesList';
import { PaymentsList } from './pages/PaymentsList';
import { SettingsPanel } from './pages/SettingsPanel';
import { NotificationsList } from './pages/NotificationsList';
import { DashboardLayout } from './components/DashboardLayout';

axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'https://evs-crm.towsindia.com';
axios.defaults.withCredentials = true;

const initialToken = localStorage.getItem('token');
if (initialToken) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${initialToken}`;
}

axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

const queryClient = new QueryClient();
export const AuthContext = createContext(null);

const ProtectedRoute = ({ children, roles = [] }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  const userRole = user?.role?.name || user?.role;
  if (roles.length > 0 && !roles.includes(userRole)) {
    return <Navigate to="/dashboard" replace />;
  }
  return <DashboardLayout>{children}</DashboardLayout>;
};

const AppContent = () => {
  const { user, loading } = useContext(AuthContext);
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-slate-600 border-t-transparent rounded-full" />
      </div>
    );
  }
  const userRole = user?.role?.name || user?.role;
  return (
    <Routes base="/">
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          {userRole === 'ADMIN' || userRole === 'LEAD_MANAGER' ? <AdminDashboard /> : null}
          {userRole === 'COUNSELOR' ? <CounselorDashboard /> : null}
          {userRole === 'CASE_MANAGER' ? <CaseManagerDashboard /> : null}
        </ProtectedRoute>
      } />
      <Route path="/leads" element={<ProtectedRoute roles={['ADMIN', 'LEAD_MANAGER', 'COUNSELOR']}><LeadList /></ProtectedRoute>} />
      <Route path="/leads/new" element={<ProtectedRoute roles={['ADMIN', 'LEAD_MANAGER', 'COUNSELOR']}><LeadForm /></ProtectedRoute>} />
      <Route path="/leads/edit/:id" element={<ProtectedRoute roles={['ADMIN', 'LEAD_MANAGER', 'COUNSELOR']}><LeadForm /></ProtectedRoute>} />
      <Route path="/leads/:id" element={<ProtectedRoute roles={['ADMIN', 'LEAD_MANAGER', 'COUNSELOR']}><LeadDetail /></ProtectedRoute>} />
      <Route path="/leads/import" element={<ProtectedRoute roles={['ADMIN', 'LEAD_MANAGER']}><LeadImportWizard /></ProtectedRoute>} />
      <Route path="/cases" element={<ProtectedRoute roles={['ADMIN', 'LEAD_MANAGER', 'CASE_MANAGER', 'COUNSELOR']}><CaseList /></ProtectedRoute>} />
      <Route path="/cases/:id" element={<ProtectedRoute roles={['ADMIN', 'LEAD_MANAGER', 'CASE_MANAGER', 'COUNSELOR']}><CaseDetail /></ProtectedRoute>} />
      <Route path="/documents" element={<ProtectedRoute roles={['ADMIN', 'LEAD_MANAGER', 'CASE_MANAGER', 'COUNSELOR']}><DocumentList /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute roles={['ADMIN']}><SettingsPanel /></ProtectedRoute>} />
      <Route path="/document-categories" element={<ProtectedRoute roles={['ADMIN']}><DocumentCategoriesList /></ProtectedRoute>} />
      <Route path="/payments" element={<ProtectedRoute roles={['ADMIN', 'LEAD_MANAGER', 'CASE_MANAGER', 'COUNSELOR']}><PaymentsList /></ProtectedRoute>} />
      <Route path="/packages" element={<ProtectedRoute roles={['ADMIN', 'LEAD_MANAGER']}><PackagesList /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute roles={['ADMIN', 'LEAD_MANAGER']}><ReportsPanel /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute roles={['ADMIN']}><UsersList /></ProtectedRoute>} />
      <Route path="/activity" element={<ProtectedRoute roles={['ADMIN']}><ActivityLogsList /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><NotificationsList /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/v1/auth/me')
      .then(res => {
        setUser(res.data.data.user);
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
        setLoading(false);
      });

    const refreshInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          originalRequest.url !== '/api/v1/auth/refresh' &&
          originalRequest.url !== '/api/v1/auth/me' &&
          originalRequest.url !== '/api/v1/auth/login'
        ) {
          originalRequest._retry = true;
          try {
            const refreshRes = await axios.post('/api/v1/auth/refresh');
            if (refreshRes.data?.data?.token) {
              const newToken = refreshRes.data.data.token;
              localStorage.setItem('token', newToken);
              axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
              originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
            }
            return axios(originalRequest);
          } catch (refreshError) {
            localStorage.removeItem('token');
            delete axios.defaults.headers.common['Authorization'];
            setUser(null);
            return Promise.reject(refreshError);
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(refreshInterceptor);
    };
  }, []);

  const login = (userData, token) => {
    if (token) {
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    axios.post('/api/v1/auth/logout').finally(() => {
      setUser(null);
    });
  };

  const refetchUser = () => {
    return axios.get('/api/v1/auth/me')
      .then(res => {
        if (res.data?.data?.user) {
          setUser(res.data.data.user);
        }
      })
      .catch(() => { });
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={{ user, loading, login, logout, refetchUser }}>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

export default App;
