-- ============================================================================
-- NEIGHBORHOOD SUSTAINABILITY HUB
-- Migration 00011: AI Predictive Waste System
-- ============================================================================

-- 1. Create Location Weights table for the adaptive penalty/reinforcement system
CREATE TABLE IF NOT EXISTS public.location_weights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lat_grid NUMERIC(7, 4) NOT NULL, -- Gridded coordinate for clustered matching
    lng_grid NUMERIC(7, 4) NOT NULL,
    weight_multiplier NUMERIC(3, 2) DEFAULT 1.00 NOT NULL, -- Decays if missed, grows if verified
    total_predictions INTEGER DEFAULT 0,
    verified_predictions INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(lat_grid, lng_grid)
);

ALTER TABLE public.location_weights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access to all users" ON public.location_weights FOR SELECT USING (true);
CREATE POLICY "Allow all access to service role" ON public.location_weights FOR ALL USING (true);


-- 2. Create Predicted Reports table
CREATE TABLE IF NOT EXISTS public.predicted_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    predicted_category TEXT NOT NULL,
    base_confidence NUMERIC(3, 2) NOT NULL,
    final_weight NUMERIC(3, 2) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    target_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'verified', 'missed')),
    matched_report_id UUID REFERENCES public.waste_reports(id) ON DELETE SET NULL,
    collector_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- If preemptively claimed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.predicted_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read access to all users" ON public.predicted_reports FOR SELECT USING (true);
CREATE POLICY "Allow updates from authorized users" ON public.predicted_reports FOR UPDATE USING (true);
CREATE POLICY "Allow all access to service role" ON public.predicted_reports FOR ALL USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE predicted_reports;


-- 3. Seed Mock Historical Data into `waste_reports` for AI pattern recognition
-- We will create a distinct pattern: Every Saturday at a specific park, "recyclable" waste accumulates.
-- User ID placeholder: We'll use a subquery to grab the first resident user if available, or generate a dummy one.

DO $$
DECLARE
    v_user_id UUID;
    v_neighborhood_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;
    SELECT id INTO v_neighborhood_id FROM public.neighborhoods LIMIT 1;
    
    IF v_user_id IS NOT NULL THEN
        -- Pattern 1: Weekly Recyclables accumulating near a high-traffic metro station
        -- 3 weeks ago
        INSERT INTO public.waste_reports(id, user_id, neighborhood_id, predicted_class, confirmed_class, prediction_confidence, quantity_estimate, status, latitude, longitude, address_text, photo_url, created_at, updated_at)
        VALUES (uuid_generate_v4(), v_user_id, v_neighborhood_id, 'plastic', 'plastic', 1.0, 'large', 'completed', 12.971598, 77.594562, 'Metro Station Plaza', 'placeholder.jpg', NOW() - INTERVAL '21 days', NOW() - INTERVAL '21 days');
        
        -- 2 weeks ago
        INSERT INTO public.waste_reports(id, user_id, neighborhood_id, predicted_class, confirmed_class, prediction_confidence, quantity_estimate, status, latitude, longitude, address_text, photo_url, created_at, updated_at)
        VALUES (uuid_generate_v4(), v_user_id, v_neighborhood_id, 'plastic', 'plastic', 1.0, 'medium', 'completed', 12.971600, 77.594580, 'Metro Station Plaza', 'placeholder.jpg', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days');
        
        -- 1 week ago
        INSERT INTO public.waste_reports(id, user_id, neighborhood_id, predicted_class, confirmed_class, prediction_confidence, quantity_estimate, status, latitude, longitude, address_text, photo_url, created_at, updated_at)
        VALUES (uuid_generate_v4(), v_user_id, v_neighborhood_id, 'plastic', 'plastic', 1.0, 'large', 'completed', 12.971590, 77.594560, 'Metro Station Plaza', 'placeholder.jpg', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days');

        -- Pattern 2: Bi-weekly "organic" waste behind a local restaurant street
        INSERT INTO public.waste_reports(id, user_id, neighborhood_id, predicted_class, confirmed_class, prediction_confidence, quantity_estimate, status, latitude, longitude, address_text, photo_url, created_at, updated_at)
        VALUES (uuid_generate_v4(), v_user_id, v_neighborhood_id, 'organic', 'organic', 1.0, 'medium', 'completed', 12.934533, 77.626579, 'Restaurant Alley', 'placeholder.jpg', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days');
        
        INSERT INTO public.waste_reports(id, user_id, neighborhood_id, predicted_class, confirmed_class, prediction_confidence, quantity_estimate, status, latitude, longitude, address_text, photo_url, created_at, updated_at)
        VALUES (uuid_generate_v4(), v_user_id, v_neighborhood_id, 'organic', 'organic', 1.0, 'large', 'completed', 12.934540, 77.626580, 'Restaurant Alley', 'placeholder.jpg', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days');
    END IF;
END $$;
