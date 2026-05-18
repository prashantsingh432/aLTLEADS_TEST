
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ValidatedField from '../components/ui/ValidatedField';
import Modal from '../components/ui/Modal';
import ProspectForm from '../components/prospects/ProspectForm';
import { Prospect, Role, RequestStatus, Comment } from '../types';

const ProspectsListPage: React.FC = () => {
  const { prospects, markValidation, addProspect, addToHistory, createContactRequest, addComment } = useData();
  const { user } = useAuth();
  
  // Search State
  const [inputValue, setInputValue] = useState(''); 
  const [searchTerm, setSearchTerm] = useState(''); 
  const [hasSearched, setHasSearched] = useState(false);
  
  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProspectForComments, setSelectedProspectForComments] = useState<Prospect | null>(null);
  const [commentText, setCommentText] = useState('');
  
  const commentEndRef = useRef<HTMLDivElement>(null);

  const canEdit = user?.role === Role.ADMIN || user?.role === Role.DATA_TEAM;
  
  // Column Visibility
  const [visibleColumns, setVisibleColumns] = useState({
      company: true,
      city: true,
      name: true,
      designation: true,
      email: true,
      phone: true,
      linkedin: true,
  });
  const [showColMenu, setShowColMenu] = useState(false);

  // Debounce & History Logic
  useEffect(() => {
      const timer = setTimeout(() => {
          if (inputValue.trim()) {
              setSearchTerm(inputValue);
              setHasSearched(true);
              addToHistory(inputValue);
          } else {
              setSearchTerm('');
              // If cleared, reset search state so blank screen shows again
              if (inputValue === '') setHasSearched(false);
          }
      }, 500); 

      return () => clearTimeout(timer);
  }, [inputValue, addToHistory]);

  // Scroll to bottom of comments when modal opens or comment adds
  useEffect(() => {
    if (selectedProspectForComments) {
        setTimeout(() => {
            commentEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    }
  }, [selectedProspectForComments?.comments?.length, selectedProspectForComments]);

  const filteredResults = useMemo(() => {
    if (!searchTerm) return []; 

    const lowerTerm = searchTerm.toLowerCase().trim();

    return prospects.filter(prospect => {
      const check = (field?: string) => field && field.toLowerCase().includes(lowerTerm);
      return (
        check(prospect.fullName) ||
        check(prospect.companyName) ||
        check(prospect.workEmail) ||
        check(prospect.personalLinkedin) || 
        check(prospect.companyLinkedin) ||  
        check(prospect.website)
      );
    });
  }, [prospects, searchTerm]);

  const displayProspects = filteredResults.slice(0, 100);
  const totalMatches = filteredResults.length;
  const isTruncated = totalMatches > 100;

  const toggleColumn = (col: keyof typeof visibleColumns) => {
      setVisibleColumns(prev => ({...prev, [col]: !prev[col]}));
  };
  
  const handleAddProspect = async (data: Omit<Prospect, 'id' | 'lastUpdated'>) => {
      await addProspect(data);
      setIsAddModalOpen(false);
  };

  const handleRequestContact = (prospect: Prospect) => {
      if(confirm(`Request update for ${prospect.fullName}?`)) {
          createContactRequest({
              prospectId: prospect.id,
              prospectName: prospect.fullName,
              companyName: prospect.companyName,
              requestedBy: user?.name || 'Unknown',
              status: RequestStatus.PENDING
          });
          alert('Request Sent');
      }
  };

  const openCommentModal = (prospect: Prospect) => {
      setSelectedProspectForComments(prospect);
      setCommentText('');
  };

  const handlePostComment = async () => {
      if (!selectedProspectForComments || !commentText.trim() || !user) return;
      await addComment(selectedProspectForComments.id, user, commentText);
      setCommentText('');
      // Optimistically update the local view state to make UI snappy
      // The real update comes from Firestore listener shortly after
  };

  // Helper to format friendly time
  const formatTimeAgo = (date: Date) => {
      const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
      let interval = seconds / 31536000;
      if (interval > 1) return Math.floor(interval) + " years ago";
      interval = seconds / 2592000;
      if (interval > 1) return Math.floor(interval) + " months ago";
      interval = seconds / 86400;
      if (interval > 1) return Math.floor(interval) + " days ago";
      interval = seconds / 3600;
      if (interval > 1) return Math.floor(interval) + " hours ago";
      interval = seconds / 60;
      if (interval > 1) return Math.floor(interval) + " minutes ago";
      return Math.floor(seconds) + " seconds ago";
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-text-primary">Prospects</h1>
            <p className="text-sm text-text-secondary">Search database to view results</p>
        </div>
        
        <div className="flex space-x-3 w-full sm:w-auto">
             <div className="relative">
                 <button 
                    onClick={() => setShowColMenu(!showColMenu)}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none shadow-sm"
                 >
                     Columns ▾
                 </button>
                 {showColMenu && (
                     <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-xl ring-1 ring-black ring-opacity-5 z-20 p-2">
                         {Object.keys(visibleColumns).map((key) => (
                             <label key={key} className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer">
                                 <input 
                                    type="checkbox" 
                                    checked={visibleColumns[key as keyof typeof visibleColumns]}
                                    onChange={() => toggleColumn(key as keyof typeof visibleColumns)}
                                    className="mr-2 rounded text-accent focus:ring-accent"
                                 />
                                 <span className="capitalize text-sm text-gray-700">{key}</span>
                             </label>
                         ))}
                     </div>
                 )}
             </div>
             
             {canEdit && (
                 <Button onClick={() => setIsAddModalOpen(true)}>
                    + Add Prospect
                 </Button>
             )}
        </div>
      </div>
      
      {/* 
         Removed overflow-hidden from the Card wrapper here to ensure the Column Dropdown
         in the Toolbar (which is absolutely positioned) is not clipped.
         The table container below handles the scrolling.
       */}
      <Card className="p-0 border border-border shadow-sm flex-1 flex flex-col bg-white relative z-0">
        {/* Toolbar */}
        <div className="p-4 border-b border-border bg-slate-50 flex items-center justify-between sticky top-0 z-10">
            <div className="relative max-w-md w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <input 
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-accent focus:border-accent sm:text-sm shadow-sm transition-all"
                    placeholder="Search by name, company, linkedin..."
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    autoFocus
                />
            </div>
            {hasSearched && (
                <div className="text-sm text-text-secondary">
                    {isTruncated ? (
                        <span className="text-amber-600 font-medium">
                            Showing top 100 of {totalMatches} results (Refine search)
                        </span>
                    ) : (
                        <span>Showing <span className="font-semibold text-text-primary">{totalMatches}</span> results</span>
                    )}
                </div>
            )}
        </div>
        
        {/* Table / Blank State */}
        <div className="flex-1 overflow-auto bg-gray-50">
          {!hasSearched ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-lg font-medium">Enter a search term to find prospects</p>
                  <p className="text-sm mt-2">Search by Name, Company, or LinkedIn URL</p>
              </div>
          ) : (
              <table className="min-w-full divide-y divide-border bg-white shadow-sm rounded-b-lg">
                <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
                  <tr>
                    {visibleColumns.name && <th className="px-6 py-3 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Name</th>}
                    {visibleColumns.company && <th className="px-6 py-3 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Company</th>}
                    {visibleColumns.designation && <th className="px-6 py-3 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Designation</th>}
                    {visibleColumns.city && <th className="px-6 py-3 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">City</th>}
                    {visibleColumns.email && <th className="px-6 py-3 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Work Email</th>}
                    {visibleColumns.phone && <th className="px-6 py-3 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">Phone</th>}
                    {visibleColumns.linkedin && <th className="px-6 py-3 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">LinkedIn</th>}
                    <th className="px-6 py-3 text-right text-xs font-bold text-text-secondary uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {displayProspects.map((prospect: Prospect) => (
                    <tr key={prospect.id} className="hover:bg-blue-50/50 transition-colors group">
                      {visibleColumns.name && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-text-primary">
                            <Link to={`/prospects/${prospect.id}`} className="hover:text-accent hover:underline">{prospect.fullName}</Link>
                          </td>
                      )}
                      {visibleColumns.company && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                            {prospect.companyName}
                            {prospect.website && (
                                 <a href={`https://${prospect.website}`} target="_blank" rel="noreferrer" className="ml-2 text-gray-400 hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity">↗</a>
                            )}
                        </td>
                      )}
                      {visibleColumns.designation && <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{prospect.designation}</td>}
                      {visibleColumns.city && <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{prospect.city}</td>}
                      {visibleColumns.email && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <ValidatedField 
                                value={prospect.workEmail} 
                                disposition={prospect.workEmailDisposition} 
                                type="email"
                                canEdit={canEdit}
                                onUpdate={(d) => markValidation(prospect.id, 'workEmailDisposition', d)}
                            />
                        </td>
                      )}
                      {visibleColumns.phone && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <ValidatedField 
                                value={prospect.contactNumber1} 
                                disposition={prospect.contactNumber1Disposition} 
                                type="phone"
                                canEdit={canEdit}
                                onUpdate={(d) => markValidation(prospect.id, 'contactNumber1Disposition', d)}
                            />
                        </td>
                      )}
                      {visibleColumns.linkedin && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                             {prospect.personalLinkedin ? (
                                 <a href={`https://${prospect.personalLinkedin}`} target="_blank" className="text-accent hover:underline text-xs bg-blue-50 px-2 py-1 rounded">Profile</a>
                             ) : <span className="text-gray-300">-</span>}
                          </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex items-center justify-end space-x-2">
                         <button 
                            onClick={() => openCommentModal(prospect)}
                            title="Comments"
                            className={`relative ${prospect.comments && prospect.comments.length > 0 ? 'text-accent' : 'text-gray-300 hover:text-gray-500'}`}
                         >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                            {prospect.comments && prospect.comments.length > 0 && (
                                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-3 h-3 flex items-center justify-center rounded-full">
                                    {prospect.comments.length}
                                </span>
                            )}
                         </button>
                         
                         {/* Allowed for everyone now */}
                         <button onClick={() => handleRequestContact(prospect)} title="Request Info Update" className="text-blue-600 hover:bg-blue-100 p-1 rounded">
                             <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                         </button>
                         
                         <Link to={`/prospects/${prospect.id}`} className="text-text-secondary hover:text-accent bg-gray-50 hover:bg-white border border-gray-200 rounded px-3 py-1 text-xs transition-all">Details</Link>
                      </td>
                    </tr>
                  ))}
                  {displayProspects.length === 0 && (
                      <tr>
                          <td colSpan={10} className="px-6 py-12 text-center text-text-secondary">
                              No prospects found matching your search.
                          </td>
                      </tr>
                  )}
                </tbody>
              </table>
          )}
        </div>
      </Card>
      
      {/* Add Prospect Modal */}
      <Modal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        title="Add New Prospect"
        size="xl"
      >
          <ProspectForm 
            onSubmit={handleAddProspect} 
            onCancel={() => setIsAddModalOpen(false)} 
          />
      </Modal>

      {/* FB Style Comments Modal */}
      <Modal
        isOpen={!!selectedProspectForComments}
        onClose={() => setSelectedProspectForComments(null)}
        title={`Comments: ${selectedProspectForComments?.fullName}`}
        size="md"
      >
          <div className="flex flex-col h-[500px]">
              {/* Comment History */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
                  {(!selectedProspectForComments?.comments || selectedProspectForComments.comments.length === 0) && (
                      <div className="text-center text-gray-400 mt-20">
                          <p>No comments yet.</p>
                          <p className="text-xs">Start the conversation below.</p>
                      </div>
                  )}
                  {selectedProspectForComments?.comments?.map((comment: Comment) => (
                      <div key={comment.id} className="flex space-x-3 group">
                          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                              {comment.userName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 bg-gray-50 p-3 rounded-2xl rounded-tl-none hover:bg-gray-100 transition-colors">
                              <div className="flex justify-between items-baseline mb-1">
                                  <span className="font-semibold text-sm text-gray-900">{comment.userName}</span>
                                  <span className="text-xs text-gray-500">{formatTimeAgo(comment.timestamp)}</span>
                              </div>
                              <p className="text-sm text-gray-800 whitespace-pre-wrap">{comment.text}</p>
                          </div>
                      </div>
                  ))}
                  <div ref={commentEndRef} />
              </div>

              {/* Legacy Remark Info */}
              {selectedProspectForComments?.remark && (
                  <div className="text-xs text-gray-500 bg-yellow-50 p-2 rounded mb-2 border border-yellow-100">
                      <strong>Legacy Remark:</strong> {selectedProspectForComments.remark}
                  </div>
              )}

              {/* Input Area */}
              <div className="border-t pt-4">
                  <div className="flex items-start space-x-2">
                      <div className="flex-1">
                          <textarea 
                              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-accent focus:border-accent resize-none text-sm"
                              rows={2}
                              placeholder="Write a comment..."
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                      e.preventDefault();
                                      handlePostComment();
                                  }
                              }}
                          />
                          <p className="text-[10px] text-gray-400 mt-1 text-right">Press Enter to post</p>
                      </div>
                      <Button onClick={handlePostComment} disabled={!commentText.trim()}>Post</Button>
                  </div>
              </div>
          </div>
      </Modal>
    </div>
  );
};

export default ProspectsListPage;
