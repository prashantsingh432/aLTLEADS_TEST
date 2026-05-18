-- =============================================
-- STEP 2: RUN THIS AFTER Step 1 works
-- This sets up RLS policies + user creation function
-- =============================================

-- ══════════════════════════════════════════════
-- RLS POLICIES (without these, frontend can't read/write data)
-- ══════════════════════════════════════════════

-- Users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_read" ON public.users;
DROP POLICY IF EXISTS "users_insert" ON public.users;
DROP POLICY IF EXISTS "users_update" ON public.users;

CREATE POLICY "users_read" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_insert" ON public.users FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "users_update" ON public.users FOR UPDATE TO authenticated USING (true);

-- Teams table
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "teams_read" ON public.teams;
DROP POLICY IF EXISTS "teams_write" ON public.teams;
CREATE POLICY "teams_read" ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "teams_write" ON public.teams FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Prospects table
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prospects_read" ON public.prospects;
DROP POLICY IF EXISTS "prospects_write" ON public.prospects;
CREATE POLICY "prospects_read" ON public.prospects FOR SELECT TO authenticated USING (true);
CREATE POLICY "prospects_write" ON public.prospects FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Credits table
ALTER TABLE public.credits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "credits_read" ON public.credits;
DROP POLICY IF EXISTS "credits_write" ON public.credits;
CREATE POLICY "credits_read" ON public.credits FOR SELECT TO authenticated USING (true);
CREATE POLICY "credits_write" ON public.credits FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- AI Models table
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_models_read" ON public.ai_models;
DROP POLICY IF EXISTS "ai_models_write" ON public.ai_models;
CREATE POLICY "ai_models_read" ON public.ai_models FOR SELECT TO authenticated USING (true);
CREATE POLICY "ai_models_write" ON public.ai_models FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Products table
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products_read" ON public.products;
DROP POLICY IF EXISTS "products_write" ON public.products;
CREATE POLICY "products_read" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "products_write" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Personas table
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "personas_read" ON public.personas;
DROP POLICY IF EXISTS "personas_write" ON public.personas;
CREATE POLICY "personas_read" ON public.personas FOR SELECT TO authenticated USING (true);
CREATE POLICY "personas_write" ON public.personas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Contact Requests table
ALTER TABLE public.contact_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "contact_requests_all" ON public.contact_requests;
CREATE POLICY "contact_requests_all" ON public.contact_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Profile Views table
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profile_views_all" ON public.profile_views;
CREATE POLICY "profile_views_all" ON public.profile_views FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ══════════════════════════════════════════════
-- Auto-confirm trigger (for future signups)
-- ══════════════════════════════════════════════

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


-- ══════════════════════════════════════════════
-- Auto-create public.users profile on signup
-- ══════════════════════════════════════════════

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

-- DONE! Both triggers ensure future users are auto-confirmed and auto-profiled.
