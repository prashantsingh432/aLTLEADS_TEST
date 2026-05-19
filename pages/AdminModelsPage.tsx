
import React, { useState, useRef, useMemo } from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { AIModel, Role } from '../types';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { Navigate } from 'react-router-dom';

const AdminModelsPage: React.FC = () => {
    const { aiModels, addAIModel, updateAIModel, deleteAIModel, addAIModelsBulk } = useData();
    const { user } = useAuth();
    
    // UI State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingModel, setEditingModel] = useState<AIModel | null>(null);
    const [filterProvider, setFilterProvider] = useState<string>('all');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Form State
    const [formData, setFormData] = useState<Partial<AIModel>>({
        id: '', provider: 'groq', modelId: '', displayName: '', categories: ['extraction'], isDefault: false, isActive: true
    });
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    // STRICT ADMIN CHECK
    if (!user || (user.role !== Role.ADMIN && user.role !== Role.SUPER_ADMIN)) {
        return <Navigate to="/" />;
    }

    // --- Actions ---

    const openCreate = () => {
        setEditingModel(null);
        setFormData({ id: '', provider: 'groq', modelId: '', displayName: '', categories: ['extraction'], isDefault: false, isActive: true });
        setIsModalOpen(true);
    };

    const openEdit = (model: AIModel) => {
        setEditingModel(model);
        setFormData(model);
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let finalId = formData.id;
            // Auto-generate ID if empty
            if (!editingModel && !finalId && formData.displayName) {
                finalId = 'model_' + formData.displayName.toLowerCase().replace(/[^a-z0-9]/g, '_');
            }

            if (formData.categories?.length === 0) {
                alert("Please select at least one task category.");
                return;
            }

            if (editingModel) {
                await updateAIModel({
                    ...formData,
                    id: editingModel.id
                } as any);
            } else {
                await addAIModel({
                    id: finalId!,
                    provider: formData.provider!,
                    modelId: formData.modelId!,
                    displayName: formData.displayName!,
                    categories: formData.categories || ['extraction'],
                    isDefault: formData.isDefault || false,
                    isActive: formData.isActive || false,
                });
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
            alert("Error saving model.");
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this model configuration?")) {
            await deleteAIModel(id);
        }
    };
    
    const handleDownloadTemplate = () => {
        const headers = ["id", "provider", "modelId", "displayName", "categories (pipe separated)", "isDefault", "isActive"];
        const rows = [
            ",groq,llama-3.1-8b-instant,Llama 3.1 8B,extraction,true,true",
            ",openrouter,openai/gpt-4o-mini,GPT-4o Mini,scoring|pitches|research,false,true"
        ];
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "altleads_models_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleExportModels = () => {
        const headers = ["id", "provider", "modelId", "displayName", "categories", "isDefault", "isActive"];
        
        const escape = (val: any) => {
            if (val === null || val === undefined) return '';
            const str = String(val);
            if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };

        const rows = aiModels.map(m => {
            return [
                escape(m.id),
                escape(m.provider),
                escape(m.modelId),
                escape(m.displayName),
                escape(m.categories.join('|')),
                escape(m.isDefault),
                escape(m.isActive)
            ].join(",");
        });

        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `altleads_ai_models_export_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target?.result as string;
                const rows = text.split(/\r\n|\n/).filter(r => r.trim().length > 0);
                if (rows.length < 2) { alert("Empty file"); return; }
                
                const newModels: any[] = [];
                rows.slice(1).forEach(row => {
                    const cols = row.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
                    // Check if we have enough columns (id, provider, modelId, displayName, categories...)
                    if(cols.length >= 4) {
                         const providedId = cols[0];
                         const provider = cols[1] as any;
                         const modelId = cols[2];
                         const displayName = cols[3];
                         const categoryRaw = cols[4];
                         
                         const categories = categoryRaw ? categoryRaw.split('|').map(s => s.trim()) : ['extraction'];

                         // SMART MAPPING: If ID is provided, use it (Update mode). 
                         // Otherwise generate from Name (Create mode).
                         const id = providedId || 'model_' + displayName.toLowerCase().replace(/[^a-z0-9]/g, '_');
                         
                         newModels.push({
                             id,
                             provider: provider,
                             modelId: modelId,
                             displayName: displayName,
                             categories: categories,
                             isDefault: cols[5] === 'true',
                             isActive: cols[6] !== 'false'
                         });
                    }
                });
                
                if (newModels.length > 0) {
                    await addAIModelsBulk(newModels);
                    alert(`Imported/Updated ${newModels.length} models successfully.`);
                }
            } catch (err) {
                console.error(err);
                alert("Import failed. Ensure the CSV matches the template format.");
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    const handleCategoryToggle = (category: 'extraction' | 'scoring' | 'research' | 'pitches', checked: boolean) => {
        setFormData(prev => {
            const current = prev.categories || [];
            if (checked) {
                return { ...prev, categories: [...new Set([...current, category])] };
            } else {
                return { ...prev, categories: current.filter(c => c !== category) };
            }
        });
    };

    // --- Filtering Logic ---
    const filteredModels = useMemo(() => {
        return aiModels.filter(m => {
            const matchesSearch = m.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                m.modelId.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesProvider = filterProvider === 'all' || m.provider === filterProvider;
            const matchesCategory = filterCategory === 'all' || m.categories.includes(filterCategory as any);
            return matchesSearch && matchesProvider && matchesCategory;
        });
    }, [aiModels, searchTerm, filterProvider, filterCategory]);

    // --- Styles Helper ---
    const getProviderStyle = (provider: string) => {
        switch(provider) {
            case 'groq': return 'bg-orange-50 text-orange-700 border-orange-200 ring-orange-500/20';
            case 'openrouter': return 'bg-purple-50 text-purple-700 border-purple-200 ring-purple-500/20';
            case 'gemini': return 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/20';
            case 'dogradient': return 'bg-cyan-50 text-cyan-700 border-cyan-200 ring-cyan-500/20';
            default: return 'bg-gray-50 text-gray-700 border-gray-200 ring-gray-500/20';
        }
    };

    const getCategoryIcon = (category: string) => {
        switch(category) {
            case 'extraction': return (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            );
            case 'scoring': return (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            );
            case 'research': return (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            );
            case 'pitches': return (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
            );
            default: return null;
        }
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">AI Models</h1>
                    <p className="text-gray-500 mt-1">Configure and manage LLM connections for automated tasks.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <input type="file" accept=".csv" ref={fileInputRef} onChange={handleCSVImport} className="hidden" />
                    
                    <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:text-accent hover:bg-blue-50 rounded transition-colors" title="Import CSV">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </button>
                    <button onClick={handleExportModels} className="p-2 text-gray-500 hover:text-accent hover:bg-blue-50 rounded transition-colors" title="Download All Models (Backup)">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </button>
                    <button onClick={handleDownloadTemplate} className="p-2 text-gray-500 hover:text-accent hover:bg-blue-50 rounded transition-colors" title="Download Import Template">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </button>
                    
                    <div className="h-6 w-px bg-gray-300 mx-2 hidden md:block"></div>
                    
                    <Button onClick={openCreate} className="shadow-md bg-primary hover:bg-gray-900">
                        <span className="mr-2">+</span> Add Model
                    </Button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input 
                        type="text" 
                        placeholder="Search models..." 
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-accent focus:border-accent transition-all"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <select 
                    value={filterProvider} 
                    onChange={e => setFilterProvider(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-accent outline-none cursor-pointer hover:border-accent transition-colors"
                >
                    <option value="all">All Providers</option>
                    <option value="groq">Groq</option>
                    <option value="openrouter">OpenRouter</option>
                    <option value="gemini">Gemini</option>
                    <option value="dogradient">DigitalOcean Gradient</option>
                </select>
                <select 
                    value={filterCategory} 
                    onChange={e => setFilterCategory(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-accent outline-none cursor-pointer hover:border-accent transition-colors"
                >
                    <option value="all">All Categories</option>
                    <option value="extraction">Extraction</option>
                    <option value="scoring">Scoring</option>
                    <option value="research">Research</option>
                    <option value="pitches">Pitches</option>
                </select>
            </div>

            {/* Models Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredModels.map(model => (
                    <div 
                        key={model.id} 
                        className={`group relative bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md hover:border-accent transition-all duration-200 flex flex-col ${!model.isActive ? 'opacity-70 bg-gray-50' : ''}`}
                    >
                        {/* Header: Provider & Status */}
                        <div className="flex justify-between items-start mb-4">
                            <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wide border ${getProviderStyle(model.provider)}`}>
                                {model.provider}
                            </span>
                            <div className="flex gap-2">
                                {model.isDefault && (
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full border border-blue-200" title="Default for Category">
                                        DEF
                                    </span>
                                )}
                                <div className={`w-2.5 h-2.5 rounded-full mt-1 ${model.isActive ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-gray-300'}`} title={model.isActive ? "Active" : "Inactive"}></div>
                            </div>
                        </div>

                        {/* Body: Info */}
                        <div className="flex-1 mb-4">
                            <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1 group-hover:text-accent transition-colors">{model.displayName}</h3>
                            <code className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded break-all font-mono block w-fit max-w-full">
                                {model.modelId}
                            </code>
                        </div>

                        {/* Footer: Categories */}
                        <div className="flex flex-wrap gap-1 pt-4 border-t border-gray-100">
                             {model.categories.map(cat => (
                                 <div key={cat} className="flex items-center text-[10px] font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded-full border border-gray-200">
                                    <span className="mr-1 text-gray-400">{getCategoryIcon(cat)}</span>
                                    <span className="capitalize">{cat}</span>
                                </div>
                             ))}
                        </div>
                        
                        {/* Actions Overlay */}
                        <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 p-1 rounded shadow-sm">
                            <button 
                                onClick={() => openEdit(model)}
                                className="p-1.5 text-gray-400 hover:text-accent hover:bg-blue-50 rounded-md transition-colors"
                                title="Edit Model"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button 
                                onClick={() => handleDelete(model.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                title="Delete Model"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    </div>
                ))}

                {/* Empty State */}
                {filteredModels.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-500">
                        <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                        <p className="font-medium">No models found</p>
                        <p className="text-sm mt-1">Try adjusting your filters or adding a new model.</p>
                        <Button variant="secondary" size="sm" className="mt-4" onClick={openCreate}>Add First Model</Button>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingModel ? "Edit AI Model" : "Register New AI Model"} size="lg">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800 flex items-start">
                        <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <p>Registering a model here makes it available for selection in Team Settings. Ensure you have the corresponding API key added in your Team Settings.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input label="Display Name *" value={formData.displayName} onChange={e => setFormData({...formData, displayName: e.target.value})} placeholder="e.g. Llama 3 Fast" required />
                        
                        {!editingModel && (
                             <Input label="Internal DB ID (Optional)" value={formData.id} onChange={e => setFormData({...formData, id: e.target.value})} placeholder="model_custom_id" />
                        )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                            <select 
                                value={formData.provider} 
                                onChange={e => setFormData({...formData, provider: e.target.value as any})}
                                className="block w-full border border-gray-300 rounded-md p-2.5 text-sm focus:ring-accent focus:border-accent"
                            >
                                <option value="groq">Groq</option>
                                <option value="openrouter">OpenRouter</option>
                                <option value="gemini">Gemini</option>
                                <option value="dogradient">DigitalOcean Gradient</option>
                            </select>
                        </div>
                        <div>
                             <Input label="API Model ID String *" value={formData.modelId} onChange={e => setFormData({...formData, modelId: e.target.value})} placeholder="e.g. llama-3.1-70b-versatile" required />
                             <p className="text-[10px] text-gray-400 mt-1">The exact string required by the provider's API.</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Task Categories (Select all that apply)</label>
                        <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                             {['extraction', 'scoring', 'research', 'pitches'].map(cat => (
                                 <label key={cat} className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-white rounded transition-colors">
                                     <input 
                                        type="checkbox" 
                                        checked={(formData.categories || []).includes(cat as any)} 
                                        onChange={e => handleCategoryToggle(cat as any, e.target.checked)}
                                        className="rounded text-accent focus:ring-accent" 
                                    />
                                     <span className="text-sm capitalize text-gray-800">{cat}</span>
                                 </label>
                             ))}
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Model Status</h4>
                        <div className="flex flex-col sm:flex-row gap-6">
                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    id="isActive" 
                                    checked={formData.isActive} 
                                    onChange={e => setFormData({...formData, isActive: e.target.checked})}
                                    className="w-4 h-4 rounded text-accent focus:ring-accent" 
                                />
                                <div>
                                    <span className="text-sm font-medium text-gray-900 block">Active</span>
                                    <span className="text-xs text-gray-500">Available for use</span>
                                </div>
                            </label>
                            
                            <label className="flex items-center space-x-3 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    id="isDefault" 
                                    checked={formData.isDefault} 
                                    onChange={e => setFormData({...formData, isDefault: e.target.checked})}
                                    className="w-4 h-4 rounded text-accent focus:ring-accent" 
                                />
                                <div>
                                    <span className="text-sm font-medium text-gray-900 block">Global Default</span>
                                    <span className="text-xs text-gray-500">Pre-selected for new teams</span>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 space-x-3 border-t">
                         <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                         <Button type="submit" className="bg-primary hover:bg-gray-900">{editingModel ? "Save Changes" : "Register Model"}</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default AdminModelsPage;
