
import React, { useState, useRef, useEffect } from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { Role, User, Disposition, PLAN_CONFIG, PlanType } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { isSuperAdmin as checkSuperAdmin, isAdmin as checkAdmin, canDeleteUser } from '../lib/permissions';

const SettingsPage: React.FC = () => {
    const { users, seedDatabase, addProspectsBulk, runV5Migration, teams, products, aiModels, allUserCredits, currentUserCredits, updateUserPlan, updateUserRole, deleteUser } = useData();
    const { user: currentUser, createUserByAdmin, updateUserByAdmin } = useAuth();

    const [activeTab, setActiveTab] = useState<'my-settings' | 'add-user' | 'admin-users' | 'admin-data'>('my-settings');
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState<string>('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const userImportRef = useRef<HTMLInputElement>(null);

    // --- SEARCH STATE ---
    const [userSearchTerm, setUserSearchTerm] = useState('');

    // --- MY PERSONAL SETTINGS STATE ---
    const [myProduct, setMyProduct] = useState('');
    const [autoOpen, setAutoOpen] = useState(false);
    const [myProfileName, setMyProfileName] = useState('');
    const [myApiKeys, setMyApiKeys] = useState({ groq: '', openrouter: '', gemini: '' });
    const [showMyKeys, setShowMyKeys] = useState({ groq: false, openrouter: false, gemini: false });
    const [myModelConfig, setMyModelConfig] = useState({
        extraction: '', scoring: '', research: '', pitches: ''
    });

    // --- ADMIN: CREATE USER STATE ---
    const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserName, setNewUserName] = useState('');
    const [newUserRole, setNewUserRole] = useState<Role>(Role.AGENT);
    const [newUserTeamId, setNewUserTeamId] = useState('');

    // --- ADMIN: EDIT USER STATE ---
    const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
    const [editUserTab, setEditUserTab] = useState<'profile' | 'models' | 'keys'>('profile');
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editUserName, setEditUserName] = useState('');
    const [editUserRole, setEditUserRole] = useState<Role>(Role.AGENT);
    const [editUserStatus, setEditUserStatus] = useState<'Active' | 'Inactive'>('Active');
    const [editUserTeamId, setEditUserTeamId] = useState('');
    const [editUserPassword, setEditUserPassword] = useState('');
    const [editUserApiKeys, setEditUserApiKeys] = useState({ groq: '', openrouter: '', gemini: '' });
    const [editUserModelConfig, setEditUserModelConfig] = useState({ extraction: '', scoring: '', research: '', pitches: '' });
    const [showEditKeys, setShowEditKeys] = useState({ groq: false, openrouter: false, gemini: false });

    // --- ADMIN: MANAGE PLAN STATE ---
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [selectedUserForPlan, setSelectedUserForPlan] = useState<User | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<PlanType>('free');
    const [manualBalance, setManualBalance] = useState<number>(0);

    const [isSeedModalOpen, setIsSeedModalOpen] = useState(false);
    const isSuperAdmin = checkSuperAdmin(currentUser);
    const isAdmin = checkAdmin(currentUser);

    // Initialize My Settings from Current User
    useEffect(() => {
        if (currentUser) {
            setMyProduct(currentUser.preferences?.selectedProductId || '');
            setAutoOpen(currentUser.preferences?.autoOpenOnLinkedIn || false);
            setMyProfileName(currentUser.name || '');
            setMyApiKeys({
                groq: currentUser.apiKeys?.groq || '',
                openrouter: currentUser.apiKeys?.openrouter || '',
                gemini: currentUser.apiKeys?.gemini || ''
            });
            setMyModelConfig({
                extraction: currentUser.modelConfig?.extraction || '',
                scoring: currentUser.modelConfig?.scoring || '',
                research: currentUser.modelConfig?.research || '',
                pitches: currentUser.modelConfig?.pitches || ''
            });
        }
    }, [currentUser]);

    // --- HANDLERS ---
    const handleSaveMySettings = async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            await updateUserByAdmin(currentUser.id, {
                name: myProfileName,
                preferences: { selectedProductId: myProduct, autoOpenOnLinkedIn: autoOpen },
                apiKeys: myApiKeys,
                modelConfig: myModelConfig
            });
            alert("Your settings have been saved!");
        } catch (e: any) {
            alert("Error saving: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const openEditUserModal = (user: User) => {
        setEditingUser(user);
        setEditUserName(user.name);
        setEditUserRole(user.role);
        setEditUserStatus(user.status || 'Active');
        setEditUserTeamId(user.teamId || '');
        setEditUserPassword('');
        setEditUserApiKeys({
            groq: user.apiKeys?.groq || '',
            openrouter: user.apiKeys?.openrouter || '',
            gemini: user.apiKeys?.gemini || ''
        });
        setEditUserModelConfig({
            extraction: user.modelConfig?.extraction || '',
            scoring: user.modelConfig?.scoring || '',
            research: user.modelConfig?.research || '',
            pitches: user.modelConfig?.pitches || ''
        });
        setEditUserTab('profile');
        setShowEditKeys({ groq: false, openrouter: false, gemini: false });
        setIsEditUserModalOpen(true);
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        setLoading(true);
        try {
            await updateUserByAdmin(editingUser.id, {
                name: editUserName,
                role: editUserRole,
                status: editUserStatus,
                teamId: editUserTeamId,
                password: editUserPassword,
                apiKeys: editUserApiKeys,
                modelConfig: editUserModelConfig
            });
            alert("User profile updated successfully.");
            setIsEditUserModalOpen(false);
            setEditingUser(null);
        } catch (e: any) {
            alert(`Update failed: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId: string, userName: string) => {
        const targetUser = users.find(u => u.id === userId);
        if (!canDeleteUser(currentUser, targetUser || null)) {
            alert("Access Denied: You are not authorized to delete this user.");
            return;
        }
        if (window.confirm(`Are you sure you want to permanently delete user "${userName}"? This will completely remove them from the database. This action is irreversible.`)) {
            setLoading(true);
            try {
                await deleteUser(userId);
                alert(`User "${userName}" has been successfully deleted.`);
            } catch (e: any) {
                alert(`Failed to delete user: ${e.message}`);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createUserByAdmin(newUserEmail, newUserPassword, newUserName, newUserRole, newUserTeamId || undefined);
            // Reset all form fields after success
            setNewUserName('');
            setNewUserEmail('');
            setNewUserPassword('');
            setNewUserRole(Role.AGENT);
            setNewUserTeamId('');
            setIsCreateUserModalOpen(false);
            alert(`✅ User "${newUserName || newUserEmail}" created successfully! They can now log in to the CRM.`);
        } catch (err: any) {
            alert(`Failed to create user: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const openPlanModal = (user: User) => {
        setSelectedUserForPlan(user);
        const creds = allUserCredits.find(c => c.userId === user.id);
        setSelectedPlan(creds?.plan || 'free');
        setManualBalance(creds?.balance !== undefined ? creds.balance : PLAN_CONFIG[creds?.plan || 'free'].credits);
        setIsPlanModalOpen(true);
    };

    const handleUpdatePlan = async () => {
        if (!selectedUserForPlan) return;
        setLoading(true);
        try {
            await updateUserPlan(selectedUserForPlan.id, selectedPlan, manualBalance);
            alert(`Plan updated to ${PLAN_CONFIG[selectedPlan].label} with ${manualBalance} credits.`);
            setIsPlanModalOpen(false);
        } catch (e) {
            console.error(e);
            alert("Failed to update plan.");
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadUserTemplate = () => {
        const headers = [
            "name", "email", "password", "role", "teamId",
            "groqKey", "openrouterKey", "geminiKey",
            "extractionModel", "scoringModel", "researchModel", "pitchesModel"
        ];
        const exampleRow = [
            "John Doe", "john@example.com", "SecurePass123!", "Agent", "team_default",
            "gsk_key_here", "sk-or-key_here", "gemini_key_here",
            "model_llama8b", "model_gptoss20b", "model_compound", "model_gptoss120b"
        ].join(",");
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + exampleRow;
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "altleads_bulk_onboarding_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleBulkUserImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLoading(true);
        setProgress('Starting Bulk Provisioning Sequence...');

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target?.result as string;
                const rows = text.split(/\r\n|\n/).filter(r => r.trim().length > 0);
                if (rows.length < 2) return;

                for (let i = 1; i < rows.length; i++) {
                    const cols = rows[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
                    if (cols.length < 2) continue;

                    const [name, email, password, role, teamId, groq, openrouter, gemini, ext, sco, res, pit] = cols;

                    if (email) {
                        setProgress(`Provisioning ${i}/${rows.length - 1}: ${email}...`);
                        try {
                            await createUserByAdmin(
                                email,
                                password || 'AltLeads2024!',
                                name,
                                (role as Role) || Role.AGENT,
                                teamId || undefined,
                                { groq, openrouter, gemini },
                                { extraction: ext, scoring: sco, research: res, pitches: pit }
                            );
                        } catch (err) { console.error(`Failed ${email}:`, err); }
                        await new Promise(r => setTimeout(r, 800));
                    }
                }
                alert(`Bulk Provisioning Complete.`);
            } catch (err) { alert("Import Failure: CSV structure invalid."); }
            finally { setLoading(false); setProgress(''); if (userImportRef.current) userImportRef.current.value = ''; }
        };
        reader.readAsText(file);
    };

    const filteredUsers = users.filter(u => {
        if (u.role === Role.PENDING) return false;
        if (!userSearchTerm) return true;
        const term = userSearchTerm.toLowerCase();
        const teamName = teams.find(t => t.id === u.teamId)?.name?.toLowerCase() || '';
        return (
            u.name.toLowerCase().includes(term) ||
            u.email.toLowerCase().includes(term) ||
            teamName.includes(term)
        );
    });

    const pendingUsers = users.filter(u => u.role === Role.PENDING);

    const availableProducts = products.filter(p => (p.teamId === currentUser?.teamId) || (p.teamIds && currentUser?.teamId && p.teamIds.includes(currentUser.teamId)));

    const TabButton = ({ id, label, badge }: { id: typeof activeTab, label: string, badge?: number }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === id ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
        >
            {label}
            {badge !== undefined && badge > 0 && (
                <span className="bg-accent text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{badge}</span>
            )}
        </button>
    );

    return (
        <div className="space-y-8 max-w-6xl mx-auto pb-20">
            <div className="border-b border-border pb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary">Settings</h1>
                    <p className="text-text-secondary mt-1">Manage personal preferences and organizational user control.</p>
                </div>
                <div className="text-right">
                    <Button onClick={handleSaveMySettings} disabled={loading}>{loading ? 'Saving...' : 'Save Settings'}</Button>
                </div>
            </div>

            <div className="flex border-b border-gray-200 overflow-x-auto">
                <TabButton id="my-settings" label="My Extension Preferences" />
                {isAdmin && <TabButton id="add-user" label="Add User" badge={users.filter(u => u.role !== Role.PENDING).length} />}
                {isAdmin && <TabButton id="admin-users" label="User Directory & Control" />}
                {isAdmin && <TabButton id="admin-data" label="Global System Data" />}
            </div>

            {/* --- TAB: MY SETTINGS --- */}
            {activeTab === 'my-settings' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in">
                    <div className="space-y-6">
                        {/* --- NEW: MY CREDITS CARD --- */}
                        <Card title="My Credits & Usage" className="border-t-4 border-t-accent">
                            {currentUserCredits ? (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-sm text-gray-500">Current Balance</p>
                                            <p className="text-3xl font-bold text-gray-900">{currentUserCredits.balance.toLocaleString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
                                                {PLAN_CONFIG[currentUserCredits.plan]?.label || currentUserCredits.plan}
                                            </span>
                                            <p className="text-xs text-gray-400 mt-1">
                                                Resets in {Math.max(0, 30 - Math.ceil(Math.abs(new Date().getTime() - (currentUserCredits.lastReset?.getTime() || 0)) / (1000 * 60 * 60 * 24)))} days
                                            </p>
                                        </div>
                                    </div>

                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                        <div className="bg-accent h-2.5 rounded-full" style={{ width: `${Math.min(100, (currentUserCredits.balance / currentUserCredits.monthlyAllocation) * 100)}%` }}></div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-xs text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        <div><strong className="text-gray-900">{currentUserCredits.usage?.scoring || 0}</strong> Scores</div>
                                        <div><strong className="text-gray-900">{currentUserCredits.usage?.pitches || 0}</strong> Pitches</div>
                                        <div><strong className="text-gray-900">{currentUserCredits.usage?.research || 0}</strong> Deep Dives</div>
                                        <div><strong className="text-gray-900">{currentUserCredits.usage?.contacts || 0}</strong> Lookups</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-6 text-gray-400">
                                    <p>Loading credit info...</p>
                                </div>
                            )}
                        </Card>

                        <Card title="Extension Workflow">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Active Product Focus</label>
                                    <select value={myProduct} onChange={(e) => setMyProduct(e.target.value)} className="block w-full border border-gray-300 rounded-md p-2.5 text-sm focus:ring-accent">
                                        <option value="">-- No Product Selected --</option>
                                        {availableProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-center space-x-3 pt-2">
                                    <input type="checkbox" id="autoOpen" checked={autoOpen} onChange={(e) => setAutoOpen(e.target.checked)} className="h-4 w-4 text-accent border-gray-300 rounded" />
                                    <label htmlFor="autoOpen" className="text-sm text-gray-700 select-none cursor-pointer">Auto-open extension on LinkedIn profiles</label>
                                </div>
                            </div>
                        </Card>

                        <Card title="Personal API Keys (Overrides)">
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-4">Leave empty to use Team Defaults</p>
                            <div className="space-y-4">
                                {['groq', 'openrouter', 'gemini'].map(k => (
                                    <div key={k} className="relative">
                                        <Input
                                            label={`${k.toUpperCase()} API Key`}
                                            type={showMyKeys[k as keyof typeof showMyKeys] ? 'text' : 'password'}
                                            value={myApiKeys[k as keyof typeof myApiKeys]}
                                            onChange={e => setMyApiKeys({ ...myApiKeys, [k]: e.target.value })}
                                        />
                                        <button type="button" onClick={() => setShowMyKeys({ ...showMyKeys, [k]: !showMyKeys[k as keyof typeof showMyKeys] })} className="absolute right-3 top-[32px] text-gray-400 hover:text-accent p-1">
                                            {showMyKeys[k as keyof typeof showMyKeys] ? 'Hide' : 'Show'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card title="Personal Model Selections">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {['extraction', 'scoring', 'research', 'pitches'].map(key => (
                                    <div key={key}>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{key} Model</label>
                                        <select className="block w-full border border-gray-300 rounded-md p-2 text-sm" value={(myModelConfig as any)[key] || ''} onChange={e => setMyModelConfig({ ...myModelConfig, [key]: e.target.value })}>
                                            <option value="">-- Use Team Default --</option>
                                            {aiModels.filter(m => m.isActive && m.categories.includes(key as any)).map(m => (
                                                <option key={m.id} value={m.id}>{m.displayName} ({m.provider})</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </Card>
                        <Card title="My Account">
                            <Input label="Public Display Name" value={myProfileName} onChange={(e) => setMyProfileName(e.target.value)} />
                            <div className="mt-4 p-4 bg-slate-50 border border-gray-100 rounded-lg text-xs text-gray-600 space-y-3">
                                <div className="flex justify-between"><span>Email Address</span> <span className="font-bold text-gray-900">{currentUser?.email}</span></div>
                                <div className="flex justify-between"><span>System Role</span> <span className="font-bold text-accent">{currentUser?.role}</span></div>
                                <div className="flex justify-between"><span>Team ID</span> <span className="font-bold text-gray-900">{currentUser?.teamId || 'No Team Assigned'}</span></div>
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* --- TAB: ADD USER --- */}
            {activeTab === 'add-user' && isAdmin && (
                <div className="space-y-8 animate-in fade-in">

                    {/* Role Permission Matrix */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Agent Role Card */}
                        <div className="relative bg-white border-2 border-accent rounded-xl p-6 shadow-sm overflow-hidden">
                            <div className="absolute top-0 right-0 bg-accent text-white text-[10px] font-black px-3 py-1.5 rounded-bl-xl uppercase tracking-widest">Recommended</div>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-black text-gray-900">Agent</h3>
                                    <p className="text-xs text-gray-400">Standard CRM user</p>
                                </div>
                            </div>
                            <ul className="space-y-2 mb-4">
                                {[
                                    { ok: true, text: 'Research & find prospects' },
                                    { ok: true, text: 'Add & update prospect data' },
                                    { ok: true, text: 'Manage CRM records' },
                                    { ok: true, text: 'Create contact requests' },
                                    { ok: true, text: 'View analytics & history' },
                                    { ok: false, text: 'Manage other users' },
                                    { ok: false, text: 'Access system settings' },
                                    { ok: false, text: 'Modify AI models or teams' },
                                ].map((item, i) => (
                                    <li key={i} className={`flex items-center gap-2 text-sm ${item.ok ? 'text-gray-700' : 'text-gray-300'}`}>
                                        {item.ok
                                            ? <span className="w-4 h-4 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-[10px] font-black flex-shrink-0">✓</span>
                                            : <span className="w-4 h-4 rounded-full bg-gray-100 text-gray-300 flex items-center justify-center text-[10px] font-black flex-shrink-0">✗</span>
                                        }
                                        {item.text}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Data Team Role Card */}
                        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="font-black text-gray-900">Data Team</h3>
                                    <p className="text-xs text-gray-400">Data entry & verification specialist</p>
                                </div>
                            </div>
                            <ul className="space-y-2 mb-4">
                                {[
                                    { ok: true, text: 'Research & find prospects' },
                                    { ok: true, text: 'Add & update prospect data' },
                                    { ok: true, text: 'Manage CRM records' },
                                    { ok: true, text: 'Fulfill contact requests' },
                                    { ok: true, text: 'Validate & verify data' },
                                    { ok: false, text: 'Manage other users' },
                                    { ok: false, text: 'Access system settings' },
                                    { ok: false, text: 'Modify AI models or teams' },
                                ].map((item, i) => (
                                    <li key={i} className={`flex items-center gap-2 text-sm ${item.ok ? 'text-gray-700' : 'text-gray-300'}`}>
                                        {item.ok
                                            ? <span className="w-4 h-4 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-[10px] font-black flex-shrink-0">✓</span>
                                            : <span className="w-4 h-4 rounded-full bg-gray-100 text-gray-300 flex items-center justify-center text-[10px] font-black flex-shrink-0">✗</span>
                                        }
                                        {item.text}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Create New User Form */}
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
                            <div>
                                <h2 className="text-white font-black text-lg">Provision New CRM User</h2>
                                <p className="text-slate-400 text-xs mt-0.5">Create an account for a team member. They'll be able to log in and use the CRM immediately.</p>
                            </div>
                            <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                        </div>
                        <form onSubmit={handleCreateUser} className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-5">
                                    <Input label="Full Name" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} required placeholder="e.g. Rahul Sharma" />
                                    <Input label="Login Email" type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} required placeholder="rahul@yourcompany.com" />
                                    <Input label="Initial Password" type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} required minLength={6} placeholder="Min. 6 characters" />
                                </div>
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Role Assignment</label>
                                        <div className="space-y-2">
                                            {[
                                                { value: Role.AGENT, label: 'Agent', desc: 'Research prospects, manage CRM data' },
                                                { value: Role.DATA_TEAM, label: 'Data Team', desc: 'Data entry, fulfil contact requests' },
                                                ...(isAdmin ? [{ value: Role.ADMIN, label: 'Admin', desc: 'Manage users, teams, and models' }] : []),
                                                ...(isSuperAdmin ? [{ value: Role.SUPER_ADMIN, label: 'Super Admin', desc: 'Root access to everything' }] : [])
                                            ].map(r => (
                                                <label key={r.value} className={`flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all ${newUserRole === r.value ? 'border-accent bg-blue-50/70 ring-1 ring-accent' : 'border-gray-200 hover:bg-gray-50'
                                                    }`}>
                                                    <input type="radio" name="newUserRole" value={r.value} checked={newUserRole === r.value} onChange={() => setNewUserRole(r.value)} className="mt-0.5 h-4 w-4 text-accent border-gray-300 focus:ring-accent" />
                                                    <div>
                                                        <div className="text-sm font-bold text-gray-900">{r.label}</div>
                                                        <div className="text-xs text-gray-400 mt-0.5">{r.desc}</div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Team Assignment <span className="text-gray-300 font-normal normal-case">(optional)</span></label>
                                        <select value={newUserTeamId} onChange={(e) => setNewUserTeamId(e.target.value)} className="block w-full border border-gray-300 rounded-md p-2.5 text-sm focus:ring-accent focus:border-accent">
                                            <option value="">No Team — Assign Later</option>
                                            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-6 pt-5 border-t border-gray-100 flex justify-end gap-3">
                                <button type="button" onClick={() => { setNewUserName(''); setNewUserEmail(''); setNewUserPassword(''); setNewUserRole(Role.AGENT); setNewUserTeamId(''); }} className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Clear Form</button>
                                <Button type="submit" disabled={loading} className="px-8">
                                    {loading ? (
                                        <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>Creating...</span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                            Create User Account
                                        </span>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </div>

                    {/* Existing CRM Users List */}
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h2 className="font-black text-gray-900">Active CRM Users</h2>
                                <p className="text-xs text-gray-400 mt-0.5">{users.filter(u => u.role !== Role.PENDING).length} users with CRM access</p>
                            </div>
                        </div>
                        {users.filter(u => u.role !== Role.PENDING).length === 0 ? (
                            <div className="py-16 text-center">
                                <div className="w-14 h-14 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-3">
                                    <svg className="w-7 h-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <p className="text-sm font-medium text-gray-400">No CRM users yet.</p>
                                <p className="text-xs text-gray-300 mt-1">Use the form above to add your first team member.</p>
                            </div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-100">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">User</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Role</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Team</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Status</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-400 uppercase tracking-widest">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {users.filter(u => u.role !== Role.PENDING).map(u => (
                                        <tr key={u.id} className="hover:bg-blue-50/20 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-black text-slate-600 uppercase flex-shrink-0">
                                                        {u.name?.charAt(0) || '?'}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-gray-900">{u.name}</div>
                                                        <div className="text-xs text-gray-400">{u.email}</div>
                                                        {u.createdAt && (
                                                            <div className="text-[10px] text-gray-400 mt-0.5">Joined {new Date(u.createdAt).toLocaleDateString()}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest border ${u.role === Role.SUPER_ADMIN ? 'bg-cyan-50 text-cyan-700 border-cyan-100 shadow-[0_0_8px_rgba(6,182,212,0.15)] font-extrabold animate-pulse' :
                                                        u.role === Role.ADMIN ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                            u.role === Role.DATA_TEAM ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-gray-50 text-gray-700 border-gray-200'
                                                    }`}>{u.role === Role.SUPER_ADMIN ? '⚡ SUPER ADMIN' : u.role}</span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {teams.find(t => t.id === u.teamId)?.name || <span className="text-orange-400 italic text-xs">Unassigned</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest ${(u.status || 'Active') === 'Active' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                                                    }`}>{u.status || 'Active'}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                {!(u.role === Role.SUPER_ADMIN && !isSuperAdmin) && (
                                                    <button onClick={() => openEditUserModal(u)} className="text-xs font-bold text-accent hover:underline px-3 py-1.5 rounded hover:bg-blue-50 transition-all">Edit</button>
                                                )}
                                                {(u.id !== currentUser?.id || isSuperAdmin) && !(u.role === Role.SUPER_ADMIN && !isSuperAdmin) && (
                                                    <>
                                                        {u.status === 'Active' ? (
                                                            <button onClick={async () => {
                                                                if (window.confirm(`Are you sure you want to deactivate ${u.name}? They will lose access to the CRM.`)) {
                                                                    setLoading(true);
                                                                    try {
                                                                        await updateUserByAdmin(u.id, { status: 'Inactive' });
                                                                        alert('User has been deactivated.');
                                                                    } catch (e: any) {
                                                                        alert('Failed to deactivate: ' + e.message);
                                                                    } finally {
                                                                        setLoading(false);
                                                                    }
                                                                }
                                                            }} className="text-xs font-bold text-red-600 hover:underline px-3 py-1.5 rounded hover:bg-red-50 transition-all">Deactivate</button>
                                                        ) : (
                                                            <button onClick={async () => {
                                                                if (window.confirm(`Are you sure you want to reactivate ${u.name}?`)) {
                                                                    setLoading(true);
                                                                    try {
                                                                        await updateUserByAdmin(u.id, { status: 'Active' });
                                                                        alert('User has been reactivated.');
                                                                    } catch (e: any) {
                                                                        alert('Failed to reactivate: ' + e.message);
                                                                    } finally {
                                                                        setLoading(false);
                                                                    }
                                                                }
                                                            }} className="text-xs font-bold text-green-600 hover:underline px-3 py-1.5 rounded hover:bg-green-50 transition-all">Reactivate</button>
                                                        )}
                                                        <button onClick={() => handleDeleteUser(u.id, u.name)} className="text-xs font-bold text-red-600 hover:underline px-3 py-1.5 rounded hover:bg-red-50 transition-all">Delete</button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* --- TAB: ADMIN USERS --- */}
            {activeTab === 'admin-users' && isAdmin && (
                <div className="space-y-6 animate-in fade-in">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                        <div className="w-full lg:w-96 relative">
                            <Input
                                placeholder="Search users by name, email, or team..."
                                value={userSearchTerm}
                                onChange={(e) => setUserSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                            <svg className="w-4 h-4 absolute left-3 top-9 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <div className="flex gap-2 w-full lg:w-auto">
                            <input type="file" accept=".csv" ref={userImportRef} onChange={handleBulkUserImport} className="hidden" />
                            <Button variant="ghost" className="border shadow-sm flex-1 lg:flex-none" onClick={() => userImportRef.current?.click()}>
                                {progress ? 'Processing...' : 'Bulk Import (All Configs)'}
                            </Button>
                            <Button onClick={() => setIsCreateUserModalOpen(true)} className="flex-1 lg:flex-none">+ New Account</Button>
                        </div>
                    </div>

                    {progress && (
                        <div className="bg-blue-50 border border-blue-100 p-3 rounded text-sm text-blue-700 flex items-center shadow-inner">
                            <span className="animate-spin h-4 w-4 border-2 border-accent border-t-transparent rounded-full mr-3"></span>
                            {progress}
                        </div>
                    )}

                    {pendingUsers.length > 0 && (
                        <Card className="border-l-4 border-yellow-400 bg-yellow-50 p-0 overflow-hidden">
                            <div className="flex items-center justify-between p-4 border-b border-yellow-200 bg-yellow-100/50">
                                <h3 className="font-bold text-yellow-800 flex items-center">
                                    <span className="flex h-3 w-3 relative mr-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
                                    </span>
                                    Pending Access Requests ({pendingUsers.length})
                                </h3>
                            </div>
                            <table className="min-w-full divide-y divide-yellow-200">
                                <tbody className="divide-y divide-yellow-100 bg-white">
                                    {pendingUsers.map(user => (
                                        <tr key={user.id} className="hover:bg-yellow-50/50">
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.name} <br /><span className="text-xs text-gray-500 font-normal">{user.email}</span></td>
                                            <td className="px-6 py-4 text-sm text-gray-500">Requested: {user.createdAt?.toLocaleDateString()}</td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <Button size="sm" onClick={() => updateUserRole(user.id, Role.AGENT)}>Approve Agent</Button>
                                                <Button size="sm" variant="secondary" onClick={() => updateUserRole(user.id, Role.DATA_TEAM)}>Approve Data Team</Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Card>
                    )}

                    <Card className="p-0 overflow-hidden border border-gray-200 shadow-sm">
                        <table className="min-w-full divide-y divide-border">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">User Profile</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">System Role</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Team</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-widest">Plan & Credits</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {filteredUsers.map(u => {
                                    const creds = allUserCredits.find(c => c.userId === u.id);
                                    return (
                                        <tr key={u.id} className="hover:bg-blue-50/20 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900">{u.name}</div>
                                                <div className="text-xs text-gray-400">{u.email}</div>
                                                {u.createdAt && (
                                                    <div className="text-[10px] text-gray-400 mt-0.5">Joined {new Date(u.createdAt).toLocaleDateString()}</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] px-2 py-1 font-black rounded uppercase tracking-widest border ${u.role === Role.SUPER_ADMIN ? 'bg-cyan-50 text-cyan-700 border-cyan-100 shadow-[0_0_8px_rgba(6,182,212,0.15)] font-extrabold animate-pulse' :
                                                        u.role === Role.ADMIN ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                                            u.role === Role.DATA_TEAM ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-gray-50 text-gray-700 border-gray-100'
                                                    }`}>
                                                    {u.role === Role.SUPER_ADMIN ? '⚡ SUPER ADMIN' : u.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {teams.find(t => t.id === u.teamId)?.name || <span className="text-red-400 italic">Unassigned</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                {creds ? (
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-bold text-gray-800 uppercase bg-gray-100 px-1.5 rounded border border-gray-200">{PLAN_CONFIG[creds.plan]?.label || creds.plan}</span>
                                                            <button onClick={() => openPlanModal(u)} className="text-[10px] text-accent hover:underline">Change</button>
                                                        </div>
                                                        <span className="text-xs text-gray-500">
                                                            Bal: <strong>{creds.balance}</strong> / {creds.monthlyAllocation}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => openPlanModal(u)} className="text-xs bg-accent text-white px-2 py-1 rounded hover:bg-accent-hover">Init Plan</button>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                {!(u.role === Role.SUPER_ADMIN && !isSuperAdmin) && (
                                                    <button onClick={() => openEditUserModal(u)} className="text-xs font-bold text-accent hover:underline px-3 py-1.5 rounded hover:bg-white transition-all">Manage Account</button>
                                                )}
                                                {(u.id !== currentUser?.id || isSuperAdmin) && !(u.role === Role.SUPER_ADMIN && !isSuperAdmin) && (
                                                    <button onClick={() => handleDeleteUser(u.id, u.name)} className="text-xs font-bold text-red-600 hover:underline px-3 py-1.5 rounded hover:bg-red-50 transition-all">Delete</button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filteredUsers.length === 0 && (
                            <div className="p-10 text-center text-gray-500 bg-gray-50/50">
                                <p className="text-sm font-medium">No users match your current search.</p>
                                <button onClick={() => setUserSearchTerm('')} className="text-xs text-accent mt-1 hover:underline">Clear Search</button>
                            </div>
                        )}
                    </Card>
                    <div className="text-center">
                        <button onClick={handleDownloadUserTemplate} className="text-xs text-blue-600 hover:underline">Download Bulk Import Template (All Fields)</button>
                    </div>
                </div>
            )}

            {/* --- TAB: ADMIN DATA --- */}
            {activeTab === 'admin-data' && isAdmin && (
                <div className="space-y-6 animate-in fade-in">
                    <section className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 rounded-xl shadow-2xl border border-slate-700 text-white">
                        <h2 className="text-2xl font-black mb-2 flex items-center gap-3">
                            <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                            V5.0 Spec Migration
                        </h2>
                        <p className="text-slate-400 text-sm mb-6 max-w-2xl leading-relaxed">
                            Automatically reorganize legacy data into the new Team-based hierarchy. This script generates a Global Default Team and links all unmapped users and prospects to it.
                        </p>
                        <div className="flex flex-wrap gap-4">
                            <Button onClick={runV5Migration} className="bg-accent hover:bg-accent-hover text-white border-0 px-8">
                                Execute Migration Logic
                            </Button>
                            <Link to="/admin/team">
                                <Button variant="ghost" className="text-white hover:bg-white/10">Manage Teams &rarr;</Button>
                            </Link>
                        </div>
                    </section>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card title="Bulk Prospect Seeding">
                            <p className="text-sm text-text-secondary mb-6 leading-relaxed">Import a master list of prospects. The system will auto-deduplicate by LinkedIn URL and Name.</p>
                            <Button variant="secondary" onClick={() => window.location.hash = '/database'}>Go to Database Manager</Button>
                        </Card>
                        <Card title="Developer Mode">
                            <p className="text-sm text-text-secondary mb-6 leading-relaxed">Reset all localized data and initialize the environment with high-quality mock data for performance testing.</p>
                            <Button onClick={() => setIsSeedModalOpen(true)} variant="ghost" className="border border-red-200 text-red-600 hover:bg-red-50">
                                Seed Mock Records (V5)
                            </Button>
                        </Card>
                    </div>
                </div>
            )}

            {/* --- MODALS --- */}

            <Modal isOpen={isEditUserModalOpen} onClose={() => setIsEditUserModalOpen(false)} title={`Configuring Account: ${editingUser?.name}`} size="lg">
                <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
                    <button onClick={() => setEditUserTab('profile')} className={`px-4 py-3 text-xs font-black uppercase tracking-widest transition-all ${editUserTab === 'profile' ? 'border-b-2 border-accent text-accent' : 'text-gray-400 hover:text-gray-600'}`}>1. Profile</button>
                    <button onClick={() => setEditUserTab('models')} className={`px-4 py-3 text-xs font-black uppercase tracking-widest transition-all ${editUserTab === 'models' ? 'border-b-2 border-accent text-accent' : 'text-gray-400 hover:text-gray-600'}`}>2. AI Overrides</button>
                    <button onClick={() => setEditUserTab('keys')} className={`px-4 py-3 text-xs font-black uppercase tracking-widest transition-all ${editUserTab === 'keys' ? 'border-b-2 border-accent text-accent' : 'text-gray-400 hover:text-gray-600'}`}>3. Personal Keys</button>
                </div>

                <form onSubmit={handleUpdateUser} className="space-y-6">
                    {editUserTab === 'profile' && (
                        <div className="space-y-4 animate-in fade-in">
                            <Input label="Account Display Name" value={editUserName} onChange={(e) => setEditUserName(e.target.value)} required />
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">System Role</label>
                                    <select
                                        value={editUserRole}
                                        onChange={(e) => setEditUserRole(e.target.value as Role)}
                                        disabled={editingUser?.id === currentUser?.id && !isSuperAdmin}
                                        className="block w-full border border-gray-300 rounded-md p-2.5 text-sm focus:ring-accent disabled:opacity-60 disabled:bg-gray-100"
                                    >
                                        {Object.values(Role).map(r => {
                                            if (r === Role.SUPER_ADMIN && !isSuperAdmin) return null;
                                            return <option key={r} value={r}>{r}</option>;
                                        })}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">User Status</label>
                                    <select
                                        value={editUserStatus}
                                        onChange={(e) => setEditUserStatus(e.target.value as any)}
                                        disabled={editingUser?.id === currentUser?.id && !isSuperAdmin}
                                        className="block w-full border border-gray-300 rounded-md p-2.5 text-sm focus:ring-accent disabled:opacity-60 disabled:bg-gray-100"
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Primary Team Assignment</label>
                            <select value={editUserTeamId} onChange={(e) => setEditUserTeamId(e.target.value)} className="block w-full border border-gray-300 rounded-md p-2.5 text-sm focus:ring-accent">
                                <option value="">No Team Assigned</option>
                                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                <label className="block text-xs font-bold text-red-400 uppercase tracking-widest mb-2">Administrative Password Override</label>
                                <Input label="" type="text" value={editUserPassword} onChange={(e) => setEditUserPassword(e.target.value)} placeholder="Type new password to force reset..." className="border-red-100" />
                                <p className="text-[10px] text-gray-400 mt-1">Leave blank to keep existing password.</p>
                            </div>
                        </div>
                    )}

                    {editUserTab === 'models' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-xs text-blue-700">
                                <strong>Admin Note:</strong> These selections will override the Team-wide defaults for this specific user. Use this for power-users who need high-tier models.
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                {['extraction', 'scoring', 'research', 'pitches'].map(cat => (
                                    <div key={cat}>
                                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{cat} model</label>
                                        <select className="w-full border border-gray-300 rounded-md p-2.5 text-sm focus:ring-accent" value={(editUserModelConfig as any)[cat]} onChange={e => setEditUserModelConfig({ ...editUserModelConfig, [cat]: e.target.value })}>
                                            <option value="">-- Use Team Default --</option>
                                            {aiModels.filter(m => m.isActive && m.categories.includes(cat as any)).map(m => (
                                                <option key={m.id} value={m.id}>{m.displayName} ({m.provider})</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {editUserTab === 'keys' && (
                        <div className="space-y-4 animate-in fade-in">
                            <div className="bg-amber-50 p-4 rounded-lg border border-amber-100 text-xs text-amber-700 mb-4">
                                <strong>Privacy Note:</strong> Keys entered here are stored in the user's private profile. They will not be visible to other agents on the team.
                            </div>
                            {['groq', 'openrouter', 'gemini'].map(k => (
                                <div key={k} className="relative">
                                    <Input
                                        label={`${k.toUpperCase()} Personal Key Override`}
                                        type={showEditKeys[k as keyof typeof showEditKeys] ? 'text' : 'password'}
                                        value={editUserApiKeys[k as keyof typeof editUserApiKeys]}
                                        onChange={e => setEditUserApiKeys({ ...editUserApiKeys, [k]: e.target.value })}
                                        placeholder="Enter key string..."
                                    />
                                    <button type="button" onClick={() => setShowEditKeys({ ...showEditKeys, [k]: !showEditKeys[k as keyof typeof showEditKeys] })} className="absolute right-3 top-[32px] text-gray-400 hover:text-accent p-1">
                                        {showEditKeys[k as keyof typeof showEditKeys] ? 'Hide' : 'Show'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-end space-x-3 pt-6 border-t">
                        <Button type="button" variant="ghost" onClick={() => setIsEditUserModalOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading} className="px-10">{loading ? 'Saving...' : 'Update User Record'}</Button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={isCreateUserModalOpen} onClose={() => setIsCreateUserModalOpen(false)} title="Provision New Account">
                <form onSubmit={handleCreateUser} className="space-y-4">
                    <Input label="Full Name" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} required />
                    <Input label="Login Email" type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} required />
                    <Input label="Initial Password" type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} required minLength={6} />
                    <div className="flex justify-end space-x-3 pt-6 border-t">
                        <Button type="button" variant="ghost" onClick={() => setIsCreateUserModalOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>Create Account</Button>
                    </div>
                </form>
            </Modal>

            {/* PLAN MANAGEMENT MODAL */}
            <Modal isOpen={isPlanModalOpen} onClose={() => setIsPlanModalOpen(false)} title="Manage Credit Plan" size="md">
                <div className="space-y-6">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-800">
                            Modifying the plan for <strong>{selectedUserForPlan?.name}</strong>.
                            <br />
                            This will reset their current monthly balance to the new plan's limit immediately.
                        </p>
                    </div>

                    <div className="space-y-4">
                        {Object.entries(PLAN_CONFIG).map(([key, config]) => (
                            <label key={key} className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all ${selectedPlan === key ? 'border-accent bg-blue-50/50 ring-1 ring-accent' : 'border-gray-200 hover:bg-gray-50'}`}>
                                <div className="flex items-center">
                                    <input
                                        type="radio"
                                        name="plan"
                                        value={key}
                                        checked={selectedPlan === key}
                                        onChange={() => {
                                            setSelectedPlan(key as PlanType);
                                            setManualBalance(config.credits);
                                        }}
                                        className="h-4 w-4 text-accent border-gray-300 focus:ring-accent"
                                    />
                                    <div className="ml-3">
                                        <span className="block text-sm font-bold text-gray-900">{config.label}</span>
                                        <span className="block text-xs text-gray-500">{config.credits.toLocaleString()} credits / month</span>
                                    </div>
                                </div>
                                <div className="text-sm font-semibold text-gray-700">
                                    {typeof config.price === 'number' ? `$${config.price}` : config.price}
                                </div>
                            </label>
                        ))}
                    </div>

                    <div className="pt-4 border-t">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Custom Balance Override</label>
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                value={manualBalance}
                                onChange={(e) => setManualBalance(Number(e.target.value))}
                                className="w-32"
                            />
                            <span className="text-sm text-gray-500">credits</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Manually set the current balance. This does not change the monthly allocation limit.</p>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t">
                        <Button variant="ghost" onClick={() => setIsPlanModalOpen(false)} disabled={loading}>Cancel</Button>
                        <Button onClick={handleUpdatePlan} disabled={loading}>{loading ? "Updating..." : "Update Plan"}</Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isSeedModalOpen} onClose={() => setIsSeedModalOpen(false)} title="Reset Local Database" size="sm">
                <div className="space-y-4">
                    <p className="text-sm text-gray-600">This will populate the database with V5 specification records. <strong>Existing records with the same IDs will be updated.</strong></p>
                    <div className="flex justify-end space-x-2 border-t pt-4">
                        <Button variant="ghost" onClick={() => setIsSeedModalOpen(false)}>Cancel</Button>
                        <Button onClick={() => { seedDatabase(); setIsSeedModalOpen(false); }}>Confirm Reset & Seed</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default SettingsPage;
