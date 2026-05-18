
export enum Role {
  ADMIN = 'Admin',
  AGENT = 'Agent',
  DATA_TEAM = 'Data Team',
  PENDING = 'Pending'
}

export enum Disposition {
  ACCURATE = 'Accurate',
  WRONG = 'Wrong',
  UNVERIFIED = 'Unverified'
}

export enum RequestStatus {
  PENDING = 'Pending',
  IN_PROGRESS = 'In Progress',
  FULFILLED = 'Fulfilled',
  REJECTED = 'Rejected'
}

// --- NEW V5.0 INTERFACES ---

export const PLAN_CONFIG = {
    free: { label: 'Free Tier', credits: 100, price: 0 },
    starter: { label: 'Starter', credits: 2000, price: 20 },
    pro: { label: 'Pro', credits: 10000, price: 100 },
    enterprise: { label: 'Enterprise', credits: 99999999, price: 'Custom' }
};

export const ACTION_COSTS = {
    SCORING: 1,
    PITCH: 2,
    RESEARCH: 5,
    CONTACT_REQUEST: 10
};

export type PlanType = keyof typeof PLAN_CONFIG;

export interface UserShort {
  uid: string;
  email: string;
  name: string;
}

export interface UserCredits {
  userId: string; // Document ID matches Auth UID
  balance: number;
  monthlyAllocation: number;
  plan: PlanType;
  lastReset: Date;
  teamId: string;
  usage: {
    scoring: number;
    pitches: number;
    research: number;
    contacts: number;
  };
  createdAt: Date;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  settingsVersion: number; // For extension cache busting
  defaultApiKeys: {
    groq?: string;
    openrouter?: string;
    gemini?: string;
    dogradient?: string; // NEW Phase 7
  };
  defaultModelConfig: {
    extraction?: string;
    scoring?: string;
    research?: string;
    pitches?: string;
  };
  defaultTemplates: Record<string, string>;
  defaultPrompts: Record<string, string>;
  defaultSystemPrompt: string;
  // NEW: Store product relationships on the Team doc for easier Extension access
  productIds?: string[];
  // NEW: Store persona relationships on the Team doc
  personaIds?: string[];
}

export interface AIModel {
  id: string;
  provider: 'groq' | 'openrouter' | 'gemini' | 'dogradient';
  modelId: string; // The actual API string
  displayName: string;
  // Changed from single category to array
  categories: ('extraction' | 'scoring' | 'research' | 'pitches')[]; 
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  teamId: string; // Primary Owner (Legacy)
  teamIds?: string[]; // NEW: Multi-team access
  name: string;
  tagline: string;
  painPoints: string[];
  cta: string;
  // Optional / Custom
  icon?: string;
  companyName?: string;
  scale?: string;
  clients?: string[];
  competitors?: string[];
  customSystemPrompt?: string;
  customPitchNotes?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Persona {
  id: string;
  teamId: string; // Primary Owner (Legacy)
  teamIds?: string[]; // NEW: Multi-team access
  name: string;
  titles: string[];
  keywords: string[];
  scoreBoost: number;
  linkedProductIds?: string[];
  createdBy: string;
  createdAt: Date;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  teamId: string;
  action: string; // "create_request", "login", etc.
  targetId?: string;
  targetType?: 'contactRequest' | 'prospect' | 'user';
  details?: any;
  timestamp: Date;
  source: 'extension' | 'web_app';
}

// --- UPDATED EXISTING INTERFACES ---

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status?: 'Active' | 'Inactive';
  teamId?: string; // NEW: Required in V5, optional for legacy load
  
  // User Overrides
  apiKeys?: {
    groq?: string;
    openrouter?: string;
    gemini?: string;
  };
  modelConfig?: {
    extraction?: string;
    scoring?: string;
    research?: string;
    pitches?: string;
  };
  templates?: Record<string, string>;
  prompts?: Record<string, string>;
  systemPrompt?: string;
  preferences?: {
    autoOpenOnLinkedIn?: boolean;
    selectedProductId?: string;
  };
  
  createdAt: Date;
  lastLogin?: Date;
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  timestamp: Date;
}

export interface Prospect {
  id: string;
  teamId?: string; // NEW
  
  // Tracking
  createdBy?: UserShort; // Changed from string in V5 (support both for now)
  updatedBy?: UserShort; // NEW
  
  // Company Info
  companyName: string;
  companyIndustry: string;
  companySubIndustry?: string;
  companyEmployeeSize?: string;
  companyCIN?: string;
  website?: string;
  companyLinkedin?: string;
  
  // Location
  city: string;
  state?: string;

  // Personal Info
  firstName: string;
  lastName: string;
  fullName: string;
  personalLinkedin?: string;
  designation: string;
  
  // Contact Info & Dispositions
  workEmail: string;
  workEmailDisposition: Disposition;
  
  contactNumber1: string;
  contactNumber1Disposition: Disposition;
  
  contactNumber2?: string;
  contactNumber2Disposition: Disposition;
  
  contactNumber3?: string;
  contactNumber3Disposition: Disposition;
  
  receptionNumber?: string;
  receptionNumberDisposition: Disposition;

  remark: string;
  comments?: Comment[];
  lastUpdated: Date;
}

export interface ContactRequest {
  id: string;
  teamId?: string; // NEW
  
  prospectId?: string;
  prospectName: string;
  companyName?: string; 
  linkedinUrl?: string; 
  sourceHint?: string;
  
  // Draft Data
  foundFirstName?: string;
  foundLastName?: string;
  foundDesignation?: string;
  foundEmail?: string;
  foundPhone?: string;
  foundPhone2?: string;
  foundPhone3?: string;
  foundReceptionPhone?: string;
  
  foundCompanyIndustry?: string;
  foundCompanySubIndustry?: string;
  foundCompanyEmployeeSize?: string;
  foundCompanyCIN?: string;
  foundWebsite?: string;
  foundCompanyLinkedin?: string;
  foundPersonalLinkedin?: string;
  
  foundCity?: string;
  foundState?: string;
  foundRemark?: string;
  
  requestedBy: string | UserShort; // V5 supports object
  status: RequestStatus;
  fulfilledBy?: string | UserShort; // V5 supports object
  
  isReRequest?: boolean;
  originalProspectId?: string;
  
  responseNotes?: string; 
  createdAt: Date;
  updatedAt: Date;
  fulfilledAt?: Date;
}

export interface ProfileView {
  id: string;
  teamId?: string; // NEW
  prospectId: string;
  agentId: string;
  timestamp: Date;
  linkedinUrl?: string; // Optional snapshot
  prospectName?: string; // Optional snapshot
}
