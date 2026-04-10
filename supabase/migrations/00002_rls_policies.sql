-- ============================================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- Copy-paste this after running 00001_initial_schema.sql
-- ============================================================================

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE neighborhoods ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE collector_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTIONS FOR RLS (in public schema)
-- ============================================================================

-- Get current user's neighborhood_id
CREATE OR REPLACE FUNCTION public.get_my_neighborhood_id()
RETURNS UUID AS $$
  SELECT neighborhood_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Get current user's role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Check if user is collector
CREATE OR REPLACE FUNCTION public.is_collector()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'collector');
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================================
-- NEIGHBORHOODS POLICIES
-- ============================================================================

-- Everyone can read active neighborhoods (for signup flow)
CREATE POLICY "neighborhoods_select_active"
  ON neighborhoods FOR SELECT
  USING (is_active = true);

-- Only admins can insert/update/delete neighborhoods
CREATE POLICY "neighborhoods_admin_all"
  ON neighborhoods FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

-- Users can read their own profile
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (id = auth.uid());

-- Users can read profiles in their neighborhood (for leaderboards, etc.)
CREATE POLICY "profiles_select_neighborhood"
  ON profiles FOR SELECT
  USING (neighborhood_id = public.get_my_neighborhood_id());

-- Users can update their own profile (limited fields)
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND
    -- Prevent role escalation
    (role = (SELECT role FROM profiles WHERE id = auth.uid()))
  );

-- Admins can update any profile in their neighborhood
CREATE POLICY "profiles_admin_update"
  ON profiles FOR UPDATE
  USING (
    public.is_admin() AND 
    neighborhood_id = public.get_my_neighborhood_id()
  );

-- Service role can insert (for signup trigger)
-- This is handled by SECURITY DEFINER on the trigger function

-- ============================================================================
-- WASTE_REPORTS POLICIES
-- ============================================================================

-- Users can read reports in their neighborhood
CREATE POLICY "reports_select_neighborhood"
  ON waste_reports FOR SELECT
  USING (neighborhood_id = public.get_my_neighborhood_id());

-- Residents can create reports in their neighborhood
CREATE POLICY "reports_insert_resident"
  ON waste_reports FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    neighborhood_id = public.get_my_neighborhood_id()
  );

-- Collectors can update reports assigned to them
CREATE POLICY "reports_update_collector"
  ON waste_reports FOR UPDATE
  USING (
    public.is_collector() AND 
    assigned_to = auth.uid()
  )
  WITH CHECK (
    assigned_to = auth.uid()
  );

-- Admins can update any report in their neighborhood
CREATE POLICY "reports_admin_update"
  ON waste_reports FOR UPDATE
  USING (
    public.is_admin() AND 
    neighborhood_id = public.get_my_neighborhood_id()
  );

-- Users can update their own pending reports (cancel, edit)
CREATE POLICY "reports_update_own_pending"
  ON waste_reports FOR UPDATE
  USING (
    user_id = auth.uid() AND 
    status = 'pending'
  )
  WITH CHECK (
    user_id = auth.uid()
  );

-- ============================================================================
-- REPORT_EVENTS POLICIES (Audit Trail - Read-only for users)
-- ============================================================================

-- Users can read events for reports they can see
CREATE POLICY "report_events_select"
  ON report_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM waste_reports wr 
      WHERE wr.id = report_events.report_id 
      AND wr.neighborhood_id = public.get_my_neighborhood_id()
    )
  );

-- Insert is handled by SECURITY DEFINER functions only
-- No direct insert policy for users

-- ============================================================================
-- COLLECTOR_CLAIMS POLICIES
-- ============================================================================

-- Collectors can see their own claims
CREATE POLICY "claims_select_own"
  ON collector_claims FOR SELECT
  USING (collector_id = auth.uid());

-- Admins can see all claims in their neighborhood
CREATE POLICY "claims_admin_select"
  ON collector_claims FOR SELECT
  USING (
    public.is_admin() AND
    EXISTS (
      SELECT 1 FROM waste_reports wr
      WHERE wr.id = collector_claims.report_id
      AND wr.neighborhood_id = public.get_my_neighborhood_id()
    )
  );

