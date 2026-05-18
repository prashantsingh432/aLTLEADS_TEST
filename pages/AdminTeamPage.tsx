
import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { Team, Role, Product } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { Navigate } from 'react-router-dom';

const AdminTeamPage: React.FC = () => {
    const { teams, updateTeam, addTeam, aiModels, products, personas, isSynced } = useData();
    const { user } = useAuth();
    
    // State for selecting which team to edit
    const [selectedTeamId, setSelectedTeamId] = useState<string>('');
    const [formData, setFormData] = useState<Team | null>(null);
    const [activeTab, setActiveTab] = useState<'general' | 'products' | 'personas' | 'keys' | 'models' | 'templates' | 'prompts'>('general');
    const [isSaving, setIsSaving] = useState(false);
    
    // State for creating a new team
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');
    const [newTeamDescription, setNewTeamDescription] = useState('');
    const [createError, setCreateError] = useState('');

    // Initialize selection immediately when teams load
    useEffect(() => {
        if (teams.length > 0 && !selectedTeamId) {
            const defaultId = user?.teamId && teams.find(t => t.id === user.teamId) 
                ? user.teamId 
                : teams[0].id;
            setSelectedTeamId(defaultId);
        }
    }, [teams, user?.teamId, selectedTeamId]);

    // Sync form data safely
    useEffect(() => {
        if (!selectedTeamId) {
            setFormData(null);
            return;
        }

        const teamToEdit = teams.find(t => t.id === selectedTeamId);
        if (teamToEdit) {
            const linkedByProductRef = products
                .filter(p => p.teamIds?.includes(teamToEdit.id) || p.teamId === teamToEdit.id)
                .map(p => p.id);
            const linkedByTeamRef = teamToEdit.productIds || [];
            const mergedProductIds = [...new Set([...linkedByProductRef, ...linkedByTeamRef])];

            const linkedByPersonaRef = personas
                .filter(p => p.teamIds?.includes(teamToEdit.id) || p.teamId === teamToEdit.id)
                .map(p => p.id);
            const linkedByTeamPersonaRef = teamToEdit.personaIds || [];
            const mergedPersonaIds = [...new Set([...linkedByPersonaRef, ...linkedByTeamPersonaRef])];

            setFormData(prev => {
                if (prev?.id === teamToEdit.id) return prev; 
                return {
                    ...teamToEdit,
                    defaultApiKeys: teamToEdit.defaultApiKeys || {},
                    defaultModelConfig: teamToEdit.defaultModelConfig || {},
                    defaultTemplates: teamToEdit.defaultTemplates || {},
                    defaultPrompts: teamToEdit.defaultPrompts || {},
                    productIds: mergedProductIds,
                    personaIds: mergedPersonaIds
                };
            });
        }
    }, [selectedTeamId, teams, products, personas]);

    if (!user || user.role !== Role.ADMIN) {
        return <Navigate to="/" />;
    }

    const handleLoadStandardDefaults = () => {
        if (!formData) return;
        if (!confirm("This will overwrite your current configurations with AltLeads standard templates. Continue?")) return;

        const defaultTemplates = {
            pitchEmail1: "Subject: Quick question regarding {company_name}\n\nHi {first_name},\n\nI noticed {company_name} is currently facing {pain_point}. Our solution helps teams like yours automate this process.\n\nWould you be open to a 5-minute chat next week?\n\nBest,\n{agent_name}",
            pitchEmail2: "Subject: Re: Quick question regarding {company_name}\n\nHi {first_name},\n\nFollowing up on my previous note. We recently helped a similar company in {industry} reduce costs by 30%.\n\nAre you the right person to speak with about this?\n\nBest,\n{agent_name}",
            pitchLinkedIn: "Hi {first_name}, impressed with your work at {company_name}! I'd love to connect and share how we're helping {title}s solve {pain_point}.",
            pitchWhatsApp: "Hi {first_name}, this is {agent_name} from AltLeads. Just sent an email about {product_name} - would love to connect here if easier!",
            pitchCall1: "Hi {first_name}, I'm calling from AltLeads. We help {industry} companies with {pain_point}. Do you have a moment to hear how we helped {competitor}?",
        };

        const defaultPrompts = {
            extraction: "You are a professional data researcher. Extract the person's name, designation, and company details from the provided text. Return valid JSON.",
            scoring: "Analyze the prospect's profile against the product's target persona. Assign a score from 0-100 based on title relevance and industry fit. Explain your reasoning briefly.",
            research: "Conduct a deep-dive into this company. Identify their current tech stack, recent funding, and likely pain points based on their industry trends.",
            pitches: "Write a highly personalized, non-spammy cold email. Use the hook: '{pain_point}'. Keep it under 100 words. No corporate jargon.",
        };

        // Try to auto-select standard models if they exist
        const extractionModel = aiModels.find(m => m.categories.includes('extraction') && m.isActive)?.id || '';
        const scoringModel = aiModels.find(m => m.categories.includes('scoring') && m.isActive)?.id || '';
        const researchModel = aiModels.find(m => m.categories.includes('research') && m.isActive)?.id || '';
        const pitchesModel = aiModels.find(m => m.categories.includes('pitches') && m.isActive)?.id || '';

        setFormData({
            ...formData,
            defaultTemplates,
            defaultPrompts,
            defaultSystemPrompt: "You are an elite B2B Sales Intelligence Assistant for AltLeads. Your goal is to provide high-accuracy data and compelling, personalized outreach strategies.",
            defaultModelConfig: {
                extraction: extractionModel,
                scoring: scoringModel,
                research: researchModel,
                pitches: pitchesModel
            }
        });
        
        alert("Standard templates and configurations loaded into the form. Don't forget to click 'Save Changes'!");
    };

    const handleCreateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaving) return;
        setCreateError('');
        const exists = teams.some(t => t.name.trim().toLowerCase() === newTeamName.trim().toLowerCase());
        if (exists) {
            setCreateError('A team with this name already exists.');
            return;
        }
        setIsSaving(true);
        try {
            // FIX: Added missing settingsVersion and fixed empty array type inference
            const newId = await addTeam({
                name: newTeamName,
                description: newTeamDescription,
                createdBy: user.id,
                defaultApiKeys: {},
                defaultModelConfig: {},
                defaultTemplates: {},
                defaultPrompts: {},
                defaultSystemPrompt: "You are a helpful B2B assistant.",
                productIds: [] as string[],
                personaIds: [] as string[],
                settingsVersion: 1
            });
            setIsCreateModalOpen(false);
            setNewTeamName('');
            setNewTeamDescription('');
            setSelectedTeamId(newId);
        } catch (err: any) {
            setCreateError("Error creating team: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSave = async () => {
        if (!formData || isSaving) return;
        setIsSaving(true);
        try {
            await updateTeam({
                id: formData.id,
                ...formData
            });
            alert("Team settings updated successfully.");
        } catch (e) {
            console.error(e);
            alert("Failed to update settings.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleProductToggle = (productId: string, shouldBeChecked: boolean) => {
        setFormData(prev => {
            if (!prev) return null;
            const current = prev.productIds || [];
            let nextIds = shouldBeChecked ? [...current, productId] : current.filter(id => id !== productId);
            return { ...prev, productIds: [...new Set(nextIds)] };
        });
    };

    const handlePersonaToggle = (personaId: string, shouldBeChecked: boolean) => {
        setFormData(prev => {
            if (!prev) return null;
            const current = prev.personaIds || [];
            let nextIds = shouldBeChecked ? [...current, personaId] : current.filter(id => id !== personaId);
            return { ...prev, personaIds: [...new Set(nextIds)] };
        });
    };

    const TabButton = ({ id, label }: { id: typeof activeTab, label: string }) => (
        <button 
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === id 
                ? 'border-accent text-accent' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-200 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary">Team Settings</h1>
                    <p className="text-text-secondary">Configure AI defaults and templates for your team.</p>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <select 
                        value={selectedTeamId} 
                        onChange={(e) => { setSelectedTeamId(e.target.value); setFormData(null); }}
                        className="block w-64 pl-3 pr-10 py-2 text-sm border-gray-300 focus:ring-accent focus:border-accent rounded-md"
                    >
                        {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <Button variant="ghost" className="border border-gray-200" onClick={() => setIsCreateModalOpen(true)}>+ New Team</Button>
                    <div className="flex gap-2 ml-2">
                        <Button onClick={handleLoadStandardDefaults} variant="secondary" className="bg-blue-50 text-accent hover:bg-blue-100 border border-blue-200">
                             ✨ Load Defaults
                        </Button>
                        <Button onClick={handleSave} disabled={isSaving || !formData}>
                            {isSaving ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </div>
            </div>

            {formData ? (
                <>
                    <div className="border-b border-gray-200 flex space-x-2 overflow-x-auto">
                        <TabButton id="general" label="General" />
                        <TabButton id="products" label="Products" />
                        <TabButton id="personas" label="Personas" />
                        <TabButton id="keys" label="API Keys" />
                        <TabButton id="models" label="AI Models" />
                        <TabButton id="templates" label="Pitch Templates" />
                        <TabButton id="prompts" label="AI Prompts" />
                    </div>

                    {activeTab === 'general' && (
                        <div className="space-y-6 animate-in fade-in">
                            <Card title="Team Identity">
                                <div className="grid grid-cols-2 gap-6">
                                    <Input label="Team Name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                                    <Input label="Description" value={formData.description || ''} onChange={e => setFormData({...formData, description: e.target.value})} />
                                </div>
                            </Card>
                            <Card title="System Context">
                                <textarea 
                                    className="w-full border border-gray-300 rounded p-3 text-sm focus:ring-accent focus:border-accent font-mono"
                                    rows={8}
                                    value={formData.defaultSystemPrompt}
                                    onChange={e => setFormData({...formData, defaultSystemPrompt: e.target.value})}
                                />
                            </Card>
                        </div>
                    )}

                    {activeTab === 'products' && (
                        <Card title="Product Availability" className="animate-in fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {products.map(product => (
                                    <label key={product.id} className="flex items-start p-3 border rounded-lg cursor-pointer hover:border-accent">
                                        <input type="checkbox" className="h-4 w-4 text-accent border-gray-300 rounded mt-0.5" checked={(formData.productIds || []).includes(product.id)} onChange={e => handleProductToggle(product.id, e.target.checked)} />
                                        <div className="ml-3 text-sm font-medium">{product.name}</div>
                                    </label>
                                ))}
                            </div>
                        </Card>
                    )}

                    {activeTab === 'personas' && (
                        <Card title="Persona Availability" className="animate-in fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {personas.map(persona => (
                                    <label key={persona.id} className="flex items-start p-3 border rounded-lg cursor-pointer hover:border-accent">
                                        <input type="checkbox" className="h-4 w-4 text-accent border-gray-300 rounded mt-0.5" checked={(formData.personaIds || []).includes(persona.id)} onChange={e => handlePersonaToggle(persona.id, e.target.checked)} />
                                        <div className="ml-3 text-sm font-medium">{persona.name}</div>
                                    </label>
                                ))}
                            </div>
                        </Card>
                    )}

                    {activeTab === 'keys' && (
                        <Card title="Provider API Keys" className="animate-in fade-in">
                            <div className="space-y-4 max-w-lg">
                                <Input label="Groq API Key" type="password" value={formData.defaultApiKeys.groq || ''} onChange={e => setFormData({...formData, defaultApiKeys: {...formData.defaultApiKeys, groq: e.target.value}})} placeholder="gsk_..." />
                                <Input label="OpenRouter API Key" type="password" value={formData.defaultApiKeys.openrouter || ''} onChange={e => setFormData({...formData, defaultApiKeys: {...formData.defaultApiKeys, openrouter: e.target.value}})} placeholder="sk-or-..." />
                                <Input label="Gemini API Key" type="password" value={formData.defaultApiKeys.gemini || ''} onChange={e => setFormData({...formData, defaultApiKeys: {...formData.defaultApiKeys, gemini: e.target.value}})} />
                                <div className="pt-4 border-t mt-4">
                                     <Input label="DigitalOcean Gradient Key (New)" type="password" value={formData.defaultApiKeys.dogradient || ''} onChange={e => setFormData({...formData, defaultApiKeys: {...formData.defaultApiKeys, dogradient: e.target.value}})} placeholder="sk-do-..." />
                                     <p className="text-xs text-gray-500 mt-1">Required for Gradient AI model integrations.</p>
                                </div>
                            </div>
                        </Card>
                    )}

                    {activeTab === 'models' && (
                        <Card title="Default Model Configuration" className="animate-in fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {['extraction', 'scoring', 'research', 'pitches'].map(key => (
                                    <div key={key}>
                                        <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{key} Model</label>
                                        <select 
                                            className="block w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-accent"
                                            value={(formData.defaultModelConfig as any)[key] || ''}
                                            onChange={e => setFormData({ ...formData, defaultModelConfig: { ...formData.defaultModelConfig, [key]: e.target.value } })}
                                        >
                                            <option value="">-- Select Model --</option>
                                            {aiModels.filter(m => m.isActive && m.categories.includes(key as any)).map(m => (
                                                <option key={m.id} value={m.id}>{m.displayName} ({m.provider})</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {activeTab === 'templates' && (
                        <div className="space-y-6 animate-in fade-in">
                            {['pitchEmail1', 'pitchEmail2', 'pitchLinkedIn', 'pitchWhatsApp', 'pitchCall1'].map(key => (
                                <Card key={key} title={`Template: ${key}`}>
                                    <textarea 
                                        className="w-full border border-gray-300 rounded p-3 text-sm focus:ring-accent font-mono"
                                        rows={6}
                                        value={formData.defaultTemplates[key] || ''}
                                        onChange={e => setFormData({ ...formData, defaultTemplates: { ...formData.defaultTemplates, [key]: e.target.value } })}
                                    />
                                </Card>
                            ))}
                        </div>
                    )}

                    {activeTab === 'prompts' && (
                        <div className="space-y-6 animate-in fade-in">
                            {['extraction', 'scoring', 'research', 'pitches'].map(key => (
                                <Card key={key} title={`AI Prompt: ${key}`}>
                                    <textarea 
                                        className="w-full border border-gray-300 rounded p-3 text-sm focus:ring-accent font-mono"
                                        rows={6}
                                        value={formData.defaultPrompts[key] || ''}
                                        onChange={e => setFormData({ ...formData, defaultPrompts: { ...formData.defaultPrompts, [key]: e.target.value } })}
                                    />
                                </Card>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                <div className="text-center p-12 text-gray-500">Select a team to view settings</div>
            )}

            <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Team">
                <form onSubmit={handleCreateTeam} className="space-y-4">
                    {createError && <div className="text-red-600 text-sm bg-red-50 p-2 rounded">{createError}</div>}
                    <Input label="Team Name *" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} placeholder="e.g. Sales Bravo" required />
                    <Input label="Description" value={newTeamDescription} onChange={e => setNewTeamDescription(e.target.value)} />
                    <div className="flex justify-end pt-4 space-x-2 border-t">
                         <Button type="button" variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                         <Button type="submit">Create Team</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default AdminTeamPage;
