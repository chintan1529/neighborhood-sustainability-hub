-- ============================================================================
-- Migration 00013: Unified predictive hotspot feedback loop
-- ============================================================================

ALTER TABLE public.predicted_reports
ADD COLUMN IF NOT EXISTS geohash VARCHAR(12),
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_predicted_reports_status ON public.predicted_reports(status);
CREATE INDEX IF NOT EXISTS idx_predicted_reports_target_date ON public.predicted_reports(target_date);
CREATE INDEX IF NOT EXISTS idx_predicted_reports_geohash ON public.predicted_reports(geohash);

ALTER TABLE public.predicted_reports
ALTER COLUMN status SET DEFAULT 'active';

ALTER TABLE public.location_weights
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL;

CREATE INDEX IF NOT EXISTS idx_location_weights_geohash ON public.location_weights(geohash);

ALTER TABLE public.model_calibration
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL;

ALTER TABLE public.predicted_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_calibration ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'predicted_reports'
          AND policyname = 'predicted_reports_select_authenticated'
    ) THEN
        CREATE POLICY "predicted_reports_select_authenticated"
            ON public.predicted_reports FOR SELECT
            USING (auth.role() = 'authenticated');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'location_weights'
          AND policyname = 'location_weights_select_authenticated'
    ) THEN
        CREATE POLICY "location_weights_select_authenticated"
            ON public.location_weights FOR SELECT
            USING (auth.role() = 'authenticated');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'model_calibration'
          AND policyname = 'model_calibration_select_authenticated'
    ) THEN
        CREATE POLICY "model_calibration_select_authenticated"
            ON public.model_calibration FOR SELECT
            USING (auth.role() = 'authenticated');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'predicted_reports'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.predicted_reports;
    END IF;
END $$;
