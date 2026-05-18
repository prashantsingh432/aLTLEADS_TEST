// FIX: Declare chrome to provide types for Chrome extension APIs.
declare const chrome: any;

import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from '../lib/supabase';
import { Prospect, Disposition, RequestStatus } from '../types';
import ValidatedField from '../components/ui/ValidatedField';
import Button from '../components/ui/Button';

const Popup = () => {
    // Data State
    const [prospects, setProspects] = useState<Prospect[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // 1. Data Listener (Run immediately, no Auth check)
    useEffect(() => {
        let channel: any;
        
        const fetchAndSubscribe = async () => {
            console.log("Connecting to Supabase...");
            
            const fetchProspects = async () => {
                const { data, error } = await supabase
                    .from('prospects')
                    .select('*')
                    .order('last_updated', { ascending: false })
                    .limit(500); // good practice to limit initial fetch in extension
                    
                if (error) {
                    console.error("Database connection error:", error);
                    setIsLoading(false);
                    return;
                }
                
                const fetchedProspects = (data || []).map(doc => ({
                    ...doc,
                    id: doc.id,
                    fullName: doc.full_name,
                    companyName: doc.company_name,
                    personalLinkedin: doc.personal_linkedin,
                    lastUpdated: new Date(doc.last_updated),
                    workEmailDisposition: doc.workEmailDisposition || Disposition.UNVERIFIED,
                    contactNumber1Disposition: doc.contactNumber1Disposition || Disposition.UNVERIFIED,
                    contactNumber2Disposition: doc.contactNumber2Disposition || Disposition.UNVERIFIED,
                    contactNumber3Disposition: doc.contactNumber3Disposition || Disposition.UNVERIFIED,
                    receptionNumberDisposition: doc.receptionNumberDisposition || Disposition.UNVERIFIED,
                })) as Prospect[];
                
                setProspects(fetchedProspects);
                setIsLoading(false);
                
                if (selectedProspect) {
                    const updatedSelected = fetchedProspects.find(p => p.id === selectedProspect.id);
                    if (updatedSelected) setSelectedProspect(updatedSelected);
                }
            };

            await fetchProspects();

            channel = supabase.channel('popup-prospects-changes')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'prospects' }, () => {
                    fetchProspects();
                })
                .subscribe();
        };

        fetchAndSubscribe();

        return () => { 
            if (channel) supabase.removeChannel(channel); 
        };
    }, [selectedProspect?.id]); 

    // --- Actions ---

    const markValidation = async (prospectId: string, field: keyof Prospect, disposition: Disposition) => {
        try {
            const fieldMap: Record<string, string> = { personalLinkedin: 'personal_linkedin', companyName: 'company_name', fullName: 'full_name' };
            const dbField = fieldMap[field as string] || field;
            await supabase.from('prospects').update({ [dbField]: disposition, last_updated: new Date().toISOString() }).eq('id', prospectId);
        } catch (e) {
            console.error("Error validating prospect", e);
            alert("Error updating. Check if database allows public writes.");
        }
    };

    const handleSaveRemark = async (newRemark: string) => {
        if (!selectedProspect) return;
        setIsUpdating(true);
        try {
             await supabase.from('prospects').update({ remark: newRemark, last_updated: new Date().toISOString() }).eq('id', selectedProspect.id);
        } catch(e) {
            console.error(e);
        } finally {
            setIsUpdating(false);
        }
    };

    // NEW: Request Update Functionality
    const handleRequestUpdate = async () => {
        if (!selectedProspect) return;
        
        if (!confirm(`Request Data Team to update info for ${selectedProspect.fullName}?`)) return;

        setIsUpdating(true);
        try {
            await supabase.from('contact_requests').insert([{
                prospect_id: selectedProspect.id, 
                status: 'Pending'
            }]);
            alert("Request sent to Data Team!");
        } catch (e) {
            console.error("Error sending request:", e);
            alert("Failed to send request.");
        } finally {
            setIsUpdating(false);
        }
    };

    // --- Filtering ---
    const filteredProspects = useMemo(() => {
        if (!searchTerm) return prospects.slice(0, 20); // Limit initial view
        const lower = searchTerm.toLowerCase();
        return prospects.filter(p =>
            p.fullName.toLowerCase().includes(lower) ||
            p.companyName.toLowerCase().includes(lower)
        ).slice(0, 50);
    }, [searchTerm, prospects]);

    // --- Views ---

    if (isLoading) {
        return <div className="flex items-center justify-center h-screen bg-background"><div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div></div>;
    }

    // Details View
    if (selectedProspect) {
        return (
            <div className="bg-background min-h-screen flex flex-col">
                <div className="bg-primary text-white p-3 flex items-center shadow-md sticky top-0 z-10">
                    <button 
                        onClick={() => setSelectedProspect(null)} 
                        className="mr-3 hover:bg-white/10 p-1 rounded transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                    </button>
                    <div className="overflow-hidden flex-1">
                        <h2 className="font-bold truncate text-sm">{selectedProspect.fullName}</h2>
                        <p className="text-xs text-accent truncate">{selectedProspect.companyName}</p>
                    </div>
                </div>

                <div className="p-4 space-y-4 overflow-y-auto flex-1 pb-4">
                    
                    {/* Actions Toolbar */}
                    <div className="flex gap-2 justify-end">
                        <Button 
                            size="sm" 
                            variant="secondary" 
                            className="w-full justify-center shadow-sm border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                            onClick={handleRequestUpdate}
                            disabled={isUpdating}
                        >
                            {isUpdating ? 'Sending...' : 'Request Data Update'}
                        </Button>
                    </div>

                    {/* Contact Info Card */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Contact Details</h3>
                        
                        <div className="space-y-3">
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-500 mb-1">Work Email</span>
                                <ValidatedField 
                                    value={selectedProspect.workEmail}
                                    disposition={selectedProspect.workEmailDisposition}
                                    type="email"
                                    canEdit={true}
                                    onUpdate={(d) => markValidation(selectedProspect.id, 'workEmailDisposition', d)}
                                />
                            </div>

                            <div className="flex flex-col">
                                <span className="text-xs text-gray-500 mb-1">Direct Phone</span>
                                <ValidatedField 
                                    value={selectedProspect.contactNumber1}
                                    disposition={selectedProspect.contactNumber1Disposition}
                                    type="phone"
                                    canEdit={true}
                                    onUpdate={(d) => markValidation(selectedProspect.id, 'contactNumber1Disposition', d)}
                                />
                            </div>

                             {selectedProspect.contactNumber2 && (
                                <div className="flex flex-col">
                                    <span className="text-xs text-gray-500 mb-1">Alt Phone</span>
                                    <ValidatedField 
                                        value={selectedProspect.contactNumber2}
                                        disposition={selectedProspect.contactNumber2Disposition}
                                        type="phone"
                                        canEdit={true}
                                        onUpdate={(d) => markValidation(selectedProspect.id, 'contactNumber2Disposition', d)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Info Card */}
                    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                         <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Profile</h3>
                         <div className="space-y-2 text-sm">
                             <div className="flex justify-between border-b border-gray-50 pb-2">
                                 <span className="text-gray-500">Designation</span>
                                 <span className="font-medium text-gray-800">{selectedProspect.designation}</span>
                             </div>
                             <div className="flex justify-between border-b border-gray-50 pb-2">
                                 <span className="text-gray-500">City</span>
                                 <span className="font-medium text-gray-800">{selectedProspect.city}</span>
                             </div>
                              <div className="flex justify-between pt-1">
                                 <span className="text-gray-500">LinkedIn</span>
                                 {selectedProspect.personalLinkedin ? (
                                     <a href={`https://${selectedProspect.personalLinkedin}`} target="_blank" className="text-accent hover:underline">Open Profile</a>
                                 ) : <span className="text-gray-300">-</span>}
                             </div>
                         </div>
                    </div>

                     {/* Remarks Input */}
                     <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                         <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Remarks</h3>
                         <textarea 
                            className="w-full text-sm border-gray-300 rounded-md focus:ring-accent focus:border-accent"
                            rows={3}
                            placeholder="Add a note..."
                            defaultValue={selectedProspect.remark}
                            onBlur={(e) => handleSaveRemark(e.target.value)}
                         />
                         {isUpdating && <p className="text-[10px] text-gray-400 mt-1 text-right">Saving...</p>}
                     </div>
                </div>
            </div>
        );
    }

    // List View (Visible to Everyone)
    return (
        <div className="flex flex-col h-screen bg-background">
            <div className="bg-primary p-3 shadow-md sticky top-0 z-10">
                <div className="flex justify-between items-center mb-3">
                     <span className="text-white font-black tracking-tighter"><span className="text-accent">ALT</span>LEADS</span>
                     {/* No Sign Out Button needed */}
                     <span className="text-[10px] text-accent bg-white/10 px-2 py-0.5 rounded border border-accent/20">Live Intelligence</span>
                </div>
                <div className="relative">
                     <input
                        type="text"
                        placeholder="Search name or company..."
                        className="w-full pl-8 pr-3 py-1.5 text-sm rounded bg-white/10 text-white placeholder-blue-200 border border-transparent focus:bg-white focus:text-gray-900 focus:placeholder-gray-400 transition-all outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <svg className="w-4 h-4 text-blue-200 absolute left-2.5 top-2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {prospects.length === 0 && !isLoading && (
                    <div className="text-center mt-10 text-gray-400 text-sm">
                        No prospects found.
                    </div>
                )}
                {filteredProspects.length === 0 && prospects.length > 0 && (
                    <div className="text-center mt-10 text-gray-400 text-sm">
                        No matches found.
                    </div>
                )}
                {filteredProspects.map(prospect => (
                    <div 
                        key={prospect.id} 
                        onClick={() => setSelectedProspect(prospect)}
                        className="bg-white p-3 rounded-lg border border-gray-200 hover:border-accent hover:shadow-sm cursor-pointer transition-all group"
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0 pr-2">
                                <h3 className="text-sm font-semibold text-gray-800 group-hover:text-accent truncate">{prospect.fullName}</h3>
                                <p className="text-xs text-gray-500 truncate">{prospect.designation}</p>
                                <p className="text-xs text-gray-400 font-medium truncate">{prospect.companyName}</p>
                            </div>
                            {/* Validation Indicators (Mini) */}
                            <div className="flex flex-col space-y-1 items-end shrink-0">
                                <div className={`w-2 h-2 rounded-full ${
                                    prospect.workEmailDisposition === Disposition.ACCURATE ? 'bg-green-500' :
                                    prospect.workEmailDisposition === Disposition.WRONG ? 'bg-red-500' : 'bg-gray-300'
                                }`} title="Email Status"></div>
                                <div className={`w-2 h-2 rounded-full ${
                                    prospect.contactNumber1Disposition === Disposition.ACCURATE ? 'bg-green-500' :
                                    prospect.contactNumber1Disposition === Disposition.WRONG ? 'bg-red-500' : 'bg-gray-300'
                                }`} title="Phone Status"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="p-2 bg-gray-50 border-t border-gray-200 text-center text-[10px] text-gray-400">
                Connected to AltLeads Cloud DB
            </div>
        </div>
    );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<Popup />);