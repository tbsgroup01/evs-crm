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

axios.defaults.baseURL = 'http://localhost:5505';
axios.defaults.withCredentials = true;

const queryClient = new QueryClient();
export const AuthContext = createContext(null);

const ProtectedRoute = ({ children, roles = [] }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (roles.length > 0 && !roles.includes(user.role)) {
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
  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          {user?.role === 'ADMIN' || user?.role === 'LEAD_MANAGER' ? <AdminDashboard /> : null}
          {user?.role === 'COUNSELOR' ? <CounselorDashboard /> : null}
          {user?.role === 'CASE_MANAGER' ? <CaseManagerDashboard /> : null}
        </ProtectedRoute>
      } />
      <Route path="/leads" element={<ProtectedRoute><LeadList /></ProtectedRoute>} />
      <Route path="/leads/new" element={<ProtectedRoute><LeadForm /></ProtectedRoute>} />
      <Route path="/leads/edit/:id" element={<ProtectedRoute><LeadForm /></ProtectedRoute>} />
      <Route path="/leads/:id" element={<ProtectedRoute><LeadDetail /></ProtectedRoute>} />
      <Route path="/leads/import" element={<ProtectedRoute roles={['ADMIN', 'LEAD_MANAGER']}><LeadImportWizard /></ProtectedRoute>} />
      <Route path="/cases" element={<ProtectedRoute><CaseList /></ProtectedRoute>} />
      <Route path="/cases/:id" element={<ProtectedRoute><CaseDetail /></ProtectedRoute>} />
      <Route path="/documents" element={<ProtectedRoute><DocumentList /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute roles={['ADMIN']}><SettingsPanel /></ProtectedRoute>} />
      <Route path="/document-categories" element={<ProtectedRoute roles={['ADMIN']}><DocumentCategoriesList /></ProtectedRoute>} />
      <Route path="/payments" element={<ProtectedRoute roles={['ADMIN']}><PaymentsList /></ProtectedRoute>} />
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
          originalRequest.url !== '/api/v1/auth/me'
        ) {
          originalRequest._retry = true;
          try {
            await axios.post('/api/v1/auth/refresh');
            return axios(originalRequest);
          } catch (refreshError) {
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

  const login = (userData) => {
    setUser(userData);
  };

  const logout = () => {
    axios.post('/api/v1/auth/logout').then(() => {
      setUser(null);
    });
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={{ user, loading, login, logout }}>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

export default App;
