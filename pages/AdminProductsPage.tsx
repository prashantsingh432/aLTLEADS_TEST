
import React, { useState } from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { Product, Role } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { Navigate } from 'react-router-dom';

const AdminProductsPage: React.FC = () => {
    const { products, teams, addProduct, updateProduct, deleteProduct } = useData();
    const { user } = useAuth();
    
    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    
    // Data States
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [formData, setFormData] = useState<Partial<Product>>({
        name: '', tagline: '', painPoints: [], cta: '', isActive: true, clients: [], competitors: [], teamIds: []
    });
    
    // UI States
    const [isLoading, setIsLoading] = useState(false);
    const [formError, setFormError] = useState('');
    
    // Textarea states for array fields
    const [painPointsText, setPainPointsText] = useState('');
    const [clientsText, setClientsText] = useState('');
    const [competitorsText, setCompetitorsText] = useState('');

    if (!user || (user.role !== Role.ADMIN && user.role !== Role.DATA_TEAM)) {
        return <Navigate to="/" />;
    }

    const openCreate = () => {
        setEditingProduct(null);
        setFormData({ 
            name: '', tagline: '', painPoints: [], cta: '', isActive: true, 
            teamId: user.teamId, teamIds: user.teamId ? [user.teamId] : [], // Default to current user's team
            clients: [], competitors: [] 
        });
        setPainPointsText('');
        setClientsText('');
        setCompetitorsText('');
        setFormError('');
        setIsModalOpen(true);
    };

    const openEdit = (product: Product) => {
        setEditingProduct(product);
        setFormData({
            ...product,
            teamIds: product.teamIds || (product.teamId ? [product.teamId] : []) // Migration fallback
        });
        setPainPointsText(product.painPoints.join('\n'));
        setClientsText((product.clients || []).join('\n'));
        setCompetitorsText((product.competitors || []).join('\n'));
        setFormError('');
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoading) return;
        setFormError('');

        // 1. Duplicate Check
        const normalizedName = formData.name?.trim().toLowerCase();
        const duplicate = products.find(p => p.name.trim().toLowerCase() === normalizedName && p.id !== editingProduct?.id);
        
        if (duplicate) {
            setFormError(`A product with the name "${formData.name}" already exists.`);
            return;
        }

        setIsLoading(true);
        const processedPainPoints = painPointsText.split('\n').filter(s => s.trim().length > 0);
        const processedClients = clientsText.split('\n').filter(s => s.trim().length > 0);
        const processedCompetitors = competitorsText.split('\n').filter(s => s.trim().length > 0);
        
        // Ensure at least one team ID is set for backward compatibility if array is used
        const primaryTeamId = formData.teamIds && formData.teamIds.length > 0 
            ? formData.teamIds[0] 
            : (formData.teamId || user.teamId || 'unknown');

        try {
            if (editingProduct) {
                await updateProduct({
                    ...formData,
                    painPoints: processedPainPoints,
                    clients: processedClients,
                    competitors: processedCompetitors,
                    teamId: primaryTeamId, // Fallback
                    teamIds: formData.teamIds,
                    id: editingProduct.id
                } as any);
            } else {
                await addProduct({
                    name: formData.name!,
                    tagline: formData.tagline!,
                    painPoints: processedPainPoints,
                    clients: processedClients,
                    competitors: processedCompetitors,
                    cta: formData.cta!,
                    teamId: primaryTeamId,
                    teamIds: formData.teamIds || [],
                    isActive: formData.isActive || false,
                    companyName: formData.companyName,
                    scale: formData.scale,
                    createdBy: user.id
                });
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
            setFormError("Error saving product. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteClick = (product: Product) => {
        setProductToDelete(product);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!productToDelete) return;
        setIsLoading(true);
        try {
            await deleteProduct(productToDelete.id);
            setIsDeleteModalOpen(false);
            setProductToDelete(null);
        } catch (error) {
            console.error(error);
            alert("Failed to delete product.");
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
                    <h1 className="text-3xl font-bold text-text-primary">Products</h1>
                    <p className="text-text-secondary">Manage products offered by your team.</p>
                </div>
                <Button onClick={openCreate} disabled={isLoading}>+ Add Product</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map(product => (
                    <Card key={product.id} className="relative group border border-transparent hover:border-blue-200 transition-all">
                         <div className="absolute top-4 right-4 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => openEdit(product)} className="text-gray-400 hover:text-blue-600 bg-white p-1 rounded shadow-sm">
                                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                             </button>
                             <button onClick={() => handleDeleteClick(product)} className="text-gray-400 hover:text-red-600 bg-white p-1 rounded shadow-sm">
                                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                             </button>
                         </div>
                         <div className="flex items-center gap-2 mb-2">
                             {product.isActive ? (
                                 <span className="w-2 h-2 rounded-full bg-green-500"></span>
                             ) : (
                                 <span className="w-2 h-2 rounded-full bg-gray-300"></span>
                             )}
                             <h3 className="text-lg font-bold text-gray-900">{product.name}</h3>
                         </div>
                         <p className="text-sm text-gray-500 mb-4 h-10 line-clamp-2">{product.tagline}</p>
                         
                         <div className="space-y-4">
                             <div>
                                <div className="text-xs font-semibold text-gray-400 uppercase">Key Pain Points</div>
                                <ul className="text-sm text-gray-700 list-disc pl-4 space-y-1">
                                    {product.painPoints.slice(0, 3).map((pp, i) => (
                                        <li key={i}>{pp}</li>
                                    ))}
                                    {product.painPoints.length > 3 && <li className="text-gray-400 italic">+{product.painPoints.length - 3} more</li>}
                                </ul>
                             </div>
                             
                             {product.clients && product.clients.length > 0 && (
                                 <div>
                                     <div className="text-xs font-semibold text-gray-400 uppercase">Clients</div>
                                     <p className="text-xs text-gray-600">{product.clients.slice(0,3).join(', ')}{product.clients.length > 3 ? '...' : ''}</p>
                                 </div>
                             )}
                         </div>
                         
                         <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                             <span className="text-xs text-gray-400">{product.companyName || 'No Company'}</span>
                             <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded font-medium">{product.cta}</span>
                         </div>
                    </Card>
                ))}
            </div>

            {/* Create/Edit Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingProduct ? "Edit Product" : "New Product"}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {formError && <div className="bg-red-50 text-red-600 p-3 rounded text-sm">{formError}</div>}
                    
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Product Name *" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                        <Input label="Company Name" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} />
                    </div>
                    
                    <Input label="Tagline *" value={formData.tagline} onChange={e => setFormData({...formData, tagline: e.target.value})} required />
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Pain Points (One per line)</label>
                            <textarea 
                                className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                rows={6}
                                value={painPointsText}
                                onChange={e => setPainPointsText(e.target.value)}
                                placeholder="- High costs..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Key Clients (One per line)</label>
                            <textarea 
                                className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                rows={6}
                                value={clientsText}
                                onChange={e => setClientsText(e.target.value)}
                                placeholder="Acme Corp&#10;Globex"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Competitors (One per line)</label>
                            <textarea 
                                className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                rows={6}
                                value={competitorsText}
                                onChange={e => setCompetitorsText(e.target.value)}
                                placeholder="Competitor A&#10;Competitor B"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Call to Action (CTA)" value={formData.cta} onChange={e => setFormData({...formData, cta: e.target.value})} placeholder="Book a Demo" required />
                        <Input label="Scale / Proof" value={formData.scale} onChange={e => setFormData({...formData, scale: e.target.value})} placeholder="e.g. Used by 500+ teams" />
                    </div>

                    {/* Team Availability - Multi-Select */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Team Availability</label>
                        <p className="text-xs text-gray-500 mb-2">Select which teams can access this product.</p>
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

                    <div className="flex items-center space-x-2">
                        <input 
                            type="checkbox" 
                            id="isActive" 
                            checked={formData.isActive} 
                            onChange={e => setFormData({...formData, isActive: e.target.checked})}
                            className="rounded text-blue-600 focus:ring-blue-500" 
                        />
                        <label htmlFor="isActive" className="text-sm text-gray-700 font-medium">Active (Visible to Extensions)</label>
                    </div>

                    <div className="flex justify-end pt-4 space-x-2 border-t">
                         <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isLoading}>Cancel</Button>
                         <Button type="submit" disabled={isLoading}>{isLoading ? "Saving..." : (editingProduct ? "Save Changes" : "Create Product")}</Button>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Deletion" size="sm">
                <div className="space-y-4">
                    <p className="text-gray-700">Are you sure you want to delete <strong>{productToDelete?.name}</strong>?</p>
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

export default AdminProductsPage;