-- Insert/update handled by claim_report and complete_report functions

-- ============================================================================
-- POINTS_LEDGER POLICIES
-- ============================================================================

-- Users can read their own points history
CREATE POLICY "points_select_own"
  ON points_ledger FOR SELECT
  USING (user_id = auth.uid());

-- Admins can see all points in their neighborhood
CREATE POLICY "points_admin_select"
  ON points_ledger FOR SELECT
  USING (
    public.is_admin() AND
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = points_ledger.user_id
      AND p.neighborhood_id = public.get_my_neighborhood_id()
    )
  );

-- No direct insert - handled by award_points function

-- ============================================================================
-- CHALLENGES POLICIES
-- ============================================================================

-- Users can see active challenges (global or their neighborhood)
CREATE POLICY "challenges_select_active"
  ON challenges FOR SELECT
  USING (
    status = 'active' AND
    (neighborhood_id IS NULL OR neighborhood_id = public.get_my_neighborhood_id())
  );

-- Admins can see all challenges for their neighborhood
CREATE POLICY "challenges_admin_select"
  ON challenges FOR SELECT
  USING (
    public.is_admin() AND
    (neighborhood_id IS NULL OR neighborhood_id = public.get_my_neighborhood_id())
  );

-- Admins can manage challenges for their neighborhood
CREATE POLICY "challenges_admin_insert"
  ON challenges FOR INSERT
  WITH CHECK (
    public.is_admin() AND
    (neighborhood_id IS NULL OR neighborhood_id = public.get_my_neighborhood_id())
  );

CREATE POLICY "challenges_admin_update"
  ON challenges FOR UPDATE
  USING (
    public.is_admin() AND
    (neighborhood_id IS NULL OR neighborhood_id = public.get_my_neighborhood_id())
  );

CREATE POLICY "challenges_admin_delete"
  ON challenges FOR DELETE
  USING (
    public.is_admin() AND
    (neighborhood_id IS NULL OR neighborhood_id = public.get_my_neighborhood_id())
  );

-- ============================================================================
-- CHALLENGE_PARTICIPANTS POLICIES
-- ============================================================================

-- Users can see their own participation
CREATE POLICY "challenge_participants_select_own"
  ON challenge_participants FOR SELECT
  USING (user_id = auth.uid());

-- Users can see other participants in challenges they're in (for competition)
CREATE POLICY "challenge_participants_select_same_challenge"
  ON challenge_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM challenge_participants cp
      WHERE cp.challenge_id = challenge_participants.challenge_id
      AND cp.user_id = auth.uid()
    )
  );

-- Users can join visible challenges
CREATE POLICY "challenge_participants_insert"
  ON challenge_participants FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM challenges c
      WHERE c.id = challenge_participants.challenge_id
      AND c.status = 'active'
      AND (c.neighborhood_id IS NULL OR c.neighborhood_id = public.get_my_neighborhood_id())
    )
  );

-- Update handled by functions

-- ============================================================================
-- BADGES POLICIES
-- ============================================================================

-- Everyone can read active badges
CREATE POLICY "badges_select_active"
  ON badges FOR SELECT
  USING (is_active = true);

-- Admins can manage badges (global)
CREATE POLICY "badges_admin_all"
  ON badges FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ============================================================================
-- USER_BADGES POLICIES
-- ============================================================================

-- Users can see their own badges
CREATE POLICY "user_badges_select_own"
  ON user_badges FOR SELECT
  USING (user_id = auth.uid());

-- Users can see badges of others in their neighborhood (for profiles)
CREATE POLICY "user_badges_select_neighborhood"
  ON user_badges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = user_badges.user_id
      AND p.neighborhood_id = public.get_my_neighborhood_id()
    )
  );

-- Insert handled by functions only

-- ============================================================================
-- GRANT USAGE TO AUTHENTICATED USERS
-- ============================================================================

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute on safe functions
GRANT EXECUTE ON FUNCTION public.get_my_neighborhood_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_collector() TO authenticated;
GRANT EXECUTE ON FUNCTION get_neighborhood_stats(UUID) TO authenticated;
