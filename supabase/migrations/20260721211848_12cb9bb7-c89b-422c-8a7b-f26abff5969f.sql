
ALTER TABLE public.drivers
  ADD COLUMN IF NOT EXISTS monthly_salary_tzs numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS base_location text;

CREATE TABLE IF NOT EXISTS public.driver_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  payment_type text NOT NULL DEFAULT 'Salary',
  amount_tzs numeric NOT NULL DEFAULT 0,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  period_label text,
  reference_trip uuid REFERENCES public.trips(id) ON DELETE SET NULL,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_payments TO anon, authenticated;
GRANT ALL ON public.driver_payments TO service_role;

ALTER TABLE public.driver_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY demo_all_driver_payments ON public.driver_payments
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_driver_payments_driver ON public.driver_payments(driver_id);
