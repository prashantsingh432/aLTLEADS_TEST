
import React, { useState } from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { Persona, Role } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { Navigate } from 'react-router-dom';

const AdminPersonasPage: React.FC = () => {
    const { personas, teams, addPersona, updatePersona, deletePersona } = useData();
    const { user } = useAuth();
    
    // States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
    const [personaToDelete, setPersonaToDelete] = useState<Persona | null>(null);
    
    const [formData, setFormData] = useState<Partial<Persona>>({
        name: '', titles: [], keywords: [], scoreBoost: 10, teamIds: []
    });
    const [titlesText, setTitlesText] = useState('');
    const [keywordsText, setKeywordsText] = useState('');

    if (!user || (user.role !== Role.ADMIN && user.role !== Role.DATA_TEAM)) {
        return <Navigate to="/" />;
    }

    const openCreate = () => {
        setEditingPersona(null);
        setFormData({ 
            name: '', titles: [], keywords: [], scoreBoost: 10, 
            teamId: user.teamId, teamIds: user.teamId ? [user.teamId] : [] 
        });
        setTitlesText('');
        setKeywordsText('');
        setIsModalOpen(true);
    };

    const openEdit = (persona: Persona) => {
        setEditingPersona(persona);
        setFormData({
            ...persona,
            teamIds: persona.teamIds || (persona.teamId ? [persona.teamId] : [])
        });
        setTitlesText(persona.titles.join('\n'));
        setKeywordsText(persona.keywords.join('\n'));
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const processedTitles = titlesText.split('\n').filter(s => s.trim().length > 0);
        const processedKeywords = keywordsText.split('\n').filter(s => s.trim().length > 0);
        
        // Fallback for primary ID
        const primaryTeamId = formData.teamIds && formData.teamIds.length > 0 
            ? formData.teamIds[0] 
            : (formData.teamId || user.teamId || 'unknown');

        try {
            if (editingPersona) {
                await updatePersona({
                    ...formData,
                    titles: processedTitles,
                    keywords: processedKeywords,
                    teamId: primaryTeamId,
                    teamIds: formData.teamIds,
                    id: editingPersona.id
                } as any);
            } else {
                await addPersona({
                    name: formData.name!,
                    titles: processedTitles,
                    keywords: processedKeywords,
                    scoreBoost: Number(formData.scoreBoost) || 0,
                    teamId: primaryTeamId,
                    teamIds: formData.teamIds || [],
                    createdBy: user.id
                });
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
            alert("Error saving persona.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteClick = (persona: Persona) => {
        setPersonaToDelete(persona);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!personaToDelete) return;
        setIsLoading(true);
        try {
            await deletePersona(personaToDelete.id);
            setIsDeleteModalOpen(false);
            setPersonaToDelete(null);
        } catch (error) {
            console.error(error);
            alert("Failed to delete persona.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleTeamToggle = (teamId: string) => {
        setFormData(prev => {
            const currentIds = prev.teamIds || [];
            if (currentIds.includes(teamId)) {
                return { ...prev, teamIds: currentIds.filter(id => id !== teamId) };
            } else {
                return { ...prev, teamIds: [...currentIds, teamId] };
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary">Personas</h1>
                    <p className="text-text-secondary">Define target buyers for AI matching and scoring.</p>
                </div>
                <Button onClick={openCreate} disabled={isLoading}>+ Add Persona</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {personas.map(persona => (
                    <Card key={persona.id} className="relative group border border-transparent hover:border-purple-200 transition-all">
                         <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => openEdit(persona)} className="text-gray-400 hover:text-blue-600 bg-white p-1 rounded shadow-sm">
                                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                             </button>
                             <button onClick={() => handleDeleteClick(persona)} className="text-gray-400 hover:text-red-600 bg-white p-1 rounded shadow-sm">
                                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                             </button>
                         </div>
                         <div className="flex justify-between items-start mb-2">
                             <h3 className="text-lg font-bold text-gray-900">{persona.name}</h3>
                             <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2 py-1 rounded">+{persona.scoreBoost} pts</span>
                         </div>
                         
                         <div className="space-y-4 mt-4">
                             <div>
                                 <div className="text-xs font-semibold text-gray-400 uppercase mb-1">Target Titles</div>
                                 <div className="flex flex-wrap gap-1">
                                     {persona.titles.slice(0, 4).map((t, i) => (
                                         <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200">{t}</span>
                                     ))}
                                      {persona.titles.length > 4 && <span className="text-xs text-gray-400">+{persona.titles.length - 4}</span>}
                                 </div>
                             </div>

                             <div>
                                 <div className="text-xs font-semibold text-gray-400 uppercase mb-1">Keywords</div>
                                 <div className="flex flex-wrap gap-1">
                                     {persona.keywords.slice(0, 4).map((k, i) => (
                                         <span key={i} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">{k}</span>
                                     ))}
                                 </div>
                             </div>
                         </div>
                    </Card>
                ))}
            </div>

            {/* Create/Edit Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPersona ? "Edit Persona" : "New Persona"}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                         <div className="col-span-2">
                             <Input label="Persona Name *" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                         </div>
                         <div>
                             <Input label="Score Boost" type="number" value={formData.scoreBoost} onChange={e => setFormData({...formData, scoreBoost: Number(e.target.value)})} required />
                         </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Job Titles (One per line)</label>
                        <textarea 
                            className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                            rows={4}
                            value={titlesText}
                            onChange={e => setTitlesText(e.target.value)}
                            placeholder="CTO&#10;VP of Engineering&#10;Director of IT"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Keywords (One per line)</label>
                        <textarea 
                            className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                            rows={3}
                            value={keywordsText}
                            onChange={e => setKeywordsText(e.target.value)}
                            placeholder="SaaS&#10;Cloud Infrastructure&#10;Digital Transformation"
                        />
                    </div>

                    {/* Team Availability - Multi-Select */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Team Availability</label>
                        <p className="text-xs text-gray-500 mb-2">Select which teams use this persona.</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 bg-white border rounded">
                            {teams.map(team => (
                                <label key={team.id} className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded cursor-pointer">
                                    <input 
                                        type="checkbox"
                                        checked={(formData.teamIds || []).includes(team.id)}
                                        onChange={() => handleTeamToggle(team.id)}
                                        className="rounded text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700 truncate">{team.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 space-x-2 border-t">
                         <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isLoading}>Cancel</Button>
                         <Button type="submit" disabled={isLoading}>{editingPersona ? "Save Changes" : "Create Persona"}</Button>
                    </div>
                </form>
            </Modal>
            
            {/* Delete Confirmation Modal */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Deletion" size="sm">
                <div className="space-y-4">
                    <p className="text-gray-700">Are you sure you want to delete <strong>{personaToDelete?.name}</strong>?</p>
                    <p className="text-sm text-red-600">This action cannot be undone.</p>
                    <div className="flex justify-end space-x-2 border-t pt-4">
                        <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)} disabled={isLoading}>Cancel</Button>
                        <Button variant="danger" onClick={confirmDelete} disabled={isLoading}>
                            {isLoading ? "Deleting..." : "Delete Permanently"}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default AdminPersonasPage;
