
import React from 'react';
// Outlet removed for v5 compatibility
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuth } from '../../hooks/useAuth';
import { Role } from '../../types';
import Button from '../ui/Button';

// Layout now accepts children instead of using Outlet for v5 compatibility
const Layout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();

  // If user is pending, show a restricted view (Removed as per request to allow direct login)
  // if (user?.role === Role.PENDING) { ... }

  return (
    <div className="flex h-screen bg-background text-text-primary font-sans antialiased">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/50">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">
          {/* Outlet replaced with children in v5 */}
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
