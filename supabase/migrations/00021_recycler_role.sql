-- 00021_recycler_role.sql
-- Introduces 'recycler' as an independent first-class user role,
-- separated from the collector role.

-- ═══════════════════════════════════════════════════════════════
-- 1. ADD 'recycler' TO user_role ENUM
-- ═══════════════════════════════════════════════════════════════
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'recycler';

-- ═══════════════════════════════════════════════════════════════
-- 2. FIX MISSING INSERT POLICY ON recycler_profiles
--    (Previously required admin client to bypass RLS)
-- ═══════════════════════════════════════════════════════════════
CREATE POLICY "Users can create their own recycler profile"
    ON recycler_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ═══════════════════════════════════════════════════════════════
-- 3. ADD PICKUP TRACKING COLUMNS TO marketplace_transactions
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE marketplace_transactions
    ADD COLUMN IF NOT EXISTS pickup_proof_url TEXT,
    ADD COLUMN IF NOT EXISTS pickup_started_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS pickup_notes TEXT;

-- ═══════════════════════════════════════════════════════════════
-- 4. RECYCLER ANALYTICS SUMMARY VIEW (materialized for perf)
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW recycler_analytics_summary AS
SELECT
    rp.id AS recycler_id,
    rp.business_name,
    rp.verification_status,
    rp.total_rating,
    rp.review_count,
    rp.service_radius_km,
    
    -- Offer Stats
    COALESCE(offer_stats.total_offers, 0) AS total_offers,
    COALESCE(offer_stats.pending_offers, 0) AS pending_offers,
    COALESCE(offer_stats.accepted_offers, 0) AS accepted_offers,
    
    -- Transaction Stats
    COALESCE(tx_stats.total_transactions, 0) AS total_transactions,
    COALESCE(tx_stats.completed_transactions, 0) AS completed_transactions,
    COALESCE(tx_stats.total_earnings, 0.0) AS total_earnings,
    COALESCE(tx_stats.monthly_earnings, 0.0) AS monthly_earnings,
    
    -- Pickup Stats
    COALESCE(tx_stats.pending_pickups, 0) AS pending_pickups,
    
    -- Trust Score (composite)
    CASE
        WHEN COALESCE(tx_stats.total_transactions, 0) = 0 THEN 0
        ELSE ROUND(
            (
                -- 40% completion rate
                (COALESCE(tx_stats.completed_transactions, 0)::NUMERIC / GREATEST(tx_stats.total_transactions, 1)) * 40 +
                -- 40% average rating (out of 5, scaled to 40)
                (COALESCE(rp.total_rating, 0) / 5.0) * 40 +
                -- 20% volume bonus (capped at 50 transactions)
                (LEAST(COALESCE(tx_stats.total_transactions, 0), 50)::NUMERIC / 50.0) * 20
            )
        )
    END AS trust_score
    
FROM recycler_profiles rp

LEFT JOIN LATERAL (
    SELECT
        COUNT(*) AS total_offers,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending_offers,
        COUNT(*) FILTER (WHERE status = 'accepted') AS accepted_offers
    FROM marketplace_offers
    WHERE recycler_id = rp.id
) offer_stats ON TRUE

LEFT JOIN LATERAL (
    SELECT
        COUNT(*) AS total_transactions,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed_transactions,
        SUM(total_estimated_price) FILTER (WHERE status = 'completed') AS total_earnings,
        SUM(total_estimated_price) FILTER (WHERE status = 'completed' AND created_at >= DATE_TRUNC('month', NOW())) AS monthly_earnings,
        COUNT(*) FILTER (WHERE status IN ('confirmed', 'picked_up')) AS pending_pickups
    FROM marketplace_transactions
    WHERE recycler_id = rp.id
) tx_stats ON TRUE;

-- ═══════════════════════════════════════════════════════════════
-- 5. NOTIFICATION TRIGGER FOR RECYCLER PICKUP UPDATES
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION notify_pickup_status_change() RETURNS TRIGGER AS $$
DECLARE
    v_listing_title TEXT;
BEGIN
    -- Only fire on status changes
    IF OLD.status = NEW.status THEN RETURN NEW; END IF;

    SELECT title INTO v_listing_title
    FROM marketplace_listings WHERE id = NEW.listing_id;

    -- Notify resident when recycler starts pickup
    IF NEW.status = 'picked_up' AND OLD.status = 'confirmed' THEN
        INSERT INTO marketplace_notifications (user_id, type, title, body, reference_id)
        VALUES (
            NEW.resident_id,
            'pickup_scheduled',
            'Recycler is on the way! 🚛',
            'Your listing "' || v_listing_title || '" is being picked up now.',
            NEW.listing_id
        );
    END IF;

    -- Notify both when transaction completes
    IF NEW.status = 'completed' THEN
        INSERT INTO marketplace_notifications (user_id, type, title, body, reference_id)
        VALUES (
            NEW.resident_id,
            'transaction_completed',
            'Transaction Complete! 🎉',
            'Your listing "' || v_listing_title || '" has been picked up and paid for.',
            NEW.listing_id
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_transaction_status_change ON marketplace_transactions;
CREATE TRIGGER on_transaction_status_change
AFTER UPDATE ON marketplace_transactions
FOR EACH ROW EXECUTE FUNCTION notify_pickup_status_change();
