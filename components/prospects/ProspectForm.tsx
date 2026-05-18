import React, { useState } from 'react';
import { Prospect, Disposition } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';

interface ProspectFormProps {
  initialData?: Partial<Prospect>;
  onSubmit: (data: Omit<Prospect, 'id' | 'lastUpdated'>) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
  isResolvingRequest?: boolean; // New prop to relax validation
}

const ProspectForm: React.FC<ProspectFormProps> = ({ initialData, onSubmit, onCancel, isEditing = false, isResolvingRequest = false }) => {
  const [formData, setFormData] = useState<Partial<Prospect>>(initialData || {
      // Defaults
      workEmailDisposition: Disposition.UNVERIFIED,
      contactNumber1Disposition: Disposition.UNVERIFIED,
      contactNumber2Disposition: Disposition.UNVERIFIED,
      contactNumber3Disposition: Disposition.UNVERIFIED,
      receptionNumberDisposition: Disposition.UNVERIFIED,
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      try {
          // Construct Full Name
          const fullName = `${formData.firstName || ''} ${formData.lastName || ''}`.trim();
          
          await onSubmit({
              ...formData as any,
              fullName: fullName || formData.fullName || 'Unknown',
          });
      } finally {
          setLoading(false);
      }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Company Section */}
      <div className="bg-slate-50 p-4 rounded-lg border border-border">
          <h3 className="text-lg font-semibold text-primary mb-4 border-b border-gray-200 pb-2">Company Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input label="Company Name *" name="companyName" value={formData.companyName} onChange={handleChange} required />
              <Input label="Industry" name="companyIndustry" value={formData.companyIndustry} onChange={handleChange} />
              <Input label="Sub-Industry" name="companySubIndustry" value={formData.companySubIndustry} onChange={handleChange} />
              <Input label="Employee Size" name="companyEmployeeSize" value={formData.companyEmployeeSize} onChange={handleChange} placeholder="e.g. 50-200" />
              <Input label="CIN Number" name="companyCIN" value={formData.companyCIN} onChange={handleChange} />
              <Input label="Website" name="website" value={formData.website} onChange={handleChange} placeholder="example.com" />
              <div className="col-span-1 md:col-span-2">
                  <Input label="Company LinkedIn URL" name="companyLinkedin" value={formData.companyLinkedin} onChange={handleChange} />
              </div>
          </div>
      </div>

      {/* Location */}
      <div className="bg-slate-50 p-4 rounded-lg border border-border">
          <h3 className="text-lg font-semibold text-primary mb-4 border-b border-gray-200 pb-2">Location</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="City" name="city" value={formData.city} onChange={handleChange} />
              <Input label="State" name="state" value={formData.state} onChange={handleChange} />
          </div>
      </div>

      {/* Personal Info */}
      <div className="bg-slate-50 p-4 rounded-lg border border-border">
          <h3 className="text-lg font-semibold text-primary mb-4 border-b border-gray-200 pb-2">Personal Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Input label="First Name *" name="firstName" value={formData.firstName} onChange={handleChange} required />
              <Input label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} />
              <Input label="Designation *" name="designation" value={formData.designation} onChange={handleChange} required />
              <div className="col-span-1 md:col-span-2">
                 <Input label="Personal LinkedIn URL" name="personalLinkedin" value={formData.personalLinkedin} onChange={handleChange} />
              </div>
          </div>
      </div>

      {/* Contact Info */}
      <div className="bg-slate-50 p-4 rounded-lg border border-border">
          <h3 className="text-lg font-semibold text-primary mb-4 border-b border-gray-200 pb-2">
              Contact Information {isResolvingRequest && <span className="text-xs text-gray-500 font-normal">(Optional during resolution)</span>}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Only required if NOT resolving a request, or if creating a standard prospect */}
              <Input 
                label={`Work Email ${isResolvingRequest ? '' : '*'}`} 
                type="email" 
                name="workEmail" 
                value={formData.workEmail} 
                onChange={handleChange} 
                required={!isResolvingRequest} 
              />
              <Input 
                label={`Contact No. 1 ${isResolvingRequest ? '' : '*'}`} 
                name="contactNumber1" 
                value={formData.contactNumber1} 
                onChange={handleChange} 
                required={!isResolvingRequest} 
              />
              <Input label="Contact No. 2" name="contactNumber2" value={formData.contactNumber2} onChange={handleChange} />
              <Input label="Contact No. 3" name="contactNumber3" value={formData.contactNumber3} onChange={handleChange} />
              <Input label="Reception No" name="receptionNumber" value={formData.receptionNumber} onChange={handleChange} />
          </div>
      </div>
      
      <div className="bg-slate-50 p-4 rounded-lg border border-border">
           <label className="block text-sm font-medium text-text-secondary mb-1">Remarks</label>
           <textarea 
                name="remark" 
                value={formData.remark} 
                onChange={handleChange} 
                rows={3} 
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent sm:text-sm"
           />
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-border">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button type="submit" disabled={loading} className="min-w-[120px]">
              {loading ? 'Saving...' : (isEditing ? 'Update Prospect' : 'Add Prospect')}
          </Button>
      </div>
    </form>
  );
};

export default ProspectForm;