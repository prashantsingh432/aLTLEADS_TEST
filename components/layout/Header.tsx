
import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { LogoutIcon, CloudSyncIcon } from '../../constants';
import Button from '../ui/Button';
import { Role } from '../../types';

const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const { isSynced } = useData();

  return (
    <header className="h-16 bg-surface shadow-sm border-b border-gray-100 flex items-center justify-between px-6 z-10">
      <div className="flex items-center">
         <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">AltLeads Internal Portal</span>
      </div>
      
      <div className="flex items-center space-x-6">
        {isSynced && (
            <div title="Real-time sync active" className="text-accent flex items-center text-xs font-medium bg-blue-50 px-2 py-1 rounded-full">
                <CloudSyncIcon />
                <span className="ml-1">Live Sync</span>
            </div>
        )}
        
        <div className="flex items-center space-x-3 pl-6 border-l border-gray-200">
            <div className="text-right">
            <p className="text-sm font-semibold text-text-primary">{user?.name}</p>
            <p className={`text-xs ${user?.role === Role.PENDING ? 'text-red-500 font-bold' : 'text-text-secondary'}`}>
                {user?.role === Role.ADMIN ? 'Administrator' : user?.role}
            </p>
            </div>
            <div className="h-10 w-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-white font-bold shadow-md">
            {user?.name.charAt(0).toUpperCase()}
            </div>
            <Button onClick={logout} variant="ghost" size="icon" className="text-gray-400 hover:text-red-600">
                <LogoutIcon />
            </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;