-- ============================================================================
-- WASTE INTELLIGENCE & ANALYTICS MODULE
-- Migration 00020 — Additive only, no changes to existing tables
-- ============================================================================

-- ============================================================================
-- 1. AREA RISK ZONES — Stores computed risk per geohash zone
-- ============================================================================
CREATE TABLE IF NOT EXISTS area_risk_zones (
    zone_id             TEXT PRIMARY KEY,                    -- geohash precision 5 (~5km)
    risk_score          NUMERIC(5,2) NOT NULL DEFAULT 0,
    risk_level          TEXT NOT NULL DEFAULT 'low'
        CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    report_count        INTEGER DEFAULT 0,
    unresolved_count    INTEGER DEFAULT 0,
    dominant_category   waste_category,
    severity_index      NUMERIC(5,3) DEFAULT 0,
    last_cleanup_at     TIMESTAMPTZ,
    last_report_at      TIMESTAMPTZ,
    latitude            NUMERIC(10,8),
    longitude           NUMERIC(11,8),
    metadata            JSONB DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_zones_level ON area_risk_zones(risk_level);
CREATE INDEX IF NOT EXISTS idx_risk_zones_score ON area_risk_zones(risk_score DESC);

-- ============================================================================
-- 2. GOVERNMENT BENCHMARKS — Normalized Swachh Survekshan data
-- ============================================================================
CREATE TABLE IF NOT EXISTS government_benchmarks (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    city                        TEXT NOT NULL,
    state                       TEXT NOT NULL,
    cleanliness_rank            INTEGER,
    cleanliness_score           NUMERIC(6,2),
    waste_processed_tpd         NUMERIC(10,2),
    door_to_door_coverage_pct   NUMERIC(5,2),
    source_segregation_pct      NUMERIC(5,2),
    population_lakhs            NUMERIC(8,2),
    survey_year                 INTEGER NOT NULL,
    survey_source               TEXT DEFAULT 'swachh_survekshan',
    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(city, survey_year, survey_source)
);

CREATE INDEX IF NOT EXISTS idx_govt_city ON government_benchmarks(city);
CREATE INDEX IF NOT EXISTS idx_govt_state ON government_benchmarks(state);

-- ============================================================================
-- 3. RISK SCORING CONFIG — Configurable weights (not hardcoded)
-- ============================================================================
CREATE TABLE IF NOT EXISTS risk_scoring_config (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    weight_density      NUMERIC(4,3) DEFAULT 0.300,   -- w1
    weight_severity     NUMERIC(4,3) DEFAULT 0.300,   -- w2
    weight_recency      NUMERIC(4,3) DEFAULT 0.200,   -- w3
    weight_unresolved   NUMERIC(4,3) DEFAULT 0.200,   -- w4
    severity_plastic    NUMERIC(3,1) DEFAULT 5.0,
    severity_hazardous  NUMERIC(3,1) DEFAULT 5.0,
    severity_metal      NUMERIC(3,1) DEFAULT 3.0,
    severity_glass      NUMERIC(3,1) DEFAULT 3.0,
    severity_cardboard  NUMERIC(3,1) DEFAULT 2.0,
    severity_paper      NUMERIC(3,1) DEFAULT 2.0,
    severity_organic    NUMERIC(3,1) DEFAULT 1.0,
    severity_mixed      NUMERIC(3,1) DEFAULT 2.5,
    is_active           BOOLEAN DEFAULT true,
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default config row
INSERT INTO risk_scoring_config DEFAULT VALUES
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4. AUTO-UPDATE updated_at TRIGGERS
-- ============================================================================
CREATE TRIGGER update_area_risk_zones_updated_at
    BEFORE UPDATE ON area_risk_zones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_risk_scoring_config_updated_at
    BEFORE UPDATE ON risk_scoring_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. GEOHASH UTILITY — Pure SQL, no PostGIS dependency
-- ============================================================================
CREATE OR REPLACE FUNCTION encode_geohash(
    p_latitude  NUMERIC,
    p_longitude NUMERIC,
    p_precision INTEGER DEFAULT 5
) RETURNS TEXT AS $$
DECLARE
    v_base32 TEXT := '0123456789bcdefghjkmnpqrstuvwxyz';
    v_lat_min NUMERIC := -90.0;
    v_lat_max NUMERIC := 90.0;
    v_lon_min NUMERIC := -180.0;
    v_lon_max NUMERIC := 180.0;
    v_mid     NUMERIC;
    v_hash    TEXT := '';
    v_bits    INTEGER := 0;
    v_char_idx INTEGER := 0;
    v_is_lon  BOOLEAN := true;
    v_total_bits INTEGER;
BEGIN
    v_total_bits := p_precision * 5;
    FOR i IN 1..v_total_bits LOOP
        IF v_is_lon THEN
            v_mid := (v_lon_min + v_lon_max) / 2.0;
            IF p_longitude >= v_mid THEN
                v_char_idx := v_char_idx * 2 + 1;
                v_lon_min := v_mid;
            ELSE
                v_char_idx := v_char_idx * 2;
                v_lon_max := v_mid;
            END IF;
        ELSE
            v_mid := (v_lat_min + v_lat_max) / 2.0;
            IF p_latitude >= v_mid THEN
                v_char_idx := v_char_idx * 2 + 1;
                v_lat_min := v_mid;
            ELSE
                v_char_idx := v_char_idx * 2;
                v_lat_max := v_mid;
            END IF;
        END IF;
        v_is_lon := NOT v_is_lon;
        v_bits := v_bits + 1;

        IF v_bits = 5 THEN
            v_hash := v_hash || SUBSTRING(v_base32 FROM (v_char_idx + 1) FOR 1);
            v_bits := 0;
            v_char_idx := 0;
        END IF;
    END LOOP;

    RETURN v_hash;
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT;

-- ============================================================================
-- 6. INCREMENTAL RISK SCORING FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION fn_incremental_risk_update(p_zone_id TEXT)
RETURNS VOID AS $$
DECLARE
    v_config          risk_scoring_config%ROWTYPE;
    v_report_count    INTEGER;
    v_unresolved      INTEGER;
    v_severity_sum    NUMERIC;
    v_last_report_at  TIMESTAMPTZ;
    v_last_cleanup_at TIMESTAMPTZ;
    v_cat_counts      JSONB;
    v_dominant_cat    waste_category;
    v_hours_since     NUMERIC;
    -- normalized inputs
    v_density_norm    NUMERIC;
    v_severity_norm   NUMERIC;
    v_recency_norm    NUMERIC;
    v_unresolved_norm NUMERIC;
    v_risk_score      NUMERIC;
    v_risk_level      TEXT;
    v_center_lat      NUMERIC;
    v_center_lon      NUMERIC;
BEGIN
    -- Load active config
    SELECT * INTO v_config FROM risk_scoring_config WHERE is_active = true LIMIT 1;
    IF NOT FOUND THEN
        RETURN; -- no config, skip
    END IF;

    -- Aggregate reports in this zone
    SELECT
        COUNT(*),
        COUNT(*) FILTER (WHERE status IN ('pending', 'assigned', 'in_progress')),
        COALESCE(
            SUM(
                CASE COALESCE(confirmed_class, predicted_class, 'mixed')
                    WHEN 'plastic'   THEN v_config.severity_plastic
                    WHEN 'metal'     THEN v_config.severity_metal
                    WHEN 'glass'     THEN v_config.severity_glass
                    WHEN 'cardboard' THEN v_config.severity_cardboard
                    WHEN 'paper'     THEN v_config.severity_paper
                    WHEN 'organic'   THEN v_config.severity_organic
                    WHEN 'mixed'     THEN v_config.severity_mixed
                    ELSE v_config.severity_mixed
                END
            ), 0
        ),
        MAX(created_at),
        MAX(completed_at) FILTER (WHERE status = 'completed'),
        AVG(latitude),
        AVG(longitude)
    INTO
        v_report_count,
        v_unresolved,
        v_severity_sum,
        v_last_report_at,
        v_last_cleanup_at,
        v_center_lat,
        v_center_lon
    FROM waste_reports
    WHERE encode_geohash(latitude, longitude, 5) = p_zone_id;

    -- If no reports in this zone, clean up
    IF v_report_count = 0 THEN
        DELETE FROM area_risk_zones WHERE zone_id = p_zone_id;
        RETURN;
    END IF;

    -- Find dominant category
    SELECT cat INTO v_dominant_cat
    FROM (
        SELECT COALESCE(confirmed_class, predicted_class, 'mixed') AS cat, COUNT(*) AS cnt
        FROM waste_reports
        WHERE encode_geohash(latitude, longitude, 5) = p_zone_id
        GROUP BY cat
        ORDER BY cnt DESC
        LIMIT 1
    ) sub;

    -- Normalize inputs (0–1 scale)
    v_density_norm    := LEAST(v_report_count / 20.0, 1.0);
    v_severity_norm   := LEAST(v_severity_sum / (v_report_count * 5.0), 1.0);
    v_hours_since     := GREATEST(EXTRACT(EPOCH FROM (NOW() - v_last_report_at)) / 3600.0, 0);
    v_recency_norm    := EXP(-v_hours_since / 168.0);  -- 7-day exponential decay
    v_unresolved_norm := LEAST(v_unresolved / 10.0, 1.0);

    -- Weighted risk score (0–100)
    v_risk_score := (
        v_config.weight_density    * v_density_norm    +
        v_config.weight_severity   * v_severity_norm   +
        v_config.weight_recency    * v_recency_norm    +
        v_config.weight_unresolved * v_unresolved_norm
    ) * 100.0;

    v_risk_score := ROUND(LEAST(GREATEST(v_risk_score, 0), 100), 2);

    -- Determine level
    v_risk_level := CASE
        WHEN v_risk_score >= 80 THEN 'critical'
        WHEN v_risk_score >= 60 THEN 'high'
        WHEN v_risk_score >= 30 THEN 'medium'
        ELSE 'low'
    END;

    -- Upsert into area_risk_zones
    INSERT INTO area_risk_zones (
        zone_id, risk_score, risk_level, report_count, unresolved_count,
        dominant_category, severity_index, last_cleanup_at, last_report_at,
        latitude, longitude, metadata
    ) VALUES (
        p_zone_id, v_risk_score, v_risk_level, v_report_count, v_unresolved,
        v_dominant_cat, ROUND(v_severity_sum / GREATEST(v_report_count, 1), 3),
        v_last_cleanup_at, v_last_report_at,
        v_center_lat, v_center_lon,
        jsonb_build_object(
            'density_norm', ROUND(v_density_norm, 4),
            'severity_norm', ROUND(v_severity_norm, 4),
            'recency_norm', ROUND(v_recency_norm, 4),
            'unresolved_norm', ROUND(v_unresolved_norm, 4)
        )
    )
    ON CONFLICT (zone_id) DO UPDATE SET
        risk_score       = EXCLUDED.risk_score,
        risk_level       = EXCLUDED.risk_level,
        report_count     = EXCLUDED.report_count,
        unresolved_count = EXCLUDED.unresolved_count,
        dominant_category = EXCLUDED.dominant_category,
        severity_index   = EXCLUDED.severity_index,
        last_cleanup_at  = EXCLUDED.last_cleanup_at,
        last_report_at   = EXCLUDED.last_report_at,
        latitude         = EXCLUDED.latitude,
        longitude        = EXCLUDED.longitude,
        metadata         = EXCLUDED.metadata;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. DB TRIGGER — Incremental risk update on report changes
-- ============================================================================
CREATE OR REPLACE FUNCTION trigger_risk_update_on_report()
RETURNS TRIGGER AS $$
DECLARE
    v_zone_id TEXT;
BEGIN
    v_zone_id := encode_geohash(NEW.latitude, NEW.longitude, 5);
    PERFORM fn_incremental_risk_update(v_zone_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_waste_report_inserted_risk
    AFTER INSERT ON waste_reports
    FOR EACH ROW
    EXECUTE FUNCTION trigger_risk_update_on_report();

CREATE TRIGGER on_waste_report_status_changed_risk
    AFTER UPDATE OF status ON waste_reports
    FOR EACH ROW
    EXECUTE FUNCTION trigger_risk_update_on_report();

-- ============================================================================
-- 8. RLS POLICIES
-- ============================================================================
ALTER TABLE area_risk_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_scoring_config ENABLE ROW LEVEL SECURITY;

-- Risk zones: readable by all authenticated users
CREATE POLICY "Authenticated users can view risk zones"
    ON area_risk_zones FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Government data: readable by all authenticated
CREATE POLICY "Authenticated users can view benchmarks"
    ON government_benchmarks FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Risk config: admins only for read, service role for writes
CREATE POLICY "Authenticated users can view risk config"
    ON risk_scoring_config FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- 9. ENABLE REALTIME on area_risk_zones
-- ============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE area_risk_zones;
