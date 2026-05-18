
import React from 'react';
// Use v6 components
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

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/*" element={
        !user ? <Navigate to="/login" replace /> : (
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
        )
      } />
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