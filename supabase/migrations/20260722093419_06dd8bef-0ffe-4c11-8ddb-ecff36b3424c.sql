
-- Customers
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_person text,
  phone text,
  email text,
  address text,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated, anon;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY demo_all_customers ON public.customers FOR ALL USING (true) WITH CHECK (true);

-- Contracts
CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  route text NOT NULL,
  contract_currency text NOT NULL DEFAULT 'USD',
  contract_amount numeric NOT NULL DEFAULT 0,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'Draft',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated, anon;
GRANT ALL ON public.contracts TO service_role;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY demo_all_contracts ON public.contracts FOR ALL USING (true) WITH CHECK (true);

-- Company settings (single row)
CREATE TABLE public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'FleetPulse Logistics',
  logo_url text,
  address text,
  phone text,
  email text,
  default_currency text NOT NULL DEFAULT 'USD',
  default_fx_rate numeric NOT NULL DEFAULT 2600,
  notifications_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_settings TO authenticated, anon;
GRANT ALL ON public.company_settings TO service_role;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY demo_all_company_settings ON public.company_settings FOR ALL USING (true) WITH CHECK (true);
INSERT INTO public.company_settings (company_name) VALUES ('FleetPulse Logistics');

-- Roles
CREATE TYPE public.app_role AS ENUM ('admin','dispatcher','finance','driver');
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  display_name text,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated, anon;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY demo_all_user_roles ON public.user_roles FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Audit logs
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor text,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_logs TO authenticated, anon;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY demo_all_audit_logs ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- Trips: add customer/contract links + settlement timestamps
ALTER TABLE public.trips
  ADD COLUMN customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  ADD COLUMN settled_at timestamptz,
  ADD COLUMN audited_at timestamptz;

-- Seed demo customers and a contract
INSERT INTO public.customers (id, company_name, contact_person, phone, email, address)
VALUES
  ('11111111-1111-1111-1111-111111111111','Kasumbalesa Copper Ltd','James Mwangi','+255700111222','ops@kcl.co.tz','Dar es Salaam, TZ'),
  ('22222222-2222-2222-2222-222222222222','East Africa Freight Co','Sarah Otieno','+255700333444','contracts@eafreight.com','Nairobi, KE');

INSERT INTO public.contracts (customer_id, route, contract_currency, contract_amount, start_date, end_date, status)
VALUES
  ('11111111-1111-1111-1111-111111111111','DAR-KASUMBALESA','USD',5200,CURRENT_DATE - 30, CURRENT_DATE + 60,'Active'),
  ('22222222-2222-2222-2222-222222222222','DAR-KAMPALA','USD',4800,CURRENT_DATE - 15, CURRENT_DATE + 90,'Active');
