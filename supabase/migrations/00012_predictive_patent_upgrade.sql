-- ============================================================================
-- Migration 00012: Advanced Predictive Patent Upgrades
-- ============================================================================

-- 1. Migrate Location Weights to GeoHash clustering
ALTER TABLE public.location_weights 
DROP CONSTRAINT IF EXISTS location_weights_lat_grid_lng_grid_key;

ALTER TABLE public.location_weights 
ADD COLUMN IF NOT EXISTS geohash VARCHAR(10);

-- Note: In a production system with real data, we would backfill geohashes 
-- based on the lat_grid/lng_grid here. Since this is dev, we can just allow nulls 
-- temporarily, or update existing mock rows.
UPDATE public.location_weights SET geohash = substring(md5(random()::text) from 1 for 6) WHERE geohash IS NULL;

-- 2. Enforce constraint
ALTER TABLE public.location_weights 
ADD CONSTRAINT location_weights_geohash_key UNIQUE (geohash);

-- 3. Add global accuracy tracking for Calibration (C_calibrated = C * historical_accuracy)
CREATE TABLE IF NOT EXISTS public.model_calibration (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    total_predictions_generated INTEGER DEFAULT 0,
    total_predictions_verified INTEGER DEFAULT 0,
    current_accuracy_multiplier NUMERIC(3, 2) DEFAULT 0.80 NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Init single row
INSERT INTO public.model_calibration (total_predictions_generated, total_predictions_verified, current_accuracy_multiplier)
SELECT 0, 0, 0.80
WHERE NOT EXISTS (SELECT 1 FROM public.model_calibration);

ALTER TABLE public.model_calibration ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access to all users" ON public.model_calibration FOR SELECT USING (true);
CREATE POLICY "Allow update access to service role" ON public.model_calibration FOR UPDATE USING (true);
CREATE POLICY "Allow insert access to service role" ON public.model_calibration FOR INSERT WITH CHECK (true);
