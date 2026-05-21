
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';
import { DataProvider } from './context/DataContext';

import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProspectsListPage from './pages/ProspectsListPage';
import ProspectDetailsPage from './pages/ProspectDetailsPage';
import ContactRequestsPage from './pages/ContactRequestsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import HistoryPage from './pages/HistoryPage';
import AdminDatabasePage from './pages/AdminDatabasePage';
import AdminProductsPage from './pages/AdminProductsPage';
import AdminPersonasPage from './pages/AdminPersonasPage';
import AdminModelsPage from './pages/AdminModelsPage';
import AdminTeamPage from './pages/AdminTeamPage';
import NotFoundPage from './pages/NotFoundPage';

/**
 * ProtectedRoute – renders children ONLY when the auth state is known AND the
 * user is authenticated.  While hydration is still in progress (loading=true)
 * we render null so the router never makes a premature redirect decision.
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  // Session is still being restored — don't redirect yet
  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { user, loading } = useAuth();

  return (
    <Routes>
      {/*
       * /login route:
       * - While loading → render nothing (prevents flicker to login before hydration)
       * - Once loaded → redirect authenticated users to app root
       */}
      <Route
        path="/login"
        element={
          loading
            ? null
            : user
              ? <Navigate to="/" replace />
              : <LoginPage />
        }
      />

      {/* All protected routes */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="prospects" element={<ProspectsListPage />} />
                <Route path="prospects/:id" element={<ProspectDetailsPage />} />
                <Route path="requests" element={<ContactRequestsPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="history" element={<HistoryPage />} />
                <Route path="database" element={<AdminDatabasePage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="admin/products" element={<AdminProductsPage />} />
                <Route path="admin/team" element={<AdminTeamPage />} />
                <Route path="admin/models" element={<AdminModelsPage />} />
                <Route path="admin/personas" element={<AdminPersonasPage />} />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <DataProvider>
        <Router>
          <AppRoutes />
        </Router>
      </DataProvider>
    </AuthProvider>
  );
};

export default App;