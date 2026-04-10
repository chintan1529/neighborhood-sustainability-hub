-- ============================================================================
-- NEIGHBORHOOD LEADERBOARD VIEW
-- Aggregates neighborhood-level stats for competitive rankings
-- ============================================================================

CREATE OR REPLACE VIEW neighborhood_leaderboard_view AS
SELECT
    n.id AS neighborhood_id,
    n.name,
    n.slug,
    COUNT(DISTINCT p.id) AS active_residents,
    COALESCE(SUM(p.total_points), 0) AS total_points,
    COALESCE(SUM(p.reports_count), 0) AS total_reports,
    ROUND(COALESCE(AVG(p.total_points), 0)) AS avg_points_per_resident,
    (SELECT COUNT(*) FROM waste_reports wr 
     WHERE wr.neighborhood_id = n.id AND wr.status = 'completed') AS completed_reports,
    RANK() OVER (ORDER BY COALESCE(SUM(p.total_points), 0) DESC) AS rank
FROM neighborhoods n
LEFT JOIN profiles p ON p.neighborhood_id = n.id 
    AND p.role = 'resident' AND p.is_active = true
GROUP BY n.id, n.name, n.slug;
