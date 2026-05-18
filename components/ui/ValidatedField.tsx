import React, { useState } from 'react';
import { Disposition } from '../../types';

interface ValidatedFieldProps {
  value?: string;
  disposition: Disposition;
  onUpdate?: (newDisposition: Disposition) => void;
  type?: 'email' | 'phone' | 'text';
  canEdit?: boolean;
}

const ValidatedField: React.FC<ValidatedFieldProps> = ({ 
  value, 
  disposition, 
  onUpdate, 
  type = 'text',
  canEdit = true
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!value) return <span className="text-gray-400">-</span>;

  // Color Coding
  const getColor = (disp: Disposition) => {
    switch (disp) {
      case Disposition.ACCURATE:
        return 'text-green-700 bg-green-50 border-green-200';
      case Disposition.WRONG:
        return 'text-red-700 bg-red-50 border-red-200 line-through opacity-80';
      case Disposition.UNVERIFIED:
      default:
        return 'text-blue-700 bg-blue-50 border-blue-200';
    }
  };

  const handleCopy = (e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
  };

  const toggleMenu = (e: React.MouseEvent) => {
      if (canEdit && onUpdate) {
          e.stopPropagation();
          setShowMenu(!showMenu);
      }
  };
  
  const handleSelect = (d: Disposition) => {
      if (onUpdate) onUpdate(d);
      setShowMenu(false);
  }

  React.useEffect(() => {
    const close = () => setShowMenu(false);
    if(showMenu) window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [showMenu]);

  return (
    <div className="relative inline-flex items-center group max-w-full">
      {/* Main Value Pill - Click to Copy */}
      <div 
        className={`flex items-center border rounded-l px-2 py-1 text-xs font-medium transition-colors cursor-pointer hover:bg-opacity-80 ${getColor(disposition)} ${!canEdit ? 'rounded-r' : 'border-r-0'}`}
        onClick={handleCopy}
        title="Click to Copy"
      >
        <span className="truncate max-w-[140px]">{value}</span>
        {copied && <span className="ml-1 text-[10px] uppercase font-bold">Copied</span>}
      </div>

      {/* Disposition Trigger - Click to Validate */}
      {canEdit && (
          <button
            onClick={toggleMenu}
            className={`flex items-center justify-center px-1 py-1 border-y border-r rounded-r cursor-pointer hover:bg-gray-100 transition-colors ${getColor(disposition).replace('bg-', 'border-').split(' ')[2]}`}
            title="Update Status"
          >
              <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
          </button>
      )}

      {/* Email Link Shortcut */}
      {type === 'email' && (
             <a href={`mailto:${value}`} className="ml-1 text-gray-400 hover:text-gray-600" onClick={e => e.stopPropagation()} title="Send Email">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
             </a>
      )}

      {showMenu && (
        <div className="absolute z-50 top-full left-0 mt-1 w-32 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 py-1 focus:outline-none animate-in fade-in slide-in-from-top-1">
          <button 
            onClick={(e) => { e.stopPropagation(); handleSelect(Disposition.ACCURATE); }}
            className="w-full text-left px-4 py-2 text-xs font-medium text-green-700 hover:bg-green-50 flex items-center"
          >
            <span className="mr-2">✓</span> Accurate
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); handleSelect(Disposition.WRONG); }}
            className="w-full text-left px-4 py-2 text-xs font-medium text-red-700 hover:bg-red-50 flex items-center"
          >
            <span className="mr-2">✕</span> Wrong
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); handleSelect(Disposition.UNVERIFIED); }}
            className="w-full text-left px-4 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50 flex items-center"
          >
            <span className="mr-2">?</span> Unverified
          </button>
        </div>
      )}
    </div>
  );
};

export default ValidatedField;