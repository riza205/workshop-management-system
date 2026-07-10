
ALTER TABLE public.job_cards
  ADD COLUMN IF NOT EXISTS engine_no text,
  ADD COLUMN IF NOT EXISTS chassis_no text,
  ADD COLUMN IF NOT EXISTS delivery_promised text,
  ADD COLUMN IF NOT EXISTS primary_jobs text,
  ADD COLUMN IF NOT EXISTS secondary_jobs text,
  ADD COLUMN IF NOT EXISTS additional_jobs text,
  ADD COLUMN IF NOT EXISTS technical_advice text,
  ADD COLUMN IF NOT EXISTS spares jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS labour_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS advance_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_cost numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS body_damage_notes text,
  ADD COLUMN IF NOT EXISTS fuel_qty text,
  ADD COLUMN IF NOT EXISTS checklist jsonb NOT NULL DEFAULT '{}'::jsonb;
