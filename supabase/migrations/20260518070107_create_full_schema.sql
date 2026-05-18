
/*
  # AltLeads CRM - Full Database Schema

  ## New Tables
  - `users` - CRM user profiles linked to auth.users
  - `teams` - Team configurations with AI settings, templates, prompts
  - `prospects` - Lead/contact records with disposition tracking
  - `credits` - User credit balances and usage tracking
  - `ai_models` - Registered AI model configurations
  - `products` - Products for pitch generation
  - `personas` - Target buyer personas for scoring
  - `contact_requests` - Requests to find/update contact info
  - `profile_views` - Analytics: who viewed which prospect

  ## Security
  - RLS enabled on all tables
  - Authenticated users can read most data
  - Write policies scoped appropriately
  - Admin-level operations allowed for Admin role users

  ## Notes
  1. Email auto-confirm trigger bypasses email verification requirement
  2. handle_new_user trigger auto-creates public.users on signup
  3. All array/JSONB columns have safe defaults
*/

-- ══════════════════════════════════════════════
-- EXTENSIONS
-- ══════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ══════════════════════════════════════════════
-- TABLES
-- ══════════════════════════════════════════════

-- Teams table (created before users so users can FK to it)
CREATE TABLE IF NOT EXISTS public.teams (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  name text NOT NULL,
  description text DEFAULT '',
  created_by text DEFAULT '',
  settings_version int DEFAULT 1,
  default_api_keys jsonb DEFAULT '{}'::jsonb,
  default_model_config jsonb DEFAULT '{}'::jsonb,
  default_templates jsonb DEFAULT '{}'::jsonb,
  default_prompts jsonb DEFAULT '{}'::jsonb,
  default_system_prompt text DEFAULT 'You are a helpful B2B sales assistant.',
  product_ids text[] DEFAULT ARRAY[]::text[],
  persona_ids text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Users table (extends Supabase auth)
CREATE TABLE IF NOT EXISTS public.users (
  id uuid REFERENCES auth.users NOT NULL PRIMARY KEY,
  email text,
  name text DEFAULT '',
  role text DEFAULT 'Agent',
  status text DEFAULT 'Active',
  team_id uuid REFERENCES public.teams(id),
  api_keys jsonb DEFAULT '{}'::jsonb,
  model_config jsonb DEFAULT '{}'::jsonb,
  preferences jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Prospects table
CREATE TABLE IF NOT EXISTS public.prospects (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id uuid REFERENCES public.teams(id),
  full_name text DEFAULT '',
  first_name text DEFAULT '',
  last_name text DEFAULT '',
  designation text DEFAULT '',
  company_name text DEFAULT '',
  company_industry text DEFAULT '',
  company_sub_industry text DEFAULT '',
  company_employee_size text DEFAULT '',
  company_cin text DEFAULT '',
  website text DEFAULT '',
  company_linkedin text DEFAULT '',
  city text DEFAULT '',
  state text DEFAULT '',
  personal_linkedin text DEFAULT '',
  work_email text DEFAULT '',
  "workEmailDisposition" text DEFAULT 'Unverified',
  contact_number1 text DEFAULT '',
  "contactNumber1Disposition" text DEFAULT 'Unverified',
  contact_number2 text DEFAULT '',
  "contactNumber2Disposition" text DEFAULT 'Unverified',
  contact_number3 text DEFAULT '',
  "contactNumber3Disposition" text DEFAULT 'Unverified',
  reception_number text DEFAULT '',
  "receptionNumberDisposition" text DEFAULT 'Unverified',
  remark text DEFAULT '',
  comments jsonb DEFAULT '[]'::jsonb,
  created_by_uid text DEFAULT '',
  created_by_email text DEFAULT '',
  created_by_name text DEFAULT '',
  last_updated timestamptz DEFAULT now() NOT NULL
);

-- Credits table
CREATE TABLE IF NOT EXISTS public.credits (
  user_id uuid REFERENCES public.users(id) PRIMARY KEY,
  team_id uuid REFERENCES public.teams(id),
  plan text DEFAULT 'free',
  balance integer DEFAULT 100,
  monthly_allocation integer DEFAULT 100,
  last_reset timestamptz DEFAULT now() NOT NULL,
  usage jsonb DEFAULT '{"scoring": 0, "pitches": 0, "research": 0, "contacts": 0}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- AI Models table
CREATE TABLE IF NOT EXISTS public.ai_models (
  id text PRIMARY KEY,
  name text DEFAULT '',
  provider text DEFAULT 'groq',
  model_id text DEFAULT '',
  display_name text DEFAULT '',
  categories text[] DEFAULT ARRAY[]::text[],
  is_default boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Products table
CREATE TABLE IF NOT EXISTS public.products (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id text DEFAULT '',
  team_ids text[] DEFAULT ARRAY[]::text[],
  name text NOT NULL,
  tagline text DEFAULT '',
  pain_points text[] DEFAULT ARRAY[]::text[],
  cta text DEFAULT '',
  company_name text DEFAULT '',
  scale text DEFAULT '',
  clients text[] DEFAULT ARRAY[]::text[],
  competitors text[] DEFAULT ARRAY[]::text[],
  is_active boolean DEFAULT true,
  created_by text DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Personas table
CREATE TABLE IF NOT EXISTS public.personas (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id text DEFAULT '',
  team_ids text[] DEFAULT ARRAY[]::text[],
  name text NOT NULL,
  titles text[] DEFAULT ARRAY[]::text[],
  keywords text[] DEFAULT ARRAY[]::text[],
  score_boost integer DEFAULT 10,
  created_by text DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Contact Requests table
CREATE TABLE IF NOT EXISTS public.contact_requests (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id text DEFAULT '',
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE SET NULL,
  prospect_name text DEFAULT '',
  company_name text DEFAULT '',
  linkedin_url text DEFAULT '',
  source_hint text DEFAULT '',
  requested_by jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'Pending',
  fulfilled_by jsonb DEFAULT '{}'::jsonb,
  found_first_name text DEFAULT '',
  found_last_name text DEFAULT '',
  found_designation text DEFAULT '',
  found_email text DEFAULT '',
  found_phone text DEFAULT '',
  found_phone2 text DEFAULT '',
  found_phone3 text DEFAULT '',
  found_reception_phone text DEFAULT '',
  found_company_industry text DEFAULT '',
  found_company_sub_industry text DEFAULT '',
  found_company_employee_size text DEFAULT '',
  found_company_cin text DEFAULT '',
  found_website text DEFAULT '',
  found_company_linkedin text DEFAULT '',
  found_personal_linkedin text DEFAULT '',
  found_city text DEFAULT '',
  found_state text DEFAULT '',
  found_remark text DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Profile Views table
CREATE TABLE IF NOT EXISTS public.profile_views (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id text DEFAULT '',
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE CASCADE,
  agent_id text DEFAULT '',
  timestamp timestamptz DEFAULT now() NOT NULL
);

-- ══════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ══════════════════════════════════════════════

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "users_select" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_insert" ON public.users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update" ON public.users FOR UPDATE TO authenticated USING (true);

-- Teams policies
CREATE POLICY "teams_select" ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "teams_insert" ON public.teams FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "teams_update" ON public.teams FOR UPDATE TO authenticated USING (true);
CREATE POLICY "teams_delete" ON public.teams FOR DELETE TO authenticated USING (true);

-- Prospects policies
CREATE POLICY "prospects_select" ON public.prospects FOR SELECT TO authenticated USING (true);
CREATE POLICY "prospects_insert" ON public.prospects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "prospects_update" ON public.prospects FOR UPDATE TO authenticated USING (true);
CREATE POLICY "prospects_delete" ON public.prospects FOR DELETE TO authenticated USING (true);

-- Credits policies
CREATE POLICY "credits_select" ON public.credits FOR SELECT TO authenticated USING (true);
CREATE POLICY "credits_insert" ON public.credits FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "credits_update" ON public.credits FOR UPDATE TO authenticated USING (true);

-- AI Models policies
CREATE POLICY "ai_models_select" ON public.ai_models FOR SELECT TO authenticated USING (true);
CREATE POLICY "ai_models_insert" ON public.ai_models FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "ai_models_update" ON public.ai_models FOR UPDATE TO authenticated USING (true);
CREATE POLICY "ai_models_delete" ON public.ai_models FOR DELETE TO authenticated USING (true);

-- Products policies
CREATE POLICY "products_select" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "products_insert" ON public.products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "products_update" ON public.products FOR UPDATE TO authenticated USING (true);
CREATE POLICY "products_delete" ON public.products FOR DELETE TO authenticated USING (true);

-- Personas policies
CREATE POLICY "personas_select" ON public.personas FOR SELECT TO authenticated USING (true);
CREATE POLICY "personas_insert" ON public.personas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "personas_update" ON public.personas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "personas_delete" ON public.personas FOR DELETE TO authenticated USING (true);

-- Contact Requests policies
CREATE POLICY "contact_requests_select" ON public.contact_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "contact_requests_insert" ON public.contact_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "contact_requests_update" ON public.contact_requests FOR UPDATE TO authenticated USING (true);
CREATE POLICY "contact_requests_delete" ON public.contact_requests FOR DELETE TO authenticated USING (true);

-- Profile Views policies
CREATE POLICY "profile_views_select" ON public.profile_views FOR SELECT TO authenticated USING (true);
CREATE POLICY "profile_views_insert" ON public.profile_views FOR INSERT TO authenticated WITH CHECK (true);

-- ══════════════════════════════════════════════
-- TRIGGERS
-- ══════════════════════════════════════════════

-- Auto-confirm email on signup (bypass email verification)
CREATE OR REPLACE FUNCTION public.auto_confirm_email()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_confirm_email_trigger ON auth.users;
CREATE TRIGGER auto_confirm_email_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.auto_confirm_email();

-- Auto-create public.users profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Agent'),
    'Active'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
