// FIX: Declare chrome to provide types for Chrome extension APIs.
declare const chrome: any;

import React, { createContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Prospect, ContactRequest, ProfileView, User, Disposition, Role, Comment, Team, Product, AIModel, Persona, UserCredits, PlanType, PLAN_CONFIG } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface DataContextType {
  prospects: Prospect[];
  contactRequests: ContactRequest[];
  profileViews: ProfileView[];
  users: User[];
  teams: Team[];
  products: Product[];
  personas: Persona[];
  aiModels: AIModel[];
  allUserCredits: UserCredits[]; 
  currentUserCredits: UserCredits | null; 
  searchHistory: string[];
  isSynced: boolean;
  
  updateProspect: (updatedProspect: Prospect) => Promise<void>;
  addProspect: (newProspect: Omit<Prospect, 'id' | 'lastUpdated'>) => Promise<void>;
  deleteProspect: (id: string) => Promise<void>; 
  addProspectsBulk: (newProspects: any[], onProgress?: (count: number) => void) => Promise<void>;
  addComment: (prospectId: string, user: User, text: string) => Promise<void>;
  createContactRequest: (newRequest: Omit<ContactRequest, 'id' | 'createdAt' | 'updatedAt'>) => void;
  deleteContactRequest: (id: string) => Promise<void>; 
  logProfileView: (prospectId: string, agentId: string) => void;
  updateContactRequest: (updatedRequest: ContactRequest) => void;
  updateUserRole: (userId: string, newRole: Role) => void;
  markValidation: (prospectId: string, field: keyof Prospect, disposition: Disposition) => void;
  addToHistory: (term: string) => void;
  seedDatabase: () => Promise<void>;
  runV5Migration: () => Promise<void>;
  addTeam: (team: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateTeam: (team: Partial<Team> & { id: string }) => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProduct: (product: Partial<Product> & { id: string }) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addPersona: (persona: Omit<Persona, 'id' | 'createdAt'>) => Promise<void>;
  updatePersona: (persona: Partial<Persona> & { id: string }) => Promise<void>;
  deletePersona: (id: string) => Promise<void>;
  addAIModel: (model: Omit<AIModel, 'createdAt' | 'updatedAt'>) => Promise<void>;
  addAIModelsBulk: (models: Omit<AIModel, 'createdAt' | 'updatedAt'>[]) => Promise<void>;
  updateAIModel: (model: Partial<AIModel> & { id: string }) => Promise<void>;
  deleteAIModel: (id: string) => Promise<void>;
  updateUserPlan: (userId: string, plan: PlanType, customBalance?: number) => Promise<void>;
}

export const DataContext = createContext<DataContextType | undefined>(undefined);

// Helper mapping functions to adapt Postgres snake_case to Frontend camelCase
const mapProspectToClient = (p: any): Prospect => ({
  id: p.id,
  teamId: p.team_id,
  fullName: p.full_name || '',
  firstName: p.first_name || '',
  lastName: p.last_name || '',
  designation: p.designation || '',
  companyName: p.company_name || '',
  companyIndustry: p.company_industry || '',
  companySubIndustry: p.company_sub_industry || '',
  companyEmployeeSize: p.company_employee_size || '',
  companyCIN: p.company_cin || '',
  website: p.website || '',
  companyLinkedin: p.company_linkedin || '',
  city: p.city || '',
  state: p.state || '',
  personalLinkedin: p.personal_linkedin || '',
  workEmail: p.work_email || '',
  workEmailDisposition: p.workEmailDisposition || 'Unverified',
  contactNumber1: p.contact_number1 || '',
  contactNumber1Disposition: p.contactNumber1Disposition || 'Unverified',
  contactNumber2: p.contact_number2 || '',
  contactNumber2Disposition: p.contactNumber2Disposition || 'Unverified',
  contactNumber3: p.contact_number3 || '',
  contactNumber3Disposition: p.contactNumber3Disposition || 'Unverified',
  receptionNumber: p.reception_number || '',
  receptionNumberDisposition: p.receptionNumberDisposition || 'Unverified',
  remark: p.remark || '',
  comments: p.comments || [],
  lastUpdated: new Date(p.last_updated),
  createdBy: { uid: p.created_by_uid || '', email: p.created_by_email || '', name: p.created_by_name || '' }
});

const mapProspectToDB = (p: any) => ({
  id: p.id,
  team_id: p.teamId,
  full_name: p.fullName,
  first_name: p.firstName,
  last_name: p.lastName,
  designation: p.designation,
  company_name: p.companyName,
  company_industry: p.companyIndustry,
  company_sub_industry: p.companySubIndustry,
  company_employee_size: p.companyEmployeeSize,
  company_cin: p.companyCIN,
  website: p.website,
  company_linkedin: p.companyLinkedin,
  city: p.city,
  state: p.state,
  personal_linkedin: p.personalLinkedin,
  work_email: p.workEmail,
  workEmailDisposition: p.workEmailDisposition,
  contact_number1: p.contactNumber1,
  contactNumber1Disposition: p.contactNumber1Disposition,
  contact_number2: p.contactNumber2,
  contactNumber2Disposition: p.contactNumber2Disposition,
  contact_number3: p.contactNumber3,
  contactNumber3Disposition: p.contactNumber3Disposition,
  reception_number: p.receptionNumber,
  receptionNumberDisposition: p.receptionNumberDisposition,
  remark: p.remark,
  comments: p.comments,
  created_by_uid: p.createdBy?.uid,
  created_by_email: p.createdBy?.email,
  created_by_name: p.createdBy?.name,
});

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [contactRequests, setContactRequests] = useState<ContactRequest[]>([]);
  const [profileViews, setProfileViews] = useState<ProfileView[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [aiModels, setAiModels] = useState<AIModel[]>([]);
  const [allUserCredits, setAllUserCredits] = useState<UserCredits[]>([]);
  const [currentUserCredits, setCurrentUserCredits] = useState<UserCredits | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [isSynced, setIsSynced] = useState(false);

  const checkAndResetCredits = useCallback(async (uid: string, creditsData: UserCredits[]) => {
      const myCreds = creditsData.find(c => c.userId === uid);
      if (!myCreds) {
          const initialData = {
              user_id: uid, plan: 'free', balance: PLAN_CONFIG['free'].credits,
              monthly_allocation: PLAN_CONFIG['free'].credits, team_id: user?.teamId || null,
              usage: { scoring: 0, pitches: 0, research: 0, contacts: 0 }
          };
          await supabase.from('credits').insert([initialData]);
          return;
      }

      const diffDays = Math.ceil(Math.abs(new Date().getTime() - new Date(myCreds.lastReset).getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 30) {
          console.log(`Resetting credits for ${uid}. Last reset was ${diffDays} days ago.`);
          await supabase.from('credits').update({
              balance: myCreds.monthlyAllocation, last_reset: new Date().toISOString()
          }).eq('user_id', uid);
      }
  }, [user]);

  const fetchData = useCallback(async () => {
    try {
      const [
        { data: tData }, { data: aiData }, { data: uData }, { data: prodData }, 
        { data: persData }, { data: prosData }, { data: reqData }, { data: viewData }, { data: credData }
      ] = await Promise.all([
        supabase.from('teams').select('*'),
        supabase.from('ai_models').select('*'),
        supabase.from('users').select('*'),
        supabase.from('products').select('*'),
        supabase.from('personas').select('*'),
        supabase.from('prospects').select('*').order('last_updated', { ascending: false }).limit(1500),
        supabase.from('contact_requests').select('*').order('created_at', { ascending: false }).limit(500),
        supabase.from('profile_views').select('*').order('timestamp', { ascending: false }).limit(500),
        supabase.from('credits').select('*')
      ]);

      if (tData) setTeams(tData.map(d => ({
        id: d.id,
        name: d.name,
        description: d.description || '',
        createdBy: d.created_by || '',
        settingsVersion: d.settings_version || 1,
        defaultApiKeys: d.default_api_keys || {},
        defaultModelConfig: d.default_model_config || {},
        defaultTemplates: d.default_templates || {},
        defaultPrompts: d.default_prompts || {},
        defaultSystemPrompt: d.default_system_prompt || '',
        productIds: d.product_ids || [],
        personaIds: d.persona_ids || [],
        createdAt: new Date(d.created_at),
        updatedAt: new Date(d.updated_at),
      } as Team)));
      if (aiData) setAiModels(aiData.map(d => ({ id: d.id, provider: d.provider, modelId: d.model_id, displayName: d.display_name, name: d.name, categories: d.categories || [], isDefault: d.is_default, isActive: d.is_active, createdAt: new Date(d.created_at), updatedAt: new Date(d.updated_at) } as AIModel)));
      if (uData) setUsers(uData.map(d => ({ ...d, teamId: d.team_id, createdAt: new Date(d.created_at) } as User)));
      if (prodData) setProducts(prodData.map(d => ({ ...d, teamId: d.team_id, teamIds: d.team_ids, painPoints: d.pain_points || [], clients: d.clients || [], competitors: d.competitors || [], isActive: d.is_active, createdBy: d.created_by, companyName: d.company_name, createdAt: new Date(d.created_at), updatedAt: new Date(d.updated_at) } as Product)));
      if (persData) setPersonas(persData.map(d => ({ ...d, teamId: d.team_id, teamIds: d.team_ids, scoreBoost: d.score_boost, createdBy: d.created_by, createdAt: new Date(d.created_at) } as Persona)));
      if (prosData) setProspects(prosData.map(mapProspectToClient));
      if (reqData) setContactRequests(reqData.map(d => ({
        id: d.id,
        teamId: d.team_id,
        prospectId: d.prospect_id,
        prospectName: d.prospect_name || '',
        companyName: d.company_name || '',
        linkedinUrl: d.linkedin_url || '',
        sourceHint: d.source_hint || '',
        requestedBy: d.requested_by || '',
        status: d.status,
        fulfilledBy: d.fulfilled_by || '',
        foundFirstName: d.found_first_name || '',
        foundLastName: d.found_last_name || '',
        foundDesignation: d.found_designation || '',
        foundEmail: d.found_email || '',
        foundPhone: d.found_phone || '',
        foundPhone2: d.found_phone2 || '',
        foundPhone3: d.found_phone3 || '',
        foundReceptionPhone: d.found_reception_phone || '',
        foundCompanyIndustry: d.found_company_industry || '',
        foundCompanySubIndustry: d.found_company_sub_industry || '',
        foundCompanyEmployeeSize: d.found_company_employee_size || '',
        foundCompanyCIN: d.found_company_cin || '',
        foundWebsite: d.found_website || '',
        foundCompanyLinkedin: d.found_company_linkedin || '',
        foundPersonalLinkedin: d.found_personal_linkedin || '',
        foundCity: d.found_city || '',
        foundState: d.found_state || '',
        foundRemark: d.found_remark || '',
        createdAt: new Date(d.created_at),
        updatedAt: new Date(d.updated_at)
      } as ContactRequest)));
      if (viewData) setProfileViews(viewData.map(d => ({ ...d, prospectId: d.prospect_id, agentId: d.agent_id, timestamp: new Date(d.timestamp) } as ProfileView)));
      
      if (credData) {
        const mappedCredits = credData.map(d => ({ 
            userId: d.user_id, plan: d.plan, balance: d.balance, monthlyAllocation: d.monthly_allocation,
            lastReset: new Date(d.last_reset), teamId: d.team_id, usage: d.usage, createdAt: new Date(d.created_at)
        })) as UserCredits[];
        setAllUserCredits(mappedCredits);
        
        if (user) {
            const myCreds = mappedCredits.find(c => c.userId === user.id);
            setCurrentUserCredits(myCreds || null);
            checkAndResetCredits(user.id, mappedCredits);
        }
      }
      setIsSynced(true);
    } catch (err) { console.error("Error fetching initial data", err); }
  }, [user, checkAndResetCredits]);

  useEffect(() => {
    fetchData();

    // Supabase Realtime Subscription
    const channel = supabase.channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
          // A simple approach for a full admin app is to refetch on changes,
          // which ensures data integrity without complex state merges.
          fetchData(); 
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  // --- ACTIONS ---

  const updateUserPlan = useCallback(async (userId: string, plan: PlanType, customBalance?: number) => {
      const planDetails = PLAN_CONFIG[plan];
      if (!planDetails) throw new Error("Invalid Plan");

      const balanceToSet = customBalance !== undefined ? customBalance : planDetails.credits;
      
      const { data } = await supabase.from('credits').select('user_id').eq('user_id', userId).maybeSingle();

      if (data) {
          await supabase.from('credits').update({
              plan: plan, monthly_allocation: planDetails.credits, balance: balanceToSet, last_reset: new Date().toISOString()
          }).eq('user_id', userId);
      } else {
          await supabase.from('credits').insert([{
              user_id: userId, plan, monthly_allocation: planDetails.credits, balance: balanceToSet, team_id: users.find(u => u.id === userId)?.teamId || null,
              usage: { scoring: 0, pitches: 0, research: 0, contacts: 0 }
          }]);
      }
  }, [users]);

  const addToHistory = useCallback((term: string) => {
      if (!term.trim()) return;
      setSearchHistory(prev => {
          const newHistory = [term, ...prev.filter(t => t !== term)].slice(0, 50);
          localStorage.setItem('amplior_search_history', JSON.stringify(newHistory));
          return newHistory;
      });
  }, []);

  const normalizeUrl = (url: string) => {
      if (!url) return '';
      return url.toLowerCase().replace(/https?:\/\//, '').replace(/www\./, '').replace(/\/$/, '').trim();
  };

  const addProspectsBulk = useCallback(async (newProspects: any[], onProgress?: (count: number) => void) => {
      const CHUNK_SIZE = 400; 
      let processed = 0;
      
      const linkedinMap = new Map();
      const nameMap = new Map();
      prospects.forEach(p => {
          if (p.personalLinkedin) linkedinMap.set(normalizeUrl(p.personalLinkedin), p.id);
          if (p.fullName && p.companyName) {
              const key = `${p.fullName.toLowerCase()}_${p.companyName.toLowerCase()}`;
              nameMap.set(key, p.id);
          }
      });

      for (let i = 0; i < newProspects.length; i += CHUNK_SIZE) {
          const chunk = newProspects.slice(i, i + CHUNK_SIZE);
          const upsertPayload = chunk.map(p => {
              const safeP: any = {};
              Object.keys(p).forEach(key => { if (p[key] !== undefined) safeP[key] = p[key]; else safeP[key] = ''; });
              if (!safeP.teamId && user?.teamId) safeP.teamId = user.teamId;
              
              let matchId = safeP.id || linkedinMap.get(normalizeUrl(safeP.personalLinkedin || '')) || nameMap.get(`${safeP.fullName?.toLowerCase()}_${safeP.companyName?.toLowerCase()}`);
              
              const dbRecord = mapProspectToDB(safeP);
              if (matchId) dbRecord.id = matchId;
              if (!matchId) {
                 dbRecord.created_by_uid = user?.id;
                 dbRecord.created_by_email = user?.email;
                 dbRecord.created_by_name = user?.name;
              }
              dbRecord.last_updated = new Date().toISOString();
              return dbRecord;
          });

          await supabase.from('prospects').upsert(upsertPayload);
          processed += chunk.length;
          if (onProgress) onProgress(processed);
      }
  }, [prospects, user]);

  const updateProspect = useCallback(async (updatedProspect: Prospect) => {
    try {
        const { id, ...data } = mapProspectToDB(updatedProspect);
        await supabase.from('prospects').update({ ...data, last_updated: new Date().toISOString() }).eq('id', id);
    } catch (e) { console.error(e); throw e; }
  }, []);

  const addProspect = useCallback(async (newProspect: Omit<Prospect, 'id' | 'lastUpdated'>) => {
      try {
          const data = mapProspectToDB(newProspect);
          await supabase.from('prospects').insert([{ ...data, created_by_uid: user?.id, created_by_email: user?.email, created_by_name: user?.name, last_updated: new Date().toISOString() }]);
      } catch (e) { console.error(e); throw e; }
  }, [user]);

  const deleteProspect = useCallback(async (id: string) => { await supabase.from('prospects').delete().eq('id', id); }, []);
  
  const addComment = useCallback(async (prospectId: string, author: User, text: string) => {
      const prospect = prospects.find(p => p.id === prospectId);
      if (!prospect) return;
      const newComment: Comment = { id: Math.random().toString(36).substr(2, 9), userId: author.id, userName: author.name, text: text, timestamp: new Date() };
      const updatedComments = [...(prospect.comments || []), newComment];
      await supabase.from('prospects').update({ comments: updatedComments, last_updated: new Date().toISOString() }).eq('id', prospectId);
  }, [prospects]);

  const createContactRequest = useCallback(async (newRequest: Omit<ContactRequest, 'id' | 'createdAt' | 'updatedAt'>) => {
    const requestedBy = typeof newRequest.requestedBy === 'string'
      ? { name: newRequest.requestedBy }
      : newRequest.requestedBy;
    await supabase.from('contact_requests').insert([{
      prospect_id: newRequest.prospectId || null,
      prospect_name: newRequest.prospectName || '',
      company_name: newRequest.companyName || '',
      linkedin_url: newRequest.linkedinUrl || '',
      source_hint: newRequest.sourceHint || '',
      requested_by: requestedBy,
      status: newRequest.status,
    }]);
  }, []);

  const updateContactRequest = useCallback(async (updatedRequest: ContactRequest) => {
    const fulfilledBy = typeof updatedRequest.fulfilledBy === 'string'
      ? { name: updatedRequest.fulfilledBy }
      : (updatedRequest.fulfilledBy || null);
    await supabase.from('contact_requests').update({
      status: updatedRequest.status,
      prospect_name: updatedRequest.prospectName,
      company_name: updatedRequest.companyName,
      linkedin_url: updatedRequest.linkedinUrl,
      source_hint: updatedRequest.sourceHint,
      fulfilled_by: fulfilledBy,
      found_first_name: updatedRequest.foundFirstName || '',
      found_last_name: updatedRequest.foundLastName || '',
      found_designation: updatedRequest.foundDesignation || '',
      found_email: updatedRequest.foundEmail || '',
      found_phone: updatedRequest.foundPhone || '',
      found_phone2: updatedRequest.foundPhone2 || '',
      found_phone3: updatedRequest.foundPhone3 || '',
      found_reception_phone: updatedRequest.foundReceptionPhone || '',
      found_company_industry: updatedRequest.foundCompanyIndustry || '',
      found_company_sub_industry: updatedRequest.foundCompanySubIndustry || '',
      found_company_employee_size: updatedRequest.foundCompanyEmployeeSize || '',
      found_company_cin: updatedRequest.foundCompanyCIN || '',
      found_website: updatedRequest.foundWebsite || '',
      found_company_linkedin: updatedRequest.foundCompanyLinkedin || '',
      found_personal_linkedin: updatedRequest.foundPersonalLinkedin || '',
      found_city: updatedRequest.foundCity || '',
      found_state: updatedRequest.foundState || '',
      found_remark: updatedRequest.foundRemark || '',
      updated_at: new Date().toISOString()
    }).eq('id', updatedRequest.id);
  }, []);
  
  const deleteContactRequest = useCallback(async (id: string) => { await supabase.from('contact_requests').delete().eq('id', id); }, []);
  
  const logProfileView = useCallback(async (prospectId: string, agentId: string) => {
    await supabase.from('profile_views').insert([{ prospect_id: prospectId, agent_id: agentId }]);
  }, []);
  
  const updateUserRole = useCallback(async (userId: string, newRole: Role) => { 
      await supabase.from('users').update({ role: newRole }).eq('id', userId); 
  }, []);
  
  const markValidation = useCallback(async (prospectId: string, field: keyof Prospect, disposition: Disposition) => {
    // Disposition fields kept as camelCase in DB (quoted columns); others snake_case
    const fieldMap: Record<string, string> = {
      workEmailDisposition: 'workEmailDisposition',
      contactNumber1Disposition: 'contactNumber1Disposition',
      contactNumber2Disposition: 'contactNumber2Disposition',
      contactNumber3Disposition: 'contactNumber3Disposition',
      receptionNumberDisposition: 'receptionNumberDisposition',
    };
    const dbField = fieldMap[field as string] || field;
    await supabase.from('prospects').update({ [dbField]: disposition, last_updated: new Date().toISOString() }).eq('id', prospectId);
  }, []);

  const seedDatabase = useCallback(async () => { /* Left blank for brevity as requested by previous pattern */ }, []);
  const runV5Migration = useCallback(async () => { /* Left blank */ }, []);
  
  const addTeam = useCallback(async (team: Omit<Team, 'id' | 'createdAt' | 'updatedAt'>) => {
      const { data } = await supabase.from('teams').insert([{
        name: team.name,
        description: team.description || '',
        created_by: team.createdBy || '',
        settings_version: 1,
        default_api_keys: team.defaultApiKeys || {},
        default_model_config: team.defaultModelConfig || {},
        default_templates: team.defaultTemplates || {},
        default_prompts: team.defaultPrompts || {},
        default_system_prompt: team.defaultSystemPrompt || '',
        product_ids: team.productIds || [],
        persona_ids: team.personaIds || [],
      }]).select().single();
      return data?.id;
  }, []);

  const updateTeam = useCallback(async (team: Partial<Team> & { id: string }) => {
      await supabase.from('teams').update({
        name: team.name,
        description: team.description,
        settings_version: (team.settingsVersion || 0) + 1,
        default_api_keys: team.defaultApiKeys,
        default_model_config: team.defaultModelConfig,
        default_templates: team.defaultTemplates,
        default_prompts: team.defaultPrompts,
        default_system_prompt: team.defaultSystemPrompt,
        product_ids: team.productIds,
        persona_ids: team.personaIds,
        updated_at: new Date().toISOString()
      }).eq('id', team.id);
  }, []);

  const addProduct = useCallback(async (product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
      await supabase.from('products').insert([{
        name: product.name,
        tagline: product.tagline || '',
        pain_points: product.painPoints || [],
        cta: product.cta || '',
        company_name: product.companyName || '',
        scale: product.scale || '',
        clients: product.clients || [],
        competitors: product.competitors || [],
        is_active: product.isActive ?? true,
        team_id: product.teamId || '',
        team_ids: product.teamIds || [],
        created_by: product.createdBy || '',
      }]);
  }, []);

  const updateProduct = useCallback(async (product: Partial<Product> & { id: string }) => {
      await supabase.from('products').update({
        name: product.name,
        tagline: product.tagline,
        pain_points: product.painPoints,
        cta: product.cta,
        company_name: product.companyName,
        scale: product.scale,
        clients: product.clients,
        competitors: product.competitors,
        is_active: product.isActive,
        team_id: product.teamId,
        team_ids: product.teamIds,
        updated_at: new Date().toISOString()
      }).eq('id', product.id);
  }, []);

  const deleteProduct = useCallback(async (id: string) => { await supabase.from('products').delete().eq('id', id); }, []);

  const addPersona = useCallback(async (persona: Omit<Persona, 'id' | 'createdAt'>) => {
      await supabase.from('personas').insert([{
        name: persona.name,
        titles: persona.titles || [],
        keywords: persona.keywords || [],
        score_boost: persona.scoreBoost || 0,
        team_id: persona.teamId || '',
        team_ids: persona.teamIds || [],
        created_by: persona.createdBy || '',
      }]);
  }, []);

  const updatePersona = useCallback(async (persona: Partial<Persona> & { id: string }) => {
      await supabase.from('personas').update({
        name: persona.name,
        titles: persona.titles,
        keywords: persona.keywords,
        score_boost: persona.scoreBoost,
        team_id: persona.teamId,
        team_ids: persona.teamIds,
      }).eq('id', persona.id);
  }, []);

  const deletePersona = useCallback(async (id: string) => { await supabase.from('personas').delete().eq('id', id); }, []);

  const addAIModel = useCallback(async (model: Omit<AIModel, 'createdAt' | 'updatedAt'>) => {
       await supabase.from('ai_models').insert([{
         id: model.id,
         name: model.displayName || model.id,
         provider: model.provider,
         model_id: model.modelId,
         display_name: model.displayName,
         categories: model.categories,
         is_default: model.isDefault ?? false,
         is_active: model.isActive ?? true,
       }]);
  }, []);

  const addAIModelsBulk = useCallback(async (models: Omit<AIModel, 'createdAt' | 'updatedAt'>[]) => {
      await supabase.from('ai_models').upsert(models.map(m => ({
        id: m.id,
        name: m.displayName || m.id,
        provider: m.provider,
        model_id: m.modelId,
        display_name: m.displayName,
        categories: m.categories,
        is_default: m.isDefault ?? false,
        is_active: m.isActive ?? true,
      })));
  }, []);

  const updateAIModel = useCallback(async (model: Partial<AIModel> & { id: string }) => {
      await supabase.from('ai_models').update({
        name: model.displayName || model.name,
        provider: model.provider,
        model_id: model.modelId,
        display_name: model.displayName,
        categories: model.categories,
        is_default: model.isDefault,
        is_active: model.isActive,
        updated_at: new Date().toISOString()
      }).eq('id', model.id);
  }, []);
  
  const deleteAIModel = useCallback(async (id: string) => { await supabase.from('ai_models').delete().eq('id', id); }, []);

  return (
    <DataContext.Provider value={{ 
        prospects, contactRequests, profileViews, users, teams, products, personas, aiModels, allUserCredits, currentUserCredits, searchHistory, isSynced, 
        updateProspect, addProspect, deleteProspect, addProspectsBulk, addComment, createContactRequest, deleteContactRequest, logProfileView, updateContactRequest, updateUserRole, markValidation, addToHistory, seedDatabase, runV5Migration,
        addTeam, updateTeam, addProduct, updateProduct, deleteProduct, addPersona, updatePersona, deletePersona, addAIModel, addAIModelsBulk, updateAIModel, deleteAIModel, updateUserPlan
    }}>
      {children}
    </DataContext.Provider>
  );
};
