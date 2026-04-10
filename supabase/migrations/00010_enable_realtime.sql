-- ============================================================================
-- NEIGHBORHOOD SUSTAINABILITY HUB
-- Migration 00010: Enable Realtime for Waste Reports
-- ============================================================================

-- Enable the 'waste_reports' table to broadcast row changes (inserts, updates, deletes)
-- via Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE waste_reports;
