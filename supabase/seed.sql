-- ============================================================================
-- SEED DATA FOR DEMO/TESTING
-- ============================================================================
-- 
-- IMPORTANT: This version does NOT create auth users directly.
-- You must first create test users via Supabase Dashboard or Auth API.
--
-- SETUP STEPS:
-- 1. Go to Supabase Dashboard → Authentication → Users → Add User
-- 2. Create 6 users with emails below (password: password123)
-- 3. Copy each user's UUID and replace the placeholders below
-- 4. Then run this script in SQL Editor
--
-- ============================================================================

-- ============================================================================
-- 1. CREATE NEIGHBORHOOD
-- ============================================================================

INSERT INTO neighborhoods (id, name, slug, description, city, state, pincode, latitude, longitude, settings)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Green Valley Apartments',
  'green-valley',
  'A sustainable community committed to responsible waste management. Located in Koramangala, Bangalore.',
  'Bangalore',
  'Karnataka',
  '560034',
  12.9352,
  77.6245,
  '{
    "max_active_reports_per_user": 5,
    "points_per_report": 10,
    "streak_bonus_multiplier": 1.5,
    "sla_hours": 24,
    "enable_ai_classification": true
  }'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. CREATE BADGES
-- ============================================================================

INSERT INTO badges (id, name, slug, description, icon_url, color, requirements, points_reward, tier) VALUES
(
  'b0000001-0000-0000-0000-000000000001',
  'First Steps',
  'first-steps',
  'Submit your first waste report',
  '/badges/first-steps.png',
  '#10B981',
  '{"type": "reports_count", "threshold": 1}'::jsonb,
  10,
  1
),
(
  'b0000002-0000-0000-0000-000000000002',
  'Eco Warrior',
  'eco-warrior',
  'Submit 10 waste reports',
  '/badges/eco-warrior.png',
  '#3B82F6',
  '{"type": "reports_count", "threshold": 10}'::jsonb,
  25,
  2
),
(
  'b0000003-0000-0000-0000-000000000003',
  'Streak Master',
  'streak-master',
  'Maintain a 7-day reporting streak',
  '/badges/streak-master.png',
  '#F59E0B',
  '{"type": "streak", "threshold": 7}'::jsonb,
  50,
  3
),
(
  'b0000004-0000-0000-0000-000000000004',
  'Plastic Fighter',
  'plastic-fighter',
  'Report 5 plastic waste items',
  '/badges/plastic-fighter.png',
  '#EF4444',
  '{"type": "category_count", "category": "plastic", "threshold": 5}'::jsonb,
  30,
  2
),
(
  'b0000005-0000-0000-0000-000000000005',
  'Community Champion',
  'community-champion',
  'Reach top 3 on the weekly leaderboard',
  '/badges/community-champion.png',
  '#8B5CF6',
  '{"type": "leaderboard_rank", "threshold": 3}'::jsonb,
  100,
  4
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. CREATE CHALLENGES
-- ============================================================================

INSERT INTO challenges (id, neighborhood_id, title, description, type, status, target_count, target_category, reward_points, starts_at, ends_at) VALUES
(
  'c0000001-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'Plastic Free Week',
  'Report 5 plastic waste items this week!',
  'weekly',
  'active',
  5,
  'plastic',
  50,
  NOW() - INTERVAL '2 days',
  NOW() + INTERVAL '5 days'
),
(
  'c0000002-0000-0000-0000-000000000002',
  NULL,
  'January Clean-Up Drive',
  'Report 20 waste items this month. Together we can make a difference!',
  'monthly',
  'active',
  20,
  NULL,
  100,
  DATE_TRUNC('month', NOW()),
  DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 second'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SEED DATA COMPLETE (Part 1)
-- ============================================================================
-- 
-- At this point, you have:
-- ✅ 1 Neighborhood
-- ✅ 5 Badges  
-- ✅ 2 Challenges
--
-- NEXT STEPS:
-- 1. Create test users in Supabase Auth Dashboard:
--    - resident1@greenvalley.com (resident)
--    - resident2@greenvalley.com (resident)
--    - resident3@greenvalley.com (resident)
--    - collector1@greenvalley.com (collector)
--    - collector2@greenvalley.com (collector)
--    - admin@greenvalley.com (admin)
--
-- 2. The handle_new_user trigger will automatically create profiles
--    with role='resident'. You'll need to update roles manually:
--
--    UPDATE profiles SET role = 'collector', neighborhood_id = '11111111-1111-1111-1111-111111111111'
--    WHERE id = '<collector-uuid>';
--
--    UPDATE profiles SET role = 'admin', neighborhood_id = '11111111-1111-1111-1111-111111111111'
--    WHERE id = '<admin-uuid>';
--
-- ============================================================================
