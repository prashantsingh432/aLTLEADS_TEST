
import React, { useState, useRef, useMemo } from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { Role, Prospect, Disposition } from '../types';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Navigate } from 'react-router-dom';

const AdminDatabasePage: React.FC = () => {
    const { prospects, updateProspect, addProspectsBulk, deleteProspect } = useData();
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

    const [selectedExportColumns, setSelectedExportColumns] = useState<Record<string, boolean>>({
        id: true, fullName: true, firstName: true, lastName: true, companyName: true,
        designation: true, workEmail: true, contactNumber1: true,
        city: true, personalLinkedin: true, companyLinkedin: true,
        companyIndustry: true, remark: true, workEmailDisposition: true, 
        contactNumber1Disposition: true, website: true, state: true
    });

    if (!user || user.role !== Role.ADMIN) {
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
        } finally {
            setDeletingId(null);
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

                // The bulk logic inside DataContext already handles:
                // 1. ID Check
                // 2. LinkedIn Normalization Check (URL cleanup)
                // 3. Update existing vs Create new
                
                // MAPPING: Ensure this matches the headers in handleDownloadTemplate exactly by index
                const newProspects = rows.slice(1).map(row => {
                    const cols = row.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
                    // Safety check for min columns (ID, FullName, First, Last, Company = 5)
                    if (cols.length < 5) return null;

                    return {
                        id: cols[0] || undefined,
                        fullName: cols[1],
                        firstName: cols[2],
                        lastName: cols[3],
                        companyName: cols[4],
                        designation: cols[5],
                        workEmail: cols[6],
                        contactNumber1: cols[7],
                        contactNumber2: cols[8],
                        contactNumber3: cols[9],
                        receptionNumber: cols[10],
                        city: cols[11],
                        state: cols[12],
                        website: cols[13],
                        personalLinkedin: cols[14],
                        companyLinkedin: cols[15],
                        companyIndustry: cols[16],
                        companySubIndustry: cols[17],
                        companyEmployeeSize: cols[18],
                        companyCIN: cols[19],
                        remark: cols[20]
                    };
                }).filter(p => p && (p.fullName || p.companyName));

                // @ts-ignore
                await addProspectsBulk(newProspects, (c) => setUploadProgress(`${c} / ${newProspects.length} synced...`));
                alert("Bulk Import & Dedup Sync Complete.");
            } catch (err) {
                console.error(err);
                alert("Import error. Verify CSV structure matches the new 21-column template.");
            } finally {
                setLoading(false);
                setUploadProgress('');
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    const handleDownloadTemplate = () => {
        const headers = [
            "id", "fullName", "firstName", "lastName", "companyName", "designation",
            "workEmail", "contactNumber1", "contactNumber2", "contactNumber3", "receptionNumber", 
            "city", "state", "website", "personalLinkedin", "companyLinkedin",
            "companyIndustry", "companySubIndustry", "companyEmployeeSize", "companyCIN", "remark"
        ];
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "amplior_master_prospect_template_v5.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadMD = () => {
        const mdContent = `# Amplior Prospect Intelligence - Extension Integration Guide (v5.0)

## 1. Overview
The extension acts as a data ingestion and retrieval tool. It must sync data to the \`prospects\` collection and request updates via the \`contactRequests\` collection.

## 2. Deduplication Logic (Critical)
To prevent duplicate records, the system enforces the following hierarchy when syncing profiles.

1.  **ID Match (Priority 1):**
    *   If the record already has a known \`amplior_id\` (e.g. from a previous search), update that specific Document ID.

2.  **LinkedIn URL Match (Priority 2 - Primary Key):**
    *   Clean the URL: Remove \`https://\`, \`http://\`, \`www.\`, and trailing slashes.
    *   Example: \`https://www.linkedin.com/in/john-doe/\` -> \`linkedin.com/in/john-doe\`
    *   Query \`prospects\` collection where \`personalLinkedin == cleaned_url\`.

3.  **Fuzzy Name Match (Priority 3 - Fallback):**
    *   If no LinkedIn URL is available, query for:
    *   \`fullName\` (Exact Case Insensitive) **AND** \`companyName\` (Exact Case Insensitive).

## 3. Data Schema: prospects Collection

| Field Name | Type | Description |
| :--- | :--- | :--- |
| id | string | Firestore Document ID |
| fullName | string | Full display name |
| firstName | string | |
| lastName | string | |
| designation | string | Job Title |
| companyName | string | |
| personalLinkedin | string | *Highly Recommended for dedup. Store normalized. |
| workEmail | string | |
| workEmailDisposition | enum | Accurate, Wrong, Unverified (Default) |
| contactNumber1 | string | Primary Mobile/Direct |
| contactNumber1Disposition| enum | Accurate, Wrong, Unverified (Default) |
| contactNumber2 | string | Secondary Phone |
| contactNumber3 | string | Other Phone |
| receptionNumber | string | Board line |
| city | string | |
| state | string | |
| website | string | Company Domain |
| companyLinkedin | string | Company Profile URL |
| companyIndustry | string | |
| companySubIndustry | string | e.g. "SaaS", "EdTech" |
| companyEmployeeSize | string | e.g. "51-200" |
| companyCIN | string | Corporate ID Number |
| remark | string | Agent notes |
| teamId | string | Linked Team ID (e.g. team_default) |
| lastUpdated | timestamp| Server timestamp |
`;
        const blob = new Blob([mdContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'Amplior_Extension_Schema_v5.md';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col h-full space-y-4">
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

            <div className={`flex-1 bg-white rounded-lg shadow border overflow-hidden ${isEditMode ? 'border-amber-300 ring-2 ring-amber-100' : 'border-gray-200'}`}>
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
                            {paginatedProspects.map((prospect, index) => (
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
                                        {isEditMode && <button onClick={() => { setRecordToDelete(prospect.id); setIsDeleteModalOpen(true); }} className="text-gray-400 hover:text-red-600 p-1">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>}
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

            {/* SCHEMA REFERENCE MODAL */}
            <Modal isOpen={isSchemaModalOpen} onClose={() => setIsSchemaModalOpen(false)} title="Data Collection Schema Reference" size="lg">
                <div className="space-y-6">
                    <div className="bg-amber-50 p-4 border border-amber-200 rounded-lg text-amber-800 text-sm">
                        <strong>Deduplication Logic:</strong> When importing or creating, the system checks: 
                        <br/>1. <code>prospectId</code> (Direct ID match)
                        <br/>2. <code>personalLinkedin</code> (Normalized URL comparison - Primary Key)
                        <br/>3. <code>fullName</code> + <code>companyName</code> (Fuzzy fallback)
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-bold text-gray-900 border-b pb-1 mb-2">Prospects Collection</h3>
                            <div className="text-[10px] font-mono bg-gray-900 text-green-400 p-3 rounded overflow-x-auto h-64 overflow-y-auto">
                                <pre>{`{
  id: string; (Auto-gen)
  fullName: string;
  firstName: string;
  lastName: string;
  companyName: string;
  designation: string;
  workEmail: string;
  workEmailDisposition: "Accurate"|"Wrong"|"Unverified";
  contactNumber1: string;
  contactNumber1Disposition: string;
  contactNumber2: string; // NEW
  contactNumber3: string; // NEW
  receptionNumber: string; // NEW
  personalLinkedin: string; (Normalized)
  companyLinkedin: string; // NEW
  companyIndustry: string;
  companySubIndustry: string; // NEW
  companyEmployeeSize: string; // NEW
  companyCIN: string; // NEW
  website: string;
  city: string;
  state: string;
  remark: string;
  teamId: string;
  lastUpdated: timestamp;
}`}</pre>
                            </div>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 border-b pb-1 mb-2">ContactRequests Collection</h3>
                            <div className="text-[10px] font-mono bg-gray-900 text-blue-400 p-3 rounded overflow-x-auto h-64 overflow-y-auto">
                                <pre>{`{
  id: string;
  prospectId: string; (Link to existing)
  prospectName: string;
  companyName: string;
  status: "Pending"|"In Progress"|"Fulfilled";
  requestedBy: { uid, name, email };
  foundEmail: string;
  foundPhone: string;
  foundRemark: string;
  sourceHint: string; (Extension, etc)
  createdAt: timestamp;
  updatedAt: timestamp;
}`}</pre>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end pt-4 border-t space-x-2">
                        <Button variant="secondary" onClick={handleDownloadMD}>Download Schema Guide (.md)</Button>
                        <Button onClick={handleDownloadTemplate}>Download Import Header Template</Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Record" size="sm">
                <div className="space-y-4">
                    <p className="text-gray-700">Delete this record permanently?</p>
                    <div className="flex justify-end space-x-2">
                        <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                        <Button variant="danger" onClick={confirmDelete}>Delete</Button>
                    </div>
                </div>
            </Modal>

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
