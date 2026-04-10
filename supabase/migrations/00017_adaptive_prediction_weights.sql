CREATE TABLE IF NOT EXISTS public.adaptive_prediction_weights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    weight_r DOUBLE PRECISION NOT NULL DEFAULT 0.22,
    weight_f DOUBLE PRECISION NOT NULL DEFAULT 0.24,
    weight_d DOUBLE PRECISION NOT NULL DEFAULT 0.18,
    weight_l DOUBLE PRECISION NOT NULL DEFAULT 0.18,
    weight_t DOUBLE PRECISION NOT NULL DEFAULT 0.18,
    learning_rate DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    target_precision DOUBLE PRECISION NOT NULL DEFAULT 0.75,
    current_precision DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    iteration INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.adaptive_prediction_weight_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    iteration INTEGER NOT NULL,
    zone_id TEXT,
    cycle_started_at TIMESTAMPTZ,
    cycle_ended_at TIMESTAMPTZ,
    precision DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    recall DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    f1_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    verified_count INTEGER NOT NULL DEFAULT 0,
    missed_count INTEGER NOT NULL DEFAULT 0,
    actual_hotspots INTEGER NOT NULL DEFAULT 0,
    performance_error DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    weight_r DOUBLE PRECISION NOT NULL,
    weight_f DOUBLE PRECISION NOT NULL,
    weight_d DOUBLE PRECISION NOT NULL,
    weight_l DOUBLE PRECISION NOT NULL,
    weight_t DOUBLE PRECISION NOT NULL,
    contribution_r DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    contribution_f DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    contribution_d DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    contribution_l DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    contribution_t DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.adaptive_prediction_weights (
    weight_r, weight_f, weight_d, weight_l, weight_t, learning_rate, target_precision, current_precision, iteration
)
SELECT 0.22, 0.24, 0.18, 0.18, 0.18, 0.10, 0.75, 0.0, 0
WHERE NOT EXISTS (
    SELECT 1 FROM public.adaptive_prediction_weights
);

ALTER TABLE public.adaptive_prediction_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adaptive_prediction_weight_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'adaptive_prediction_weights'
          AND policyname = 'adaptive_prediction_weights_select_authenticated'
    ) THEN
        CREATE POLICY "adaptive_prediction_weights_select_authenticated"
            ON public.adaptive_prediction_weights FOR SELECT
            USING (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'adaptive_prediction_weight_history'
          AND policyname = 'adaptive_prediction_weight_history_select_authenticated'
    ) THEN
        CREATE POLICY "adaptive_prediction_weight_history_select_authenticated"
            ON public.adaptive_prediction_weight_history FOR SELECT
            USING (auth.role() = 'authenticated');
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_adaptive_weight_history_iteration
    ON public.adaptive_prediction_weight_history(iteration DESC);

CREATE INDEX IF NOT EXISTS idx_adaptive_weight_history_zone_cycle
    ON public.adaptive_prediction_weight_history(zone_id, cycle_ended_at DESC);
