
import React, { useState, useMemo } from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import { RequestStatusBadge } from '../components/ui/Badge';
import { ContactRequest, RequestStatus, Role, Prospect, UserShort } from '../types';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import ProspectForm from '../components/prospects/ProspectForm';

const ContactRequestsPage: React.FC = () => {
    const { contactRequests, prospects, updateContactRequest, createContactRequest, addProspect, updateProspect, deleteContactRequest } = useData();
    const { user } = useAuth();
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Manual Request Modal State
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [requestForm, setRequestForm] = useState({ name: '', company: '', linkedin: '' });
    
    // Edit Request State
    const [isEditRequestModalOpen, setIsEditRequestModalOpen] = useState(false);
    const [editingRequest, setEditingRequest] = useState<ContactRequest | null>(null);
    
    // Delete Confirmation State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [requestToDelete, setRequestToDelete] = useState<string | null>(null);
    
    // Comprehensive Draft Form State
    const [draftForm, setDraftForm] = useState<{
        prospectName: string;
        companyName: string;
        linkedinUrl: string;
        status: RequestStatus;
        sourceHint: string; 
        
        foundFirstName: string;
        foundLastName: string;
        foundDesignation: string;
        foundEmail: string;
        foundPhone: string;
        foundPhone2: string;
        foundPhone3: string;
        foundReceptionPhone: string;
        foundCity: string;
        foundState: string;
        foundWebsite: string;
        foundCompanyLinkedin: string;
        foundPersonalLinkedin: string;
        foundIndustry: string;
        foundSubIndustry: string;
        foundEmployeeSize: string;
        foundCompanyCIN: string;
        foundRemark: string;
    }>({
        prospectName: '', companyName: '', linkedinUrl: '', status: RequestStatus.PENDING, sourceHint: '',
        foundFirstName: '', foundLastName: '', foundDesignation: '', foundEmail: '',
        foundPhone: '', foundPhone2: '', foundPhone3: '', foundReceptionPhone: '',
        foundCity: '', foundState: '', foundWebsite: '', foundCompanyLinkedin: '',
        foundPersonalLinkedin: '', foundIndustry: '', foundSubIndustry: '', 
        foundEmployeeSize: '', foundCompanyCIN: '', foundRemark: ''
    });

    // Resolution Modal State
    const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
    const [selectedRequestToResolve, setSelectedRequestToResolve] = useState<ContactRequest | null>(null);

    const isDataTeam = user?.role === Role.DATA_TEAM || user?.role === Role.ADMIN;
    
    // Defensive Helper to extract name safely from string or UserShort object
    const getUserName = (u: any) => {
        if (!u) return '';
        if (typeof u === 'string') return u;
        if (typeof u === 'object' && u !== null) {
            return u.name || 'Unknown';
        }
        return String(u);
    };

    // Filtering Logic
    const filteredRequests = useMemo(() => {
        if (!searchTerm) return contactRequests;
        const lower = searchTerm.toLowerCase();
        return contactRequests.filter(req => {
            const requestedByName = getUserName(req.requestedBy);
            return (
                req.prospectName.toLowerCase().includes(lower) || 
                (req.companyName && req.companyName.toLowerCase().includes(lower)) ||
                (req.linkedinUrl && req.linkedinUrl.toLowerCase().includes(lower)) ||
                requestedByName.toLowerCase().includes(lower)
            );
        });
    }, [contactRequests, searchTerm]);

    const handleNamePartChange = (field: 'foundFirstName' | 'foundLastName', value: string) => {
        setDraftForm(prev => {
            const updated = { ...prev, [field]: value };
            const first = updated.foundFirstName || '';
            const last = updated.foundLastName || '';
            updated.prospectName = `${first} ${last}`.trim();
            return updated;
        });
    };

    const handleFullNameChange = (value: string) => {
        setDraftForm(prev => {
            const parts = value.split(' ');
            const first = parts[0] || '';
            const last = parts.slice(1).join(' ') || '';
            return {
                ...prev,
                prospectName: value,
                foundFirstName: first,
                foundLastName: last
            };
        });
    };
    
    const handleStatusChange = (request: ContactRequest, newStatus: RequestStatus) => {
        let updatedRequest = { ...request, status: newStatus, updatedAt: new Date() };
        if (newStatus === RequestStatus.IN_PROGRESS && !request.fulfilledBy) {
            updatedRequest.fulfilledBy = user ? { uid: user.id, email: user.email, name: user.name } : 'Unknown';
        }
        updateContactRequest(updatedRequest);
    };

    const handleDeleteClick = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        e.stopPropagation();
        setRequestToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!requestToDelete) return;
        setDeletingId(requestToDelete);
        try {
            await deleteContactRequest(requestToDelete);
            setIsDeleteModalOpen(false);
            setRequestToDelete(null);
        } catch (err: any) {
            console.error("Delete failed:", err);
            alert("Failed to delete request.");
        } finally {
            setDeletingId(null);
        }
    };

    const handleCreateManualRequest = (e: React.FormEvent) => {
        e.preventDefault();
        createContactRequest({
            prospectName: requestForm.name,
            companyName: requestForm.company,
            linkedinUrl: requestForm.linkedin,
            requestedBy: user ? { uid: user.id, email: user.email, name: user.name } : 'Unknown',
            status: RequestStatus.PENDING
        });
        setIsRequestModalOpen(false);
        setRequestForm({ name: '', company: '', linkedin: '' });
    };
    
    const openEditRequestModal = (request: ContactRequest) => {
        setEditingRequest(request);
        
        // --- SMART FILL: Use existing prospect data if available ---
        const linkedProspect = request.prospectId ? prospects.find(p => p.id === request.prospectId) : null;

        const nameParts = request.prospectName.split(' ');
        const derivedFirst = nameParts[0];
        const derivedLast = nameParts.slice(1).join(' ');

        setDraftForm({
            prospectName: request.prospectName,
            companyName: request.companyName || linkedProspect?.companyName || '',
            linkedinUrl: request.linkedinUrl || linkedProspect?.personalLinkedin || '',
            status: request.status,
            sourceHint: request.sourceHint || '',
            
            // Prefer Request Draft -> Then Linked Prospect -> Then Derived
            foundFirstName: request.foundFirstName || linkedProspect?.firstName || derivedFirst || '',
            foundLastName: request.foundLastName || linkedProspect?.lastName || derivedLast || '',
            foundDesignation: request.foundDesignation || linkedProspect?.designation || '',
            foundEmail: request.foundEmail || linkedProspect?.workEmail || '',
            
            foundPhone: request.foundPhone || linkedProspect?.contactNumber1 || '',
            foundPhone2: request.foundPhone2 || linkedProspect?.contactNumber2 || '',
            foundPhone3: request.foundPhone3 || linkedProspect?.contactNumber3 || '',
            foundReceptionPhone: request.foundReceptionPhone || linkedProspect?.receptionNumber || '',
            
            foundCity: request.foundCity || linkedProspect?.city || '',
            foundState: request.foundState || linkedProspect?.state || '',
            foundWebsite: request.foundWebsite || linkedProspect?.website || '',
            
            foundCompanyLinkedin: request.foundCompanyLinkedin || linkedProspect?.companyLinkedin || '',
            foundPersonalLinkedin: request.foundPersonalLinkedin || request.linkedinUrl || linkedProspect?.personalLinkedin || '',
            
            foundIndustry: request.foundCompanyIndustry || linkedProspect?.companyIndustry || '',
            foundSubIndustry: request.foundCompanySubIndustry || linkedProspect?.companySubIndustry || '',
            foundEmployeeSize: request.foundCompanyEmployeeSize || linkedProspect?.companyEmployeeSize || '',
            foundCompanyCIN: request.foundCompanyCIN || linkedProspect?.companyCIN || '',
            foundRemark: request.foundRemark || linkedProspect?.remark || ''
        });
        setIsEditRequestModalOpen(true);
    };

    const handleUpdateDraftRequest = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingRequest) return;
        
        const updatedReq: ContactRequest = {
            ...editingRequest,
            prospectName: draftForm.prospectName,
            companyName: draftForm.companyName,
            linkedinUrl: draftForm.linkedinUrl,
            status: draftForm.status,
            sourceHint: draftForm.sourceHint, 
            foundFirstName: draftForm.foundFirstName,
            foundLastName: draftForm.foundLastName,
            foundDesignation: draftForm.foundDesignation,
            foundEmail: draftForm.foundEmail,
            foundPhone: draftForm.foundPhone,
            foundPhone2: draftForm.foundPhone2,
            foundPhone3: draftForm.foundPhone3,
            foundReceptionPhone: draftForm.foundReceptionPhone,
            foundCity: draftForm.foundCity,
            foundState: draftForm.foundState,
            foundWebsite: draftForm.foundWebsite,
            foundCompanyLinkedin: draftForm.foundCompanyLinkedin,
            foundPersonalLinkedin: draftForm.foundPersonalLinkedin,
            foundCompanyIndustry: draftForm.foundIndustry,
            foundCompanySubIndustry: draftForm.foundSubIndustry,
            foundCompanyEmployeeSize: draftForm.foundEmployeeSize,
            foundCompanyCIN: draftForm.foundCompanyCIN,
            foundRemark: draftForm.foundRemark,
            updatedAt: new Date()
        };

        if (draftForm.status === RequestStatus.IN_PROGRESS && !editingRequest.fulfilledBy) {
            updatedReq.fulfilledBy = user ? { uid: user.id, email: user.email, name: user.name } : 'Unknown';
        }

        updateContactRequest(updatedReq);
        setIsEditRequestModalOpen(false);
        setEditingRequest(null);
    };

    const openResolveModal = (request: ContactRequest) => {
        setSelectedRequestToResolve(request);
        setIsResolveModalOpen(true);
    };

    const handleResolveAndSave = async (prospectData: any) => {
        if (!selectedRequestToResolve) return;

        // CASE 1: Request was linked to a specific prospect ID (Re-Request)
        if (selectedRequestToResolve.prospectId) {
            await updateProspect({
                ...prospectData,
                id: selectedRequestToResolve.prospectId,
                lastUpdated: new Date()
            } as Prospect);
        } 
        // CASE 2: No linked ID, check for duplicates by Name + Company
        else {
            const duplicate = prospects.find(p => 
                p.fullName.toLowerCase() === prospectData.fullName.toLowerCase() && 
                p.companyName.toLowerCase() === prospectData.companyName.toLowerCase()
            );

            if (duplicate) {
                // If found, ask user to merge/update instead of creating new
                const confirmMerge = window.confirm(`A prospect named "${prospectData.fullName}" at "${prospectData.companyName}" already exists in the database.\n\nClick OK to UPDATE the existing record.\nClick Cancel to create a NEW duplicate record.`);
                
                if (confirmMerge) {
                    await updateProspect({
                        ...prospectData,
                        id: duplicate.id,
                        lastUpdated: new Date()
                    } as Prospect);
                } else {
                    await addProspect(prospectData);
                }
            } else {
                // No duplicate, create new
                await addProspect(prospectData);
            }
        }

        updateContactRequest({
            ...selectedRequestToResolve,
            prospectName: prospectData.fullName, 
            companyName: prospectData.companyName, 
            status: RequestStatus.FULFILLED,
            fulfilledBy: user ? { uid: user.id, email: user.email, name: user.name } : 'Unknown',
            foundEmail: prospectData.workEmail,
            foundPhone: prospectData.contactNumber1,
            foundDesignation: prospectData.designation,
            updatedAt: new Date()
        });

        setIsResolveModalOpen(false);
        setSelectedRequestToResolve(null);
    };

    const getInitialFormDataForResolution = () => {
        if (!selectedRequestToResolve) return {};

        let baseData: any = {};

        // 1. Start with existing prospect data if available (Prevent Data Loss)
        if (selectedRequestToResolve.prospectId) {
            const existing = prospects.find(p => p.id === selectedRequestToResolve.prospectId);
            if (existing) {
                baseData = { ...existing };
            }
        }

        // 2. Overlay with Draft Data from the Request (Smart Merge)
        const r = selectedRequestToResolve;
        
        if (r.foundFirstName) baseData.firstName = r.foundFirstName;
        if (r.foundLastName) baseData.lastName = r.foundLastName;
        if (r.prospectName && !baseData.firstName) {
             const parts = r.prospectName.split(' ');
             baseData.firstName = parts[0];
             baseData.lastName = parts.slice(1).join(' ');
        }
        
        if (r.companyName) baseData.companyName = r.companyName;
        if (r.foundDesignation) baseData.designation = r.foundDesignation;
        if (r.foundEmail) baseData.workEmail = r.foundEmail;
        if (r.foundPhone) baseData.contactNumber1 = r.foundPhone;
        if (r.foundPhone2) baseData.contactNumber2 = r.foundPhone2;
        if (r.foundPhone3) baseData.contactNumber3 = r.foundPhone3;
        if (r.foundReceptionPhone) baseData.receptionNumber = r.foundReceptionPhone;
        if (r.foundCity) baseData.city = r.foundCity;
        if (r.foundState) baseData.state = r.foundState;
        if (r.foundCompanyIndustry) baseData.companyIndustry = r.foundCompanyIndustry;
        if (r.foundCompanySubIndustry) baseData.companySubIndustry = r.foundCompanySubIndustry;
        if (r.foundCompanyEmployeeSize) baseData.companyEmployeeSize = r.foundCompanyEmployeeSize;
        if (r.foundCompanyCIN) baseData.companyCIN = r.foundCompanyCIN;
        if (r.foundWebsite) baseData.website = r.foundWebsite;
        if (r.foundCompanyLinkedin) baseData.companyLinkedin = r.foundCompanyLinkedin;
        if (r.foundPersonalLinkedin) baseData.personalLinkedin = r.foundPersonalLinkedin;
        if (r.foundRemark) baseData.remark = r.foundRemark;

        // Ensure at least a full name exists
        if (!baseData.fullName && r.prospectName) baseData.fullName = r.prospectName;

        return baseData;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold text-text-primary">Contact Requests</h1>
                
                <div className="flex w-full md:w-auto gap-2">
                    <input 
                        type="text" 
                        placeholder="Search requests..." 
                        className="flex-1 md:w-64 px-4 py-2 border border-gray-300 rounded-md focus:ring-accent focus:border-accent"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Button onClick={() => { setRequestForm({name:'', company:'', linkedin:''}); setIsRequestModalOpen(true); }} className="whitespace-nowrap">
                        + New Request
                    </Button>
                </div>
            </div>

            <Card>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Prospect / Details</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Requested By</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Assigned To</th>
                                {isDataTeam && <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Draft Data</th>}
                                {isDataTeam && <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredRequests.map((request: ContactRequest) => {
                                const linkedProspect = request.prospectId ? prospects.find(p => p.id === request.prospectId) : null;
                                const possibleMatch = request.status === RequestStatus.FULFILLED && !linkedProspect 
                                    ? prospects.find(p => p.fullName === request.prospectName && p.companyName === request.companyName)
                                    : null;
                                const activeLink = linkedProspect || possibleMatch;

                                return (
                                <tr key={request.id} className="hover:bg-gray-50 group">
                                    <td className="px-6 py-4 text-sm text-primary max-w-xs">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="font-medium text-gray-900 flex items-center gap-2">
                                                    {request.prospectName}
                                                    {request.sourceHint && (
                                                        <span className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded border border-purple-200" title="Data Source">
                                                            {request.sourceHint}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-500">{request.companyName}</div>
                                                <div className="flex flex-col gap-1 mt-1">
                                                    {request.linkedinUrl && (
                                                        <a href={request.linkedinUrl.startsWith('http') ? request.linkedinUrl : `https://${request.linkedinUrl}`} target="_blank" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                                                            LinkedIn ↗
                                                        </a>
                                                    )}
                                                    {activeLink && request.status === RequestStatus.FULFILLED && (
                                                        <Link 
                                                            to={`/prospects/${activeLink.id}`} 
                                                            className="text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded w-fit hover:bg-green-100 flex items-center mt-1 font-semibold"
                                                        >
                                                            View Profile &rarr;
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                            {isDataTeam && (
                                                <button onClick={() => openEditRequestModal(request)} className="text-gray-400 hover:text-blue-600 ml-2 p-1 rounded hover:bg-blue-50" title="Edit Research Draft">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                    </svg>
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                                        {getUserName(request.requestedBy)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <RequestStatusBadge status={request.status} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                                        {getUserName(request.fulfilledBy) || '-'}
                                    </td>
                                    
                                    {isDataTeam && (
                                        <td className="px-6 py-4 text-xs text-gray-500">
                                            {request.foundEmail || request.foundPhone ? (
                                                <div className="space-y-1">
                                                    {request.foundEmail && <div className="flex items-center gap-1"><span className="text-gray-400">✉</span> {request.foundEmail}</div>}
                                                    {request.foundPhone && <div className="flex items-center gap-1"><span className="text-gray-400">📞</span> {request.foundPhone}</div>}
                                                </div>
                                            ) : (
                                                <span className="text-gray-300 italic">No draft data</span>
                                            )}
                                        </td>
                                    )}

                                    {isDataTeam && (
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex items-center space-x-2">
                                                {request.status === RequestStatus.PENDING &&
                                                    <Button size="sm" onClick={() => handleStatusChange(request, RequestStatus.IN_PROGRESS)}>Accept</Button>
                                                }
                                                {request.status === RequestStatus.IN_PROGRESS && (
                                                    <Button size="sm" onClick={() => openResolveModal(request)} className="bg-green-600 hover:bg-green-700">
                                                        Push to DB
                                                    </Button>
                                                )}
                                                
                                                <button 
                                                    onClick={(e) => handleDeleteClick(e, request.id)} 
                                                    disabled={deletingId === request.id}
                                                    type="button"
                                                    className={`p-2 rounded shadow-sm transition-colors ${deletingId === request.id ? 'bg-red-100 text-red-400 cursor-wait' : 'text-gray-300 hover:text-red-500 hover:bg-red-50'}`}
                                                    title="Delete Request"
                                                >
                                                    {deletingId === request.id ? (
                                                        <span className="w-4 h-4 block border-2 border-red-500 border-t-transparent rounded-full animate-spin"></span>
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            )})}
                            
                            {filteredRequests.length === 0 && (
                                <tr>
                                    <td colSpan={isDataTeam ? 6 : 4} className="px-6 py-10 text-center text-gray-500">
                                        No requests found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal isOpen={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} title="Request Contact Info" size="md">
                <form onSubmit={handleCreateManualRequest} className="space-y-4">
                    <p className="text-sm text-gray-600">Can't find a prospect? Fill in what you know.</p>
                    <Input label="Prospect Name *" value={requestForm.name} onChange={(e) => setRequestForm({...requestForm, name: e.target.value})} required />
                    <Input label="Company Name *" value={requestForm.company} onChange={(e) => setRequestForm({...requestForm, company: e.target.value})} required />
                    <Input label="LinkedIn URL (Optional)" value={requestForm.linkedin} onChange={(e) => setRequestForm({...requestForm, linkedin: e.target.value})} placeholder="linkedin.com/in/..." />
                    <div className="flex justify-end pt-4 space-x-2">
                        <Button type="button" variant="ghost" onClick={() => setIsRequestModalOpen(false)}>Cancel</Button>
                        <Button type="submit">Submit Request</Button>
                    </div>
                </form>
            </Modal>

             <Modal isOpen={isEditRequestModalOpen} onClose={() => setIsEditRequestModalOpen(false)} title="Research Workbench (Draft)" size="xl">
                <form onSubmit={handleUpdateDraftRequest} className="space-y-6">
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded text-sm text-blue-900 flex justify-between items-start">
                        <div>
                            <strong>Draft Mode:</strong> Saving here stores the data in the <em>Request</em> only. It does NOT update the main database until you click "Push to DB" in the main list.
                        </div>
                        <select 
                            value={draftForm.status} 
                            onChange={(e) => setDraftForm({...draftForm, status: e.target.value as RequestStatus})}
                            className="ml-4 text-xs border-blue-300 rounded text-blue-900 bg-white"
                        >
                            {Object.values(RequestStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-gray-700 border-b pb-1">Identity & Role</h4>
                            <div className="grid grid-cols-2 gap-2">
                                <Input label="First Name" value={draftForm.foundFirstName} onChange={(e) => handleNamePartChange('foundFirstName', e.target.value)} />
                                <Input label="Last Name" value={draftForm.foundLastName} onChange={(e) => handleNamePartChange('foundLastName', e.target.value)} />
                            </div>
                            <Input label="Request Display Name" value={draftForm.prospectName} onChange={(e) => handleFullNameChange(e.target.value)} />
                            <Input label="Source Hint (e.g. Lusha, Mr.E)" value={draftForm.sourceHint} onChange={(e) => setDraftForm({...draftForm, sourceHint: e.target.value})} placeholder="Backend Provider..." />
                            <Input label="Designation" value={draftForm.foundDesignation} onChange={(e) => setDraftForm({...draftForm, foundDesignation: e.target.value})} />
                            <Input label="Work Email" value={draftForm.foundEmail} onChange={(e) => setDraftForm({...draftForm, foundEmail: e.target.value})} placeholder="email@company.com" />
                            <Input label="Personal LinkedIn" value={draftForm.foundPersonalLinkedin} onChange={(e) => setDraftForm({...draftForm, foundPersonalLinkedin: e.target.value})} />
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-sm font-bold text-gray-700 border-b pb-1">Contact Numbers</h4>
                            <Input label="Direct Phone 1" value={draftForm.foundPhone} onChange={(e) => setDraftForm({...draftForm, foundPhone: e.target.value})} />
                            <div className="grid grid-cols-2 gap-2">
                                <Input label="Phone 2" value={draftForm.foundPhone2} onChange={(e) => setDraftForm({...draftForm, foundPhone2: e.target.value})} />
                                <Input label="Mobile / Other" value={draftForm.foundPhone3} onChange={(e) => setDraftForm({...draftForm, foundPhone3: e.target.value})} />
                            </div>
                            <Input label="Reception" value={draftForm.foundReceptionPhone} onChange={(e) => setDraftForm({...draftForm, foundReceptionPhone: e.target.value})} />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div className="space-y-4">
                            <h4 className="text-sm font-bold text-gray-700 border-b pb-1">Company Details</h4>
                            <Input label="Company Name" value={draftForm.companyName} onChange={(e) => setDraftForm({...draftForm, companyName: e.target.value})} />
                            <Input label="Website" value={draftForm.foundWebsite} onChange={(e) => setDraftForm({...draftForm, foundWebsite: e.target.value})} />
                            <div className="grid grid-cols-2 gap-2">
                                <Input label="Industry" value={draftForm.foundIndustry} onChange={(e) => setDraftForm({...draftForm, foundIndustry: e.target.value})} />
                                <Input label="Size" value={draftForm.foundEmployeeSize} onChange={(e) => setDraftForm({...draftForm, foundEmployeeSize: e.target.value})} placeholder="1-50" />
                            </div>
                            <Input label="Company LinkedIn" value={draftForm.foundCompanyLinkedin} onChange={(e) => setDraftForm({...draftForm, foundCompanyLinkedin: e.target.value})} />
                        </div>

                         <div className="space-y-4">
                            <h4 className="text-sm font-bold text-gray-700 border-b pb-1">Location & Notes</h4>
                            <div className="grid grid-cols-2 gap-2">
                                <Input label="City" value={draftForm.foundCity} onChange={(e) => setDraftForm({...draftForm, foundCity: e.target.value})} />
                                <Input label="State" value={draftForm.foundState} onChange={(e) => setDraftForm({...draftForm, foundState: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">
                                    Remarks <span className="text-xs font-normal text-gray-400">(Summary note, e.g. "Key Decision Maker")</span>
                                </label>
                                <textarea 
                                    className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                    rows={3}
                                    value={draftForm.foundRemark} 
                                    onChange={(e) => setDraftForm({...draftForm, foundRemark: e.target.value})} 
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 space-x-2 border-t mt-4">
                        <Button type="button" variant="ghost" onClick={() => setIsEditRequestModalOpen(false)}>Cancel</Button>
                        <Button type="submit">Save Draft</Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isResolveModalOpen} onClose={() => setIsResolveModalOpen(false)} title="Finalize & Push to Database" size="xl">
                <div className="mb-4 bg-green-50 border border-green-200 p-3 rounded text-sm text-green-800">
                    <p className="font-bold">Pushing to Database</p>
                    <p>Review the data below. This pre-fills with your Draft data. Clicking "Add/Update Prospect" will save this to the main database and mark the request as <strong>Fulfilled</strong>.</p>
                </div>
                {selectedRequestToResolve && (
                    <ProspectForm 
                        onSubmit={handleResolveAndSave} 
                        onCancel={() => setIsResolveModalOpen(false)}
                        initialData={getInitialFormDataForResolution()}
                        isEditing={!!selectedRequestToResolve.prospectId}
                        isResolvingRequest={true}
                    />
                )}
            </Modal>

             {/* Delete Confirmation Modal */}
             <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Deletion" size="sm">
                <div className="space-y-4">
                    <p className="text-gray-700">Are you sure you want to permanently delete this request? This action cannot be undone.</p>
                    <div className="flex justify-end space-x-2 border-t pt-4">
                        <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                        <Button variant="danger" onClick={confirmDelete} disabled={!!deletingId}>
                            {deletingId ? 'Deleting...' : 'Delete Permanently'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default ContactRequestsPage;
