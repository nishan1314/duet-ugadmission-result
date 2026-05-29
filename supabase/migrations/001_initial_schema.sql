-- 1. admin_users
CREATE TABLE public.admin_users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  role        TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. site_settings
CREATE TABLE public.site_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_by  UUID REFERENCES public.admin_users(id) ON DELETE SET NULL
);

-- Seed default portal settings
INSERT INTO public.site_settings (key, value) VALUES
  ('site_title', 'Undergraduate Admission Test Result - DUET'),
  ('site_description', 'Official portal to check Dhaka University of Engineering & Technology undergraduate admission results.'),
  ('admission_year', '2025'),
  ('result_published', 'true'),
  ('show_announcement', 'true'),
  ('announcement_text', 'Admission Test 2025 results are officially published. Please enter your Applicant ID to check.'),
  ('maintenance_mode', 'false'),
  ('maintenance_message', 'The portal is undergoing scheduled maintenance. Please check back in a few minutes.');

-- 3. search_logs
CREATE TABLE public.search_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id  TEXT NOT NULL,
  found         BOOLEAN NOT NULL,
  department    TEXT,                     -- Mapped from mock results to enable department chart analytics
  searched_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 4. visitor_logs
CREATE TABLE public.visitor_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  visitor_hash  TEXT NOT NULL,
  page          TEXT DEFAULT '/',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(visit_date, visitor_hash, page)
);

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitor_logs ENABLE ROW LEVEL SECURITY;

-- admin_users policies
CREATE POLICY "Admins can read admin_users" ON public.admin_users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can modify admin_users" ON public.admin_users FOR ALL TO authenticated USING (true);

-- site_settings policies
CREATE POLICY "Public can view settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admins can modify site_settings" ON public.site_settings FOR ALL TO authenticated USING (true);

-- search_logs policies
CREATE POLICY "Public can log searches" ON public.search_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can read search_logs" ON public.search_logs FOR SELECT TO authenticated USING (true);

-- visitor_logs policies
CREATE POLICY "Public can log visits" ON public.visitor_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can read visitor_logs" ON public.visitor_logs FOR SELECT TO authenticated USING (true);

-- Trigger to automatically insert a new admin_user on signup/auth user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.admin_users (id, name, email, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'Administrator'),
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'admin')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
