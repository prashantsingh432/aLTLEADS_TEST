
import React, { useState, useRef, useMemo } from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { Role, Prospect, Disposition } from '../types';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Navigate } from 'react-router-dom';

// ─── Add Prospect Form State ──────────────────────────────────────────────────
const EMPTY_FORM = {
    firstName: '', lastName: '', designation: '',
    companyName: '', companyIndustry: '', companySubIndustry: '',
    companyEmployeeSize: '', companyCIN: '', website: '', companyLinkedin: '',
    city: '', state: '',
    personalLinkedin: '',
    workEmail: '', workEmailDisposition: 'Unverified' as Disposition,
    contactNumber1: '', contactNumber1Disposition: 'Unverified' as Disposition,
    contactNumber2: '', contactNumber2Disposition: 'Unverified' as Disposition,
    contactNumber3: '', contactNumber3Disposition: 'Unverified' as Disposition,
    receptionNumber: '', receptionNumberDisposition: 'Unverified' as Disposition,
    remark: '',
};

const EMPLOYEE_SIZES = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001-10000', '10001+'];
const INDUSTRIES = [
    'Information Technology', 'Financial Technology', 'Software as a Service',
    'E-Commerce', 'Education Technology', 'Healthcare Technology',
    'Food Technology', 'Hospitality Technology', 'Human Resources Technology',
    'Banking, Financial Services & Insurance', 'Gaming & Sports Technology',
    'Manufacturing', 'Real Estate', 'Retail', 'Logistics & Supply Chain',
    'Media & Entertainment', 'Telecommunications', 'Consulting', 'Other',
];

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition placeholder-gray-400";
const selectCls = `${inputCls} bg-white`;

