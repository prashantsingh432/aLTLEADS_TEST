-- Supabase SQL Schema for AL Prospect Finder
-- This replicates the previous Firestore data structures in PostgreSQL

-- 1. Users Table (Extending Supabase Auth)
create table public.users (
  id uuid references auth.users not null primary key,
  email text,
  name text,
  role text default 'user',
  team_id uuid, -- Reference to teams table
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Teams Table
create table public.teams (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  settings_version int default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Prospects Table (Leads)
create table public.prospects (
  id uuid default uuid_generate_v4() primary key,
  full_name text,
  company_name text,
  personal_linkedin text,
  team_id uuid references public.teams(id),
  created_by_uid uuid references public.users(id),
  created_by_email text,
  created_by_name text,
  comments jsonb default '[]'::jsonb, -- Array of comment objects
  last_updated timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. User Credits Table
create table public.credits (
  user_id uuid references public.users(id) primary key,
  team_id uuid references public.teams(id),
  plan text default 'free',
  balance integer default 0,
  monthly_allocation integer default 0,
  last_reset timestamp with time zone default timezone('utc'::text, now()) not null,
  usage jsonb default '{"scoring": 0, "pitches": 0, "research": 0, "contacts": 0}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. AI Models Table
create table public.ai_models (
  id text primary key, -- Text because AI models have specific string IDs (e.g., 'gpt-4')
  name text,
  categories text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Products Table
create table public.products (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Personas Table
create table public.personas (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Contact Requests Table
create table public.contact_requests (
  id uuid default uuid_generate_v4() primary key,
  prospect_id uuid references public.prospects(id) on delete cascade,
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. Profile Views Table (Analytics)
create table public.profile_views (
  id uuid default uuid_generate_v4() primary key,
  prospect_id uuid references public.prospects(id) on delete cascade,
  agent_id text,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Configure Row Level Security (RLS) - Basic Example
-- Note: Enable RLS on all tables and create appropriate policies in Supabase dashboard

alter table public.users enable row level security;
alter table public.prospects enable row level security;
alter table public.credits enable row level security;
