
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { NAV_LINKS } from '../../constants';
import { useAuth } from '../../hooks/useAuth';
import { Role } from '../../types';
import { isSuperAdmin } from '../../lib/permissions';

const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();
  const isRootAdmin = isSuperAdmin(user);

  return (
    <aside className={`${collapsed ? 'w-20' : 'w-72'} bg-primary flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out relative border-r border-gray-800`}>
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-6 bg-white/5 border-b border-gray-800">
        {!collapsed && (
          <div className="flex flex-col py-1">
            <span className="text-xl font-black tracking-tighter text-white leading-none">
              <span className="text-accent">Alt</span>Leads
            </span>
            {user?.role === Role.SUPER_ADMIN || isRootAdmin ? (
              <span className="text-[8px] font-black tracking-widest text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 rounded px-1.5 py-0.5 mt-1.5 shadow-[0_0_8px_rgba(34,211,238,0.15)] animate-pulse uppercase max-w-[130px] text-center">
                ⚡ ROOT DEVELOPER
              </span>
            ) : null}
          </div>
        )}
        {collapsed && (
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold text-accent">AL</span>
          {isRootAdmin ? (
              <span className="text-[7px] text-cyan-400 font-extrabold animate-pulse uppercase mt-0.5">DEV</span>
            ) : null}
          </div>
        )}
        
        <button 
            onClick={() => setCollapsed(!collapsed)}
            className="text-gray-400 hover:text-white focus:outline-none"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={collapsed ? "M13 5l7 7-7 7" : "M11 19l-7-7 7-7"} />
            </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {NAV_LINKS.map((link) => {
          // Access Control: Check if the user's role is in the allowed list
          if (link.roles && user && !isRootAdmin && !link.roles.includes(user.role)) {
              return null;
          }
          
          return (
            <NavLink
                key={link.name}
                to={link.href}
                className={({ isActive }) =>
                `flex items-center px-4 py-3 rounded-md transition-all duration-200 group ${
                    isActive
                    ? 'bg-accent text-white shadow-lg'
                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
                } ${collapsed ? 'justify-center' : ''}`
                }
                title={collapsed ? link.name : ''}
            >
                <span className={`${collapsed ? '' : 'mr-3'} transition-all`}>{link.icon}</span>
                {!collapsed && <span className="font-medium text-sm">{link.name}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer / User Badge */}
      <div className="p-4 border-t border-gray-800 bg-gray-900/50">
        {!collapsed ? (
            <div className="text-center">
                 <p className="text-xs text-gray-500 font-medium italic">AltLeads Intelligence v5.0</p>
                 <p className="text-[10px] text-gray-600 mt-1 uppercase tracking-widest">Authorized Access Only</p>
            </div>
        ) : (
             <div className="flex justify-center">
                 <div className="h-2 w-2 rounded-full bg-green-500"></div>
             </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;