const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({ label, required, children }) => (
    <div className="space-y-1">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {label}{required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {children}
    </div>
);

const DispositionSelect: React.FC<{ value: Disposition; onChange: (v: Disposition) => void }> = ({ value, onChange }) => (
    <select className={selectCls} value={value} onChange={e => onChange(e.target.value as Disposition)}>
        <option value="Unverified">Unverified</option>
        <option value="Accurate">Accurate</option>
        <option value="Wrong">Wrong</option>
    </select>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const AdminDatabasePage: React.FC = () => {
    const { prospects, updateProspect, addProspect, addProspectsBulk, deleteProspect } = useData();
    const { user } = useAuth();
    
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditMode, setIsEditMode] = useState(false);
    const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 100;
    
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);

    // ── Add Prospect Modal ────────────────────────────────────────────────────
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [addTab, setAddTab] = useState<'personal' | 'company' | 'contact'>('personal');
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [addLoading, setAddLoading] = useState(false);
    const [addError, setAddError] = useState('');
    const [addSuccess, setAddSuccess] = useState(false);

    const [selectedExportColumns, setSelectedExportColumns] = useState<Record<string, boolean>>({
        id: true, fullName: true, firstName: true, lastName: true, companyName: true,
        designation: true, workEmail: true, contactNumber1: true,
        city: true, personalLinkedin: true, companyLinkedin: true,
        companyIndustry: true, remark: true, workEmailDisposition: true, 
        contactNumber1Disposition: true, website: true, state: true
    });

    if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
        return <Navigate to="/" />;
    }

    const filteredProspects = useMemo(() => {
        return prospects.filter(p => {
            if (!searchTerm) return true;
            const lower = searchTerm.toLowerCase();
            return (
                p.fullName?.toLowerCase().includes(lower) || 
                p.companyName?.toLowerCase().includes(lower) || 
                p.workEmail?.toLowerCase().includes(lower) ||
                p.city?.toLowerCase().includes(lower)
            );
        });
    }, [prospects, searchTerm]);

    const totalPages = Math.ceil(filteredProspects.length / ITEMS_PER_PAGE);
    const paginatedProspects = filteredProspects.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const handleUpdateField = async (id: string, field: keyof Prospect, value: any) => {
        const original = prospects.find(p => p.id === id);
        if (!original || original[field] === value) return;
        await updateProspect({ ...original, [field]: value, lastUpdated: new Date() } as Prospect);
    };

    const confirmDelete = async () => {
        if (!recordToDelete) return;
        setDeletingId(recordToDelete);
        try {
            await deleteProspect(recordToDelete);
            setIsDeleteModalOpen(false);
            setRecordToDelete(null);
        } catch (err: any) {
            alert(`Delete failed: ${err?.message || 'Unknown error. Check console for details.'}`);
        } finally {
            setDeletingId(null);
        }
    };

    // ── Form helpers ──────────────────────────────────────────────────────────
    const handleFormChange = (field: keyof typeof EMPTY_FORM, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setAddError('');
    };

    const openAddModal = () => {
        setFormData(EMPTY_FORM);
        setAddTab('personal');
        setAddError('');
        setAddSuccess(false);
        setIsAddModalOpen(true);
    };

    const handleAddProspect = async () => {
        if (!formData.companyName.trim()) {
            setAddError('Company name is required.');
            setAddTab('company');
            return;
        }
        if (!formData.personalLinkedin.trim()) {
            setAddError('Prospect LinkedIn URL is required.');
            setAddTab('personal');
            return;
        }
        setAddLoading(true);
        setAddError('');
        try {
            const fullName = `${formData.firstName} ${formData.lastName}`.trim();
            await addProspect({
                fullName,
                firstName: formData.firstName,
                lastName: formData.lastName,
                designation: formData.designation,
                companyName: formData.companyName,
                companyIndustry: formData.companyIndustry,
                companySubIndustry: formData.companySubIndustry,
                companyEmployeeSize: formData.companyEmployeeSize,
                companyCIN: formData.companyCIN,
                website: formData.website,
                companyLinkedin: formData.companyLinkedin,
                city: formData.city,
                state: formData.state,
                personalLinkedin: formData.personalLinkedin,
                workEmail: formData.workEmail,
                workEmailDisposition: formData.workEmailDisposition,
                contactNumber1: formData.contactNumber1,
                contactNumber1Disposition: formData.contactNumber1Disposition,
                contactNumber2: formData.contactNumber2,
                contactNumber2Disposition: formData.contactNumber2Disposition,
                contactNumber3: formData.contactNumber3,
                contactNumber3Disposition: formData.contactNumber3Disposition,
                receptionNumber: formData.receptionNumber,
                receptionNumberDisposition: formData.receptionNumberDisposition,
                remark: formData.remark,
                teamId: user?.teamId,
                comments: [],
            });
            setAddSuccess(true);
            setTimeout(() => { setIsAddModalOpen(false); setAddSuccess(false); }, 1400);
        } catch (err: any) {
            setAddError(err?.message || 'Failed to add prospect. Please try again.');
        } finally {
            setAddLoading(false);
        }
    };

    const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLoading(true);
        setUploadProgress('Initializing Deduplication Logic...');
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target?.result as string;
                const rows = text.split(/\r\n|\n/).filter(r => r.trim().length > 0);
                if (rows.length < 2) return;
                const newProspects = rows.slice(1).map(row => {
                    const cols = row.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
                    if (cols.length < 5) return null;
                    return {
                        id: cols[0] || undefined, fullName: cols[1], firstName: cols[2],
                        lastName: cols[3], companyName: cols[4], designation: cols[5],
                        workEmail: cols[6], contactNumber1: cols[7], contactNumber2: cols[8],
                        contactNumber3: cols[9], receptionNumber: cols[10], city: cols[11],
                        state: cols[12], website: cols[13], personalLinkedin: cols[14],
                        companyLinkedin: cols[15], companyIndustry: cols[16],
                        companySubIndustry: cols[17], companyEmployeeSize: cols[18],
                        companyCIN: cols[19], remark: cols[20]
                    };
                }).filter(p => p && (p.fullName || p.companyName));
                // @ts-ignore
                await addProspectsBulk(newProspects, (c) => setUploadProgress(`${c} / ${newProspects.length} synced...`));
                alert("Bulk Import & Dedup Sync Complete.");
            } catch (err) {
                console.error(err);
                alert("Import error. Verify CSV structure matches the 21-column template.");
            } finally {
                setLoading(false);
                setUploadProgress('');
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    const handleDownloadTemplate = () => {
        const headers = ["id","fullName","firstName","lastName","companyName","designation","workEmail","contactNumber1","contactNumber2","contactNumber3","receptionNumber","city","state","website","personalLinkedin","companyLinkedin","companyIndustry","companySubIndustry","companyEmployeeSize","companyCIN","remark"];
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", "amplior_master_prospect_template_v5.csv");
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    const handleDownloadMD = () => {
        const blob = new Blob(["# Amplior Extension Schema v5.0"], { type: 'text/markdown' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'Amplior_Extension_Schema_v5.md';
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
    };

    // ── Tab renderers ─────────────────────────────────────────────────────────
    const renderPersonalTab = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="First Name">
                <input className={inputCls} placeholder="e.g. Rahul" value={formData.firstName} onChange={e => handleFormChange('firstName', e.target.value)} />
            </Field>
            <Field label="Last Name">
                <input className={inputCls} placeholder="e.g. Sharma" value={formData.lastName} onChange={e => handleFormChange('lastName', e.target.value)} />
            </Field>
            <Field label="Job Title / Designation">
                <input className={inputCls} placeholder="e.g. Chief Technology Officer" value={formData.designation} onChange={e => handleFormChange('designation', e.target.value)} />
            </Field>
            <Field label="LinkedIn Profile URL" required>
                <input className={inputCls} placeholder="linkedin.com/in/username" value={formData.personalLinkedin} onChange={e => handleFormChange('personalLinkedin', e.target.value)} />
            </Field>
            <Field label="City">
                <input className={inputCls} placeholder="e.g. Bangalore" value={formData.city} onChange={e => handleFormChange('city', e.target.value)} />
            </Field>
            <Field label="State">
                <input className={inputCls} placeholder="e.g. Karnataka" value={formData.state} onChange={e => handleFormChange('state', e.target.value)} />
            </Field>
            <div className="md:col-span-2">
                <Field label="Remark / Notes">
                    <textarea className={inputCls} rows={3} placeholder="Add any notes about this prospect..." value={formData.remark} onChange={e => handleFormChange('remark', e.target.value)} />
                </Field>
            </div>
        </div>
    );

    const renderCompanyTab = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Company Name" required>
                <input className={inputCls} placeholder="e.g. Infosys BPM" value={formData.companyName} onChange={e => handleFormChange('companyName', e.target.value)} />
            </Field>
            <Field label="Industry">
                <select className={selectCls} value={formData.companyIndustry} onChange={e => handleFormChange('companyIndustry', e.target.value)}>
                    <option value="">Select Industry...</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
            </Field>
            <Field label="Sub-Industry">
                <input className={inputCls} placeholder="e.g. IT Services & Consulting" value={formData.companySubIndustry} onChange={e => handleFormChange('companySubIndustry', e.target.value)} />
            </Field>
            <Field label="Employee Size">
                <select className={selectCls} value={formData.companyEmployeeSize} onChange={e => handleFormChange('companyEmployeeSize', e.target.value)}>
                    <option value="">Select size...</option>
                    {EMPLOYEE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </Field>
            <Field label="Website">
                <input className={inputCls} placeholder="e.g. infosysbpm.com" value={formData.website} onChange={e => handleFormChange('website', e.target.value)} />
            </Field>
            <Field label="Company LinkedIn">
                <input className={inputCls} placeholder="linkedin.com/company/name" value={formData.companyLinkedin} onChange={e => handleFormChange('companyLinkedin', e.target.value)} />
            </Field>
            <Field label="CIN (Corporate Identity Number)">
                <input className={inputCls} placeholder="e.g. U72200KA2002PLC031981" value={formData.companyCIN} onChange={e => handleFormChange('companyCIN', e.target.value)} />
            </Field>
        </div>
    );

    const renderContactTab = () => (
        <div className="grid grid-cols-1 gap-4">
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Work Email</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Email Address">
                        <input className={inputCls} placeholder="name@company.com" value={formData.workEmail} onChange={e => handleFormChange('workEmail', e.target.value)} />
                    </Field>
                    <Field label="Disposition">
                        <DispositionSelect value={formData.workEmailDisposition} onChange={v => handleFormChange('workEmailDisposition', v)} />
                    </Field>
                </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Primary Phone</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Phone Number">
                        <input className={inputCls} placeholder="+91 98450 12345" value={formData.contactNumber1} onChange={e => handleFormChange('contactNumber1', e.target.value)} />
                    </Field>
                    <Field label="Disposition">
                        <DispositionSelect value={formData.contactNumber1Disposition} onChange={v => handleFormChange('contactNumber1Disposition', v)} />
                    </Field>
                </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Secondary Phone</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Field label="Phone Number">
                        <input className={inputCls} placeholder="+91 98450 12346" value={formData.contactNumber2} onChange={e => handleFormChange('contactNumber2', e.target.value)} />
                    </Field>
                    <Field label="Disposition">
                        <DispositionSelect value={formData.contactNumber2Disposition} onChange={v => handleFormChange('contactNumber2Disposition', v)} />
                    </Field>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Phone 3</p>
                    <div className="space-y-2">
                        <input className={inputCls} placeholder="+91 98450 12347" value={formData.contactNumber3} onChange={e => handleFormChange('contactNumber3', e.target.value)} />
                        <DispositionSelect value={formData.contactNumber3Disposition} onChange={v => handleFormChange('contactNumber3Disposition', v)} />
                    </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Reception / Boardline</p>
                    <div className="space-y-2">
                        <input className={inputCls} placeholder="+91 80 4116 7890" value={formData.receptionNumber} onChange={e => handleFormChange('receptionNumber', e.target.value)} />
                        <DispositionSelect value={formData.receptionNumberDisposition} onChange={v => handleFormChange('receptionNumberDisposition', v)} />
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Database Manager</h1>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <button onClick={() => setIsSchemaModalOpen(true)} className="text-accent hover:underline flex items-center gap-1 font-bold">
                           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                           View Field Schema (for Extension Team)
                        </button>
                    </div>
                </div>
                <div className="flex gap-2 items-center w-full md:w-auto flex-wrap">
                    {/* ── ADD PROSPECT BUTTON ────────────────────────────────── */}
                    <button
                        id="add-prospect-btn"
                        onClick={openAddModal}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all duration-150 shadow-sm hover:shadow-md hover:opacity-90 active:scale-95"
                        style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)' }}
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Add Prospect
                    </button>
                    <Button onClick={() => setIsEditMode(!isEditMode)} className={isEditMode ? "bg-amber-500 hover:bg-amber-600" : ""}>
                        {isEditMode ? "Lock Database" : "Enable Edit Mode"}
                    </Button>
                    <input className="border border-gray-300 rounded px-3 py-2 text-sm md:w-48" placeholder="Quick search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    <div className="flex border-l pl-2 space-x-2">
                        <input type="file" accept=".csv" ref={fileInputRef} onChange={handleCSVImport} className="hidden" />
                        <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>Upload CSV</Button>
                        <Button variant="ghost" size="sm" onClick={() => setIsExportModalOpen(true)}>Export</Button>
                    </div>
                </div>
            </div>
            
            {uploadProgress && (
                <div className="bg-blue-50 border border-blue-100 p-3 rounded text-sm text-blue-700 flex items-center shadow-inner">
                    <span className="animate-spin h-4 w-4 border-2 border-accent border-t-transparent rounded-full mr-3"></span>
                    {uploadProgress}
                </div>
            )}

            {/* Table */}
            <div className={`flex-1 bg-white rounded-lg shadow border overflow-hidden flex flex-col ${isEditMode ? 'border-amber-300 ring-2 ring-amber-100' : 'border-gray-200'}`}>
                <div className="overflow-auto flex-1">
                    <table className="min-w-max divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-12">#</th>
                                <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[200px]">Full Name</th>
                                <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[200px]">Company</th>
                                <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[250px]">Work Email</th>
                                <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[180px]">Primary Phone</th>
                                <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[150px]">LinkedIn</th>
                                <th className="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-16 sticky right-0 bg-gray-50 shadow-l">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedProspects.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-16 text-gray-400">
                                        <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        <p className="font-medium text-sm">No prospects yet</p>
                                        <p className="text-xs mt-1">Click <strong>"Add Prospect"</strong> to get started</p>
                                    </td>
                                </tr>
                            ) : paginatedProspects.map((prospect, index) => (
                                <tr key={prospect.id} className="hover:bg-blue-50/30">
                                    <td className="px-3 py-2 text-xs text-gray-400">{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}</td>
                                    <td className="p-1 px-3 text-sm text-gray-700">
                                        {isEditMode ? <input className="w-full border rounded p-1" defaultValue={prospect.fullName} onBlur={e => handleUpdateField(prospect.id, 'fullName', e.target.value)} /> : <span className="block py-1.5 font-medium">{prospect.fullName}</span>}
                                    </td>
                                    <td className="p-1 px-3 text-sm text-gray-700">
                                        {isEditMode ? <input className="w-full border rounded p-1" defaultValue={prospect.companyName} onBlur={e => handleUpdateField(prospect.id, 'companyName', e.target.value)} /> : <span className="block py-1.5">{prospect.companyName}</span>}
                                    </td>
                                    <td className="p-1 px-3 text-sm text-gray-700">
                                        {isEditMode ? <input className="w-full border rounded p-1" defaultValue={prospect.workEmail} onBlur={e => handleUpdateField(prospect.id, 'workEmail', e.target.value)} /> : <span className="block py-1.5">{prospect.workEmail}</span>}
                                    </td>
                                    <td className="p-1 px-3 text-sm text-gray-700">
                                        {isEditMode ? <input className="w-full border rounded p-1" defaultValue={prospect.contactNumber1} onBlur={e => handleUpdateField(prospect.id, 'contactNumber1', e.target.value)} /> : <span className="block py-1.5">{prospect.contactNumber1}</span>}
                                    </td>
                                    <td className="p-1 px-3 text-sm text-gray-700">
                                        <a href={`https://${prospect.personalLinkedin}`} target="_blank" className="text-blue-600 hover:underline truncate block max-w-[150px]">{prospect.personalLinkedin}</a>
                                    </td>
                                    <td className="px-3 py-2 text-center sticky right-0 bg-white shadow-l">
                                        {isEditMode && (
                                            <button onClick={() => { setRecordToDelete(prospect.id); setIsDeleteModalOpen(true); }} className="text-gray-400 hover:text-red-600 p-1">
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="bg-gray-50 px-4 py-3 border-t flex items-center justify-between">
                    <p className="text-sm text-gray-700">Showing {filteredProspects.length} total records</p>
                    <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1}>Prev</Button>
                        <span className="text-sm self-center">Page {currentPage} of {totalPages || 1}</span>
                        <Button size="sm" variant="secondary" onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages}>Next</Button>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════
                ADD PROSPECT MODAL
            ═══════════════════════════════════════════════ */}
            <Modal isOpen={isAddModalOpen} onClose={() => !addLoading && setIsAddModalOpen(false)} title="Add New Prospect" size="lg">
                <div className="space-y-4">
                    {/* Tab Bar */}
                    <div className="flex border-b border-gray-200 -mt-1">
                        {([
                            { key: 'personal', label: '👤 Personal Info' },
                            { key: 'company',  label: '🏢 Company Info' },
                            { key: 'contact',  label: '📞 Contact Details' },
                        ] as const).map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setAddTab(tab.key)}
                                className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-all ${
                                    addTab === tab.key
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="min-h-[320px] pt-1">
                        {addTab === 'personal' && renderPersonalTab()}
                        {addTab === 'company'  && renderCompanyTab()}
                        {addTab === 'contact'  && renderContactTab()}
                    </div>

                    {/* Error / Success */}
                    {addError && (
                        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {addError}
                        </div>
                    )}
                    {addSuccess && (
                        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700 flex items-center gap-2">
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            Prospect added! Syncing to Supabase in real-time...
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="flex gap-2">
                            {addTab !== 'personal' && (
                                <button
                                    onClick={() => setAddTab(addTab === 'contact' ? 'company' : 'personal')}
                                    className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
                                >
                                    ← Back
                                </button>
                            )}
                            {addTab !== 'contact' && (
                                <button
                                    onClick={() => setAddTab(addTab === 'personal' ? 'company' : 'contact')}
                                    className="text-sm text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50 font-medium"
                                >
                                    Next →
                                </button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)} disabled={addLoading}>Cancel</Button>
                            <button
                                id="submit-add-prospect-btn"
                                onClick={handleAddProspect}
                                disabled={addLoading || addSuccess}
                                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 active:scale-95"
                                style={{ background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)' }}
                            >
                                {addLoading ? (
                                    <><span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" /> Saving...</>
                                ) : addSuccess ? (
                                    <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg> Saved!</>
                                ) : (
                                    <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg> Save to Database</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* SCHEMA MODAL */}
            <Modal isOpen={isSchemaModalOpen} onClose={() => setIsSchemaModalOpen(false)} title="Data Collection Schema Reference" size="lg">
                <div className="space-y-6">
                    <div className="bg-amber-50 p-4 border border-amber-200 rounded-lg text-amber-800 text-sm">
                        <strong>Deduplication Logic:</strong> When importing or creating, the system checks: 
                        <br/>1. <code>prospectId</code> (Direct ID match)
                        <br/>2. <code>personalLinkedin</code> (Normalized URL - Primary Key)
                        <br/>3. <code>fullName</code> + <code>companyName</code> (Fuzzy fallback)
                    </div>
                    <div className="flex justify-end pt-4 border-t space-x-2">
                        <Button variant="secondary" onClick={handleDownloadMD}>Download Schema Guide (.md)</Button>
                        <Button onClick={handleDownloadTemplate}>Download Import Header Template</Button>
                    </div>
                </div>
            </Modal>

            {/* DELETE MODAL */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Record" size="sm">
                <div className="space-y-4">
                    <p className="text-gray-700">Delete this record permanently? This cannot be undone.</p>
                    <div className="flex justify-end space-x-2">
                        <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                        <Button variant="danger" onClick={confirmDelete}>Delete</Button>
                    </div>
                </div>
            </Modal>

            {/* EXPORT MODAL */}
            <Modal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} title="Export Database">
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">Select columns to include in your CSV export.</p>
                    <div className="grid grid-cols-2 gap-2 h-48 overflow-y-auto border p-2 rounded">
                        {Object.keys(selectedExportColumns).map(k => (
                            <label key={k} className="flex items-center gap-2 text-sm p-1 hover:bg-gray-50 rounded">
                                <input type="checkbox" checked={selectedExportColumns[k]} onChange={() => setSelectedExportColumns(prev => ({...prev, [k]: !prev[k]}))} />
                                <span className="capitalize">{k}</span>
                            </label>
                        ))}
                    </div>
                    <div className="flex justify-end pt-4 border-t">
                        <Button onClick={() => { setIsExportModalOpen(false); alert("Generating export..."); }}>Download CSV</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default AdminDatabasePage;
