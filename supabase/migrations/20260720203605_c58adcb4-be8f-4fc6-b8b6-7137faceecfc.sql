
-- Vehicles
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reg_number TEXT NOT NULL UNIQUE,
  model TEXT NOT NULL,
  capacity_tons NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vehicles TO anon, authenticated;
GRANT ALL ON public.vehicles TO service_role;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo_all_vehicles" ON public.vehicles FOR ALL USING (true) WITH CHECK (true);

-- Drivers
CREATE TABLE public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT,
  license_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drivers TO anon, authenticated;
GRANT ALL ON public.drivers TO service_role;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo_all_drivers" ON public.drivers FOR ALL USING (true) WITH CHECK (true);

-- Trips
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_code TEXT NOT NULL UNIQUE,
  origin_destination TEXT NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  planned_km NUMERIC NOT NULL DEFAULT 0,
  dispatch_date DATE,
  return_date DATE,
  status TEXT NOT NULL DEFAULT 'Draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trips TO anon, authenticated;
GRANT ALL ON public.trips TO service_role;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo_all_trips" ON public.trips FOR ALL USING (true) WITH CHECK (true);

-- Trip financials
CREATE TABLE public.trip_financials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL UNIQUE REFERENCES public.trips(id) ON DELETE CASCADE,
  contract_currency TEXT NOT NULL DEFAULT 'USD',
  contract_amount NUMERIC NOT NULL DEFAULT 0,
  fx_exchange_rate NUMERIC NOT NULL DEFAULT 1,
  total_contract_tzs NUMERIC GENERATED ALWAYS AS (contract_amount * fx_exchange_rate) STORED,
  advance_input_type TEXT NOT NULL DEFAULT 'percentage',
  advance_value NUMERIC NOT NULL DEFAULT 0,
  advance_paid_usd NUMERIC NOT NULL DEFAULT 0,
  advance_paid_tzs NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_financials TO anon, authenticated;
GRANT ALL ON public.trip_financials TO service_role;
ALTER TABLE public.trip_financials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo_all_trip_financials" ON public.trip_financials FOR ALL USING (true) WITH CHECK (true);

-- Trip expenses
CREATE TABLE public.trip_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT,
  volume_liters NUMERIC,
  amount_tzs NUMERIC NOT NULL DEFAULT 0,
  receipt_url TEXT,
  status TEXT NOT NULL DEFAULT 'Pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trip_expenses TO anon, authenticated;
GRANT ALL ON public.trip_expenses TO service_role;
ALTER TABLE public.trip_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo_all_trip_expenses" ON public.trip_expenses FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX trip_expenses_trip_idx ON public.trip_expenses(trip_id);

-- Seed demo data
WITH v AS (
  INSERT INTO public.vehicles (reg_number, model, capacity_tons, status)
  VALUES ('T165EJW', 'Scania R500', 30, 'Active')
  RETURNING id
),
d AS (
  INSERT INTO public.drivers (full_name, phone, license_number)
  VALUES ('ANGELOUS MGIMWA', '+255 754 111 222', 'TZ-DL-99823')
  RETURNING id
),
t AS (
  INSERT INTO public.trips (trip_code, origin_destination, vehicle_id, driver_id, planned_km, dispatch_date, status)
  SELECT 'TRIP-DAR-KAS-01', 'Dar es Salaam → Kasumbalesa', v.id, d.id, 4000, CURRENT_DATE - 5, 'In-Transit'
  FROM v, d
  RETURNING id
),
f AS (
  INSERT INTO public.trip_financials (trip_id, contract_currency, contract_amount, fx_exchange_rate, advance_input_type, advance_value, advance_paid_usd, advance_paid_tzs)
  SELECT t.id, 'USD', 7200, 2600, 'percentage', 70, 5200, 13520000 FROM t
  RETURNING trip_id
)
INSERT INTO public.trip_expenses (trip_id, category, description, volume_liters, amount_tzs, status)
SELECT f.trip_id, cat, descr, liters, amt, 'Verified' FROM f,
(VALUES
  ('Fuel', 'Fuel DAR (600L)', 600, 2166500),
  ('Fuel', 'Fuel Mbeya (850L)', 850, 3761250),
  ('Fuel', 'Fuel Additional (111L)', 111, 501160),
  ('Road Tolls', 'Road Tolls', NULL, 2464860),
  ('Driver Millage', 'Millage Allowance', NULL, 850000),
  ('Container Drop-off', 'Container Drop-off', NULL, 150000),
  ('Miscellaneous', 'Kingamuzi/Deck', NULL, 85000)
) AS s(cat, descr, liters, amt);

-- Extra vehicles & drivers for the dispatch form
INSERT INTO public.vehicles (reg_number, model, capacity_tons, status) VALUES
  ('T412KLM', 'Volvo FH16', 32, 'Active'),
  ('T278ABC', 'MAN TGX', 28, 'Maintenance');
INSERT INTO public.drivers (full_name, phone, license_number) VALUES
  ('JOSEPH MAKALA', '+255 762 555 777', 'TZ-DL-77401'),
  ('PETER KIMARO', '+255 715 333 444', 'TZ-DL-88112');
