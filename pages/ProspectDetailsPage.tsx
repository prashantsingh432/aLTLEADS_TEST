
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { Disposition, Role, Prospect, RequestStatus } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import ValidatedField from '../components/ui/ValidatedField';
import Modal from '../components/ui/Modal';
import ProspectForm from '../components/prospects/ProspectForm';

const ProspectDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { prospects, logProfileView, markValidation, createContactRequest, updateProspect } = useData();
    const { user } = useAuth();
    
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    
    const prospect = useMemo(() => prospects.find(p => p.id === id), [prospects, id]);
    const canEdit = user?.role === Role.ADMIN || user?.role === Role.DATA_TEAM;

    useEffect(() => {
        if (prospect && user && user.role === Role.AGENT) {
            logProfileView(prospect.id, user.id);
        }
    }, [prospect, user, logProfileView]);

    if (!prospect || !user) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <h2 className="text-2xl font-bold text-gray-400">Prospect not found</h2>
                <Link to="/prospects" className="text-accent hover:underline mt-4">Back to list</Link>
            </div>
        );
    }
    
    const handleRequestContactInfo = () => {
        createContactRequest({
            prospectId: prospect.id,
            prospectName: prospect.fullName,
            companyName: prospect.companyName,
            requestedBy: user.name,
            status: RequestStatus.PENDING,
        });
        alert("Request sent.");
    };
    
    const handleUpdateProspect = async (data: Omit<Prospect, 'id' | 'lastUpdated'>) => {
        await updateProspect({
            ...data,
            id: prospect.id,
            lastUpdated: new Date()
        } as Prospect);
        setIsEditModalOpen(false);
    };
    
    // Helper to render a field row
    const FieldRow: React.FC<{label: string, value: React.ReactNode}> = ({label, value}) => (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-4 border-b border-border last:border-0 hover:bg-slate-50/50 transition-colors px-2 rounded-sm">
            <dt className="text-sm font-medium text-text-secondary">{label}</dt>
            <dd className="text-sm text-text-primary font-medium sm:col-span-2 break-words">{value || <span className="text-gray-300">-</span>}</dd>
        </div>
    );

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-12">
            {/* Header */}
            <div className="bg-surface p-6 rounded-lg shadow-sm border border-border flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <div className="flex items-center space-x-3 mb-1">
                        <Link to="/prospects" className="text-gray-400 hover:text-primary transition-colors">
                           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        </Link>
                        <h1 className="text-2xl font-bold text-text-primary tracking-tight">{prospect.fullName}</h1>
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">{prospect.id.slice(0,6)}</span>
                    </div>
                    <div className="ml-8 text-sm text-text-secondary">
                        <span className="font-semibold text-primary">{prospect.designation}</span> at <span className="font-semibold text-primary">{prospect.companyName}</span>
                    </div>
                </div>
                <div className="flex space-x-3 ml-8 md:ml-0">
                    <Button variant="secondary" size="sm" onClick={handleRequestContactInfo}>Request Update</Button>
                    {canEdit && (
                        <Button onClick={() => setIsEditModalOpen(true)}>Edit Details</Button>
                    )}
                </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Column 1: Personal & Contact */}
                <div className="space-y-6">
                    <Card title="Contact Information" className="h-full border-t-4 border-t-accent">
                        <dl className="-my-2">
                             <FieldRow label="Work Email" value={
                                 <ValidatedField 
                                    value={prospect.workEmail} 
                                    disposition={prospect.workEmailDisposition} 
                                    type="email"
                                    onUpdate={(d) => markValidation(prospect.id, 'workEmailDisposition', d)}
                                 />
                             } />
                             <FieldRow label="Primary Phone" value={
                                 <ValidatedField 
                                    value={prospect.contactNumber1} 
                                    disposition={prospect.contactNumber1Disposition} 
                                    type="phone"
                                    onUpdate={(d) => markValidation(prospect.id, 'contactNumber1Disposition', d)}
                                 />
                             } />
                             <FieldRow label="Secondary Phone" value={
                                 <ValidatedField 
                                    value={prospect.contactNumber2} 
                                    disposition={prospect.contactNumber2Disposition} 
                                    type="phone"
                                    onUpdate={(d) => markValidation(prospect.id, 'contactNumber2Disposition', d)}
                                 />
                             } />
                             <FieldRow label="Mobile / Other" value={
                                 <ValidatedField 
                                    value={prospect.contactNumber3} 
                                    disposition={prospect.contactNumber3Disposition} 
                                    type="phone"
                                    onUpdate={(d) => markValidation(prospect.id, 'contactNumber3Disposition', d)}
                                 />
                             } />
                             <FieldRow label="Reception" value={
                                 <ValidatedField 
                                    value={prospect.receptionNumber} 
                                    disposition={prospect.receptionNumberDisposition} 
                                    type="phone"
                                    onUpdate={(d) => markValidation(prospect.id, 'receptionNumberDisposition', d)}
                                 />
                             } />
                        </dl>
                    </Card>

                    <Card title="Personal Details">
                        <dl className="-my-2">
                            <FieldRow label="First Name" value={prospect.firstName} />
                            <FieldRow label="Last Name" value={prospect.lastName} />
                            <FieldRow label="Designation" value={prospect.designation} />
                            <FieldRow label="LinkedIn" value={prospect.personalLinkedin ? <a href={`https://${prospect.personalLinkedin}`} target="_blank" className="text-accent hover:underline flex items-center gap-1">{prospect.personalLinkedin} ↗</a> : null} />
                        </dl>
                    </Card>
                </div>

                {/* Column 2: Company Info */}
                <div className="space-y-6">
                     <Card title="Company Details" className="h-full border-t-4 border-t-slate-600">
                        <dl className="-my-2">
                            <FieldRow label="Company Name" value={prospect.companyName} />
                            <FieldRow label="Industry" value={prospect.companyIndustry} />
                            <FieldRow label="Sub-Industry" value={prospect.companySubIndustry} />
                            <FieldRow label="Employee Size" value={prospect.companyEmployeeSize} />
                            <FieldRow label="CIN" value={prospect.companyCIN} />
                            <FieldRow label="Website" value={prospect.website ? <a href={`https://${prospect.website}`} target="_blank" className="text-accent hover:underline">{prospect.website}</a> : null} />
                            <FieldRow label="Company LinkedIn" value={prospect.companyLinkedin ? <a href={`https://${prospect.companyLinkedin}`} target="_blank" className="text-accent hover:underline break-all">{prospect.companyLinkedin}</a> : null} />
                            <FieldRow label="Location" value={`${prospect.city}, ${prospect.state || ''}`} />
                        </dl>
                    </Card>
                    
                    <Card title="Remarks & Notes">
                         <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200 text-sm text-yellow-800 italic">
                             {prospect.remark || "No remarks found for this prospect."}
                         </div>
                    </Card>
                    
                    <div className="text-right text-xs text-gray-400">
                        Last Updated: {prospect.lastUpdated?.toLocaleDateString()} {prospect.lastUpdated?.toLocaleTimeString()}
                    </div>
                </div>
            </div>
            
            <Modal 
                isOpen={isEditModalOpen} 
                onClose={() => setIsEditModalOpen(false)} 
                title="Edit Prospect Details"
                size="xl"
            >
                <ProspectForm 
                    initialData={prospect} 
                    onSubmit={handleUpdateProspect} 
                    onCancel={() => setIsEditModalOpen(false)} 
                    isEditing={true}
                />
            </Modal>
        </div>
    );
};

export default ProspectDetailsPage;
