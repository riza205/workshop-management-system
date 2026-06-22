
CREATE TABLE public.cars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_name text NOT NULL,
  owner_phone text NOT NULL,
  make_model text NOT NULL,
  license_plate text NOT NULL,
  date_in date NOT NULL,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','ready','delivered')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cars TO authenticated;
GRANT ALL ON public.cars TO service_role;
ALTER TABLE public.cars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage cars" ON public.cars FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.car_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id uuid NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  description text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  assigned_employee_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.car_tasks TO authenticated;
GRANT ALL ON public.car_tasks TO service_role;
ALTER TABLE public.car_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage car_tasks" ON public.car_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.car_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  car_id uuid NOT NULL REFERENCES public.cars(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.car_photos TO authenticated;
GRANT ALL ON public.car_photos TO service_role;
ALTER TABLE public.car_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage car_photos" ON public.car_photos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER cars_set_updated_at BEFORE UPDATE ON public.cars
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
