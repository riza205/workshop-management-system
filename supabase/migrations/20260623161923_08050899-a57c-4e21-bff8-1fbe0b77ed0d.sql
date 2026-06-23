
-- Sequence for human-readable job card numbers
CREATE SEQUENCE IF NOT EXISTS public.job_card_number_seq START 1;

CREATE TABLE public.job_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_number text NOT NULL UNIQUE DEFAULT ('JC-' || lpad(nextval('public.job_card_number_seq')::text, 6, '0')),
  job_date date NOT NULL DEFAULT current_date,
  job_time time NOT NULL DEFAULT current_time,

  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  customer_address text,

  vehicle_reg text NOT NULL,
  vehicle_brand text,
  vehicle_model text,
  vehicle_year int,
  vin text,
  mileage_km int,
  fuel_level int CHECK (fuel_level BETWEEN 1 AND 5),

  complaint text,

  estimated_parts_cost numeric(12,2) DEFAULT 0,
  estimated_labour_cost numeric(12,2) DEFAULT 0,
  customer_approval boolean NOT NULL DEFAULT false,

  assigned_technician_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  assigned_date date,

  work_done text,
  parts_used text,
  final_labour_charge numeric(12,2) DEFAULT 0,
  final_bill_amount numeric(12,2) DEFAULT 0,
  delivery_date date,

  status text NOT NULL DEFAULT 'open',

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_cards TO authenticated;
GRANT ALL ON public.job_cards TO service_role;
GRANT USAGE ON SEQUENCE public.job_card_number_seq TO authenticated, service_role;

ALTER TABLE public.job_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage job_cards" ON public.job_cards
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_job_cards_updated_at
  BEFORE UPDATE ON public.job_cards
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.job_card_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_card_id uuid NOT NULL REFERENCES public.job_cards(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_card_photos TO authenticated;
GRANT ALL ON public.job_card_photos TO service_role;

ALTER TABLE public.job_card_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can manage job_card_photos" ON public.job_card_photos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
