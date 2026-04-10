-- ============================================================================
-- Migration 00014: Research-paper feedback architecture
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE TABLE IF NOT EXISTS public.prediction_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id VARCHAR(12) NOT NULL UNIQUE,
    threshold NUMERIC(4, 3) NOT NULL DEFAULT 0.650,
    baseline_threshold NUMERIC(4, 3) NOT NULL DEFAULT 0.650,
    min_threshold NUMERIC(4, 3) NOT NULL DEFAULT 0.400,
    max_threshold NUMERIC(4, 3) NOT NULL DEFAULT 0.900,
    learning_rate NUMERIC(4, 3) NOT NULL DEFAULT 0.050,
    target_pai NUMERIC(4, 3) NOT NULL DEFAULT 0.800,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.prediction_feedback_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_id UUID REFERENCES public.predicted_reports(id) ON DELETE CASCADE,
    zone_id VARCHAR(12) NOT NULL,
    report_id UUID REFERENCES public.waste_reports(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('verified', 'missed')),
    distance_meters NUMERIC(10, 2),
    time_delta_minutes NUMERIC(10, 2),
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.prediction_cycle_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id VARCHAR(12) NOT NULL,
    cycle_started_at TIMESTAMPTZ NOT NULL,
    cycle_ended_at TIMESTAMPTZ NOT NULL,
    pai NUMERIC(5, 4) NOT NULL DEFAULT 0,
    verified_count INTEGER NOT NULL DEFAULT 0,
    evaluated_count INTEGER NOT NULL DEFAULT 0,
    precision NUMERIC(5, 4),
    recall NUMERIC(5, 4),
    f1_score NUMERIC(5, 4),
    threshold_before NUMERIC(4, 3),
    threshold_after NUMERIC(4, 3),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.route_run_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    collector_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    route_date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_stops INTEGER NOT NULL DEFAULT 0,
    total_distance_km NUMERIC(10, 2) NOT NULL DEFAULT 0,
    naive_distance_km NUMERIC(10, 2) NOT NULL DEFAULT 0,
    distance_saved_km NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total_time_minutes INTEGER NOT NULL DEFAULT 0,
    time_saved_minutes INTEGER NOT NULL DEFAULT 0,
    predicted_stop_count INTEGER NOT NULL DEFAULT 0,
    optimization_method TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prediction_feedback_zone_time ON public.prediction_feedback_records(zone_id, evaluated_at DESC);
CREATE INDEX IF NOT EXISTS idx_prediction_cycle_metrics_zone_time ON public.prediction_cycle_metrics(zone_id, cycle_ended_at DESC);
CREATE INDEX IF NOT EXISTS idx_route_run_metrics_date ON public.route_run_metrics(route_date DESC);

ALTER TABLE public.prediction_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_feedback_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prediction_cycle_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_run_metrics ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename='prediction_thresholds' AND policyname='prediction_thresholds_select_authenticated'
    ) THEN
        CREATE POLICY "prediction_thresholds_select_authenticated"
        ON public.prediction_thresholds FOR SELECT
        USING (auth.role() = 'authenticated');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename='prediction_feedback_records' AND policyname='prediction_feedback_records_select_authenticated'
    ) THEN
        CREATE POLICY "prediction_feedback_records_select_authenticated"
        ON public.prediction_feedback_records FOR SELECT
        USING (auth.role() = 'authenticated');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename='prediction_cycle_metrics' AND policyname='prediction_cycle_metrics_select_authenticated'
    ) THEN
        CREATE POLICY "prediction_cycle_metrics_select_authenticated"
        ON public.prediction_cycle_metrics FOR SELECT
        USING (auth.role() = 'authenticated');
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname='public' AND tablename='route_run_metrics' AND policyname='route_run_metrics_select_authenticated'
    ) THEN
        CREATE POLICY "route_run_metrics_select_authenticated"
        ON public.route_run_metrics FOR SELECT
        USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Optional scheduling hooks for hosted Supabase setups with pg_cron enabled.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        BEGIN
            PERFORM cron.unschedule('nhs_prediction_cycle');
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
        BEGIN
            PERFORM cron.unschedule('nhs_feedback_cycle');
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;
END $$;
