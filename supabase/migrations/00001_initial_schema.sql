-- ============================================================================
-- NEIGHBORHOOD SUSTAINABILITY HUB - COMPLETE DATABASE SCHEMA
-- Copy-paste this entire file into Supabase SQL Editor and run
-- ============================================================================

-- ============================================================================
-- PART 1: EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- ============================================================================
-- PART 2: CUSTOM TYPES (ENUMS)
-- ============================================================================

-- User roles
CREATE TYPE user_role AS ENUM ('resident', 'collector', 'admin');

-- Waste categories (7 classes for AI classification)
CREATE TYPE waste_category AS ENUM (
  'cardboard',
  'metal', 
  'paper',
  'plastic',
  'glass',
  'organic',
  'mixed'
);

-- Report status lifecycle
CREATE TYPE report_status AS ENUM (
  'pending',      -- Just created, awaiting collector
  'assigned',     -- Collector claimed
  'in_progress',  -- Collector en route
  'completed',    -- Picked up and verified
  'cancelled'     -- Cancelled by user or admin
);

-- Points transaction reasons
CREATE TYPE points_reason AS ENUM (
  'report_created',
  'correct_segregation',
  'streak_bonus',
  'challenge_completed',
  'badge_earned',
  'admin_adjustment',
  'referral_bonus'
);

-- Challenge types
CREATE TYPE challenge_type AS ENUM (
  'weekly',
  'monthly',
  'special'
);

-- Challenge status
CREATE TYPE challenge_status AS ENUM (
  'draft',
  'active',
  'completed',
  'cancelled'
);

-- ============================================================================
-- PART 3: CORE TABLES
-- ============================================================================

-- -----------------------------------------------------------------------------
-- NEIGHBORHOODS (Multi-tenant base)
-- -----------------------------------------------------------------------------
CREATE TABLE neighborhoods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  address TEXT,
  city VARCHAR(100) NOT NULL DEFAULT 'Bangalore',
  state VARCHAR(100) NOT NULL DEFAULT 'Karnataka',
  pincode VARCHAR(10),
  
  -- Geolocation for map centering
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  -- Settings (JSON for flexibility)
  settings JSONB DEFAULT '{
    "max_active_reports_per_user": 5,
    "points_per_report": 10,
    "streak_bonus_multiplier": 1.5,
    "sla_hours": 24,
    "enable_ai_classification": true
  }'::jsonb,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for slug lookup
CREATE INDEX idx_neighborhoods_slug ON neighborhoods(slug);

-- -----------------------------------------------------------------------------
-- PROFILES (Extended user data, linked to auth.users)
-- -----------------------------------------------------------------------------
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  neighborhood_id UUID REFERENCES neighborhoods(id) ON DELETE SET NULL,
  
  -- User info
  role user_role NOT NULL DEFAULT 'resident',
  full_name VARCHAR(255),
  phone VARCHAR(20),
  avatar_url TEXT,
  
  -- Gamification stats (denormalized for performance)
  total_points INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_report_date DATE,
  reports_count INTEGER DEFAULT 0,
  
  -- Collector-specific
  is_available BOOLEAN DEFAULT true, -- For collectors: accepting jobs?
  active_claim_id UUID, -- Current active claim (enforces 1 at a time)
  
  -- Preferences
  notification_preferences JSONB DEFAULT '{
    "email": true,
    "push": true,
    "sms": false
  }'::jsonb,
  
  -- Status
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_profiles_neighborhood ON profiles(neighborhood_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_points ON profiles(total_points DESC);

-- -----------------------------------------------------------------------------
-- WASTE REPORTS (Core entity)
-- -----------------------------------------------------------------------------
CREATE TABLE waste_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Ownership
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  neighborhood_id UUID NOT NULL REFERENCES neighborhoods(id) ON DELETE CASCADE,
  
  -- Status
  status report_status DEFAULT 'pending',
  
  -- Classification
  predicted_class waste_category, -- AI prediction
  confirmed_class waste_category, -- User confirmed
  prediction_confidence DECIMAL(5, 4), -- 0.0000 to 1.0000
  ai_available BOOLEAN DEFAULT true, -- Was AI used?
  
  -- Media
  photo_url TEXT NOT NULL,
  photo_path TEXT, -- Storage path for deletion
  completion_photo_url TEXT, -- Collector's proof photo
  completion_photo_path TEXT,
  
  -- Location
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address_text TEXT, -- Reverse geocoded or manual
  landmark TEXT,
  
  -- User input
  notes TEXT,
  quantity_estimate VARCHAR(50), -- e.g., "1 bag", "2-3 items"
  
  -- Collector assignment
  assigned_to UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ,
  
  -- Completion
  completed_at TIMESTAMPTZ,
  completion_notes TEXT,
  
  -- Points awarded
  points_awarded INTEGER DEFAULT 0,
  
  -- Idempotency
  idempotency_key VARCHAR(255) UNIQUE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_reports_user ON waste_reports(user_id);
CREATE INDEX idx_reports_neighborhood ON waste_reports(neighborhood_id);
CREATE INDEX idx_reports_status ON waste_reports(status);
CREATE INDEX idx_reports_assigned ON waste_reports(assigned_to);
CREATE INDEX idx_reports_created ON waste_reports(created_at DESC);
CREATE INDEX idx_reports_location ON waste_reports(latitude, longitude);

-- Composite index for neighborhood + status queries
CREATE INDEX idx_reports_neighborhood_status ON waste_reports(neighborhood_id, status);

-- -----------------------------------------------------------------------------
-- REPORT EVENTS (Immutable audit trail)
-- -----------------------------------------------------------------------------
CREATE TABLE report_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES waste_reports(id) ON DELETE CASCADE,
  
  -- Event details
  event_type VARCHAR(50) NOT NULL, -- 'created', 'claimed', 'status_changed', 'completed', 'cancelled'
  previous_status report_status,
  new_status report_status,
  
  -- Actor
  actor_id UUID REFERENCES profiles(id),
  actor_role user_role,
  
  -- Additional data
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamp (immutable)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for report history
CREATE INDEX idx_report_events_report ON report_events(report_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- COLLECTOR CLAIMS (Job assignments)
-- -----------------------------------------------------------------------------
CREATE TABLE collector_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID NOT NULL REFERENCES waste_reports(id) ON DELETE CASCADE,
  collector_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Timestamps
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ, -- When collector marked "in_progress"
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Cancellation reason
  cancellation_reason TEXT,
  
  -- Idempotency
  idempotency_key VARCHAR(255) UNIQUE,
  
  -- Metadata (e.g., route info, distance)
  metadata JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_claims_report ON collector_claims(report_id);
CREATE INDEX idx_claims_collector ON collector_claims(collector_id);
CREATE INDEX idx_claims_active ON collector_claims(collector_id, is_active) WHERE is_active = true;

-- Unique constraint: one active claim per report
CREATE UNIQUE INDEX idx_claims_unique_active ON collector_claims(report_id) WHERE is_active = true;

-- -----------------------------------------------------------------------------
-- POINTS LEDGER (Transactional point system)
-- -----------------------------------------------------------------------------
CREATE TABLE points_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Transaction details
  points INTEGER NOT NULL, -- Can be negative for deductions
  reason points_reason NOT NULL,
  description TEXT,
  
  -- Reference
  reference_id UUID, -- report_id, challenge_id, etc.
  reference_type VARCHAR(50), -- 'report', 'challenge', 'badge'
  
  -- Running balance (for auditing)
  balance_after INTEGER,
  
  -- Anti-cheat
  validated BOOLEAN DEFAULT true,
  validation_notes TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamp (immutable)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_points_user ON points_ledger(user_id, created_at DESC);
CREATE INDEX idx_points_reference ON points_ledger(reference_id);

-- -----------------------------------------------------------------------------
-- CHALLENGES (Gamification)
-- -----------------------------------------------------------------------------
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  neighborhood_id UUID REFERENCES neighborhoods(id) ON DELETE CASCADE, -- NULL = global
  
  -- Challenge info
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type challenge_type NOT NULL DEFAULT 'weekly',
  status challenge_status DEFAULT 'draft',
  
  -- Goals
  target_count INTEGER NOT NULL DEFAULT 10, -- e.g., 10 reports
  target_category waste_category, -- NULL = any category
  
  -- Rewards
  reward_points INTEGER NOT NULL DEFAULT 50,
  reward_badge_id UUID, -- Optional badge reward
  
  -- Duration
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  
  -- Limits
  max_participants INTEGER, -- NULL = unlimited
  
  -- Display
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  
  -- Metadata
  rules JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_challenges_neighborhood ON challenges(neighborhood_id);
CREATE INDEX idx_challenges_status ON challenges(status);
CREATE INDEX idx_challenges_dates ON challenges(starts_at, ends_at);

-- -----------------------------------------------------------------------------
-- CHALLENGE PARTICIPANTS
-- -----------------------------------------------------------------------------
CREATE TABLE challenge_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Progress
  current_count INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  
  -- Rewards
  points_awarded INTEGER DEFAULT 0,
  badge_awarded BOOLEAN DEFAULT false,
  
  -- Timestamps
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint
  UNIQUE(challenge_id, user_id)
);

-- Indexes
CREATE INDEX idx_challenge_participants_user ON challenge_participants(user_id);
CREATE INDEX idx_challenge_participants_challenge ON challenge_participants(challenge_id);

-- -----------------------------------------------------------------------------
-- BADGES (Achievement definitions)
-- -----------------------------------------------------------------------------
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Badge info
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  
  -- Display
  icon_url TEXT,
  color VARCHAR(20) DEFAULT '#10B981', -- Emerald green
  
  -- Requirements (flexible JSON)
  requirements JSONB NOT NULL DEFAULT '{
    "type": "reports_count",
    "threshold": 10
  }'::jsonb,
  
  -- Rewards
  points_reward INTEGER DEFAULT 25,
  
  -- Rarity/tier
  tier INTEGER DEFAULT 1, -- 1=common, 2=uncommon, 3=rare, 4=epic, 5=legendary
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Display order
  sort_order INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_badges_slug ON badges(slug);

-- -----------------------------------------------------------------------------
-- USER BADGES (Awarded badges)
-- -----------------------------------------------------------------------------
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  
  -- Award details
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  awarded_by UUID REFERENCES profiles(id), -- NULL = system
  
  -- Points
  points_awarded INTEGER DEFAULT 0,
  
  -- Unique constraint
  UNIQUE(user_id, badge_id)
);

-- Indexes
CREATE INDEX idx_user_badges_user ON user_badges(user_id);
CREATE INDEX idx_user_badges_badge ON user_badges(badge_id);

-- ============================================================================
-- PART 4: VIEWS
-- ============================================================================

-- -----------------------------------------------------------------------------
-- LEADERBOARD VIEW (Top users by points per neighborhood)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW leaderboard_view AS
SELECT 
  p.id AS user_id,
  p.full_name,
  p.avatar_url,
  p.neighborhood_id,
  n.name AS neighborhood_name,
  p.total_points,
  p.current_streak,
  p.reports_count,
  (SELECT COUNT(*) FROM user_badges ub WHERE ub.user_id = p.id) AS badges_count,
  RANK() OVER (PARTITION BY p.neighborhood_id ORDER BY p.total_points DESC) AS rank
FROM profiles p
JOIN neighborhoods n ON p.neighborhood_id = n.id
WHERE p.role = 'resident' AND p.is_active = true
ORDER BY p.neighborhood_id, p.total_points DESC;

-- -----------------------------------------------------------------------------
-- DAILY STATS VIEW (For admin dashboard)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW daily_stats_view AS
SELECT 
  wr.neighborhood_id,
  DATE(wr.created_at) AS report_date,
  COUNT(*) AS total_reports,
  COUNT(*) FILTER (WHERE wr.status = 'completed') AS completed_reports,
  COUNT(*) FILTER (WHERE wr.status = 'pending') AS pending_reports,
  COUNT(*) FILTER (WHERE wr.ai_available = true) AS ai_classified,
  AVG(
    CASE WHEN wr.completed_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (wr.completed_at - wr.created_at)) / 3600 
    END
  ) AS avg_completion_hours,
  COUNT(*) FILTER (WHERE wr.confirmed_class = wr.predicted_class AND wr.predicted_class IS NOT NULL) AS correct_predictions
FROM waste_reports wr
GROUP BY wr.neighborhood_id, DATE(wr.created_at);

-- -----------------------------------------------------------------------------
-- CATEGORY DISTRIBUTION VIEW
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW category_distribution_view AS
SELECT 
  neighborhood_id,
  COALESCE(confirmed_class, predicted_class) AS category,
  COUNT(*) AS report_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY neighborhood_id), 2) AS percentage
FROM waste_reports
WHERE status != 'cancelled'
GROUP BY neighborhood_id, COALESCE(confirmed_class, predicted_class);

-- ============================================================================
-- PART 5: FUNCTIONS
-- ============================================================================

-- -----------------------------------------------------------------------------
-- AUTO-UPDATE updated_at TRIGGER
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at
CREATE TRIGGER update_neighborhoods_updated_at
  BEFORE UPDATE ON neighborhoods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_waste_reports_updated_at
  BEFORE UPDATE ON waste_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_challenges_updated_at
  BEFORE UPDATE ON challenges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_badges_updated_at
  BEFORE UPDATE ON badges
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- CREATE PROFILE ON USER SIGNUP
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- -----------------------------------------------------------------------------
-- UPDATE USER STREAK
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_last_report DATE;
  v_today DATE := CURRENT_DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
BEGIN
  SELECT last_report_date, current_streak, longest_streak
  INTO v_last_report, v_current_streak, v_longest_streak
  FROM profiles WHERE id = p_user_id;
  
  IF v_last_report IS NULL OR v_last_report < v_today - INTERVAL '1 day' THEN
    -- Streak broken or first report
    v_current_streak := 1;
  ELSIF v_last_report = v_today - INTERVAL '1 day' THEN
    -- Consecutive day
    v_current_streak := v_current_streak + 1;
  END IF;
  -- If same day, don't increment
  
  -- Update longest streak
  IF v_current_streak > v_longest_streak THEN
    v_longest_streak := v_current_streak;
  END IF;
  
  UPDATE profiles 
  SET 
    current_streak = v_current_streak,
    longest_streak = v_longest_streak,
    last_report_date = v_today,
    reports_count = reports_count + 1
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- AWARD POINTS (with ledger)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION award_points(
  p_user_id UUID,
  p_points INTEGER,
  p_reason points_reason,
  p_description TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type VARCHAR(50) DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_new_balance INTEGER;
  v_ledger_id UUID;
BEGIN
  -- Update total points
  UPDATE profiles 
  SET total_points = total_points + p_points
  WHERE id = p_user_id
  RETURNING total_points INTO v_new_balance;
  
  -- Insert ledger entry
  INSERT INTO points_ledger (
    user_id, points, reason, description, 
    reference_id, reference_type, balance_after
  )
  VALUES (
    p_user_id, p_points, p_reason, p_description,
    p_reference_id, p_reference_type, v_new_balance
  )
  RETURNING id INTO v_ledger_id;
  
  RETURN v_ledger_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- CLAIM REPORT (with locking)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION claim_report(
  p_report_id UUID,
  p_collector_id UUID,
  p_idempotency_key VARCHAR(255)
)
RETURNS JSONB AS $$
DECLARE
  v_report waste_reports%ROWTYPE;
  v_collector profiles%ROWTYPE;
  v_existing_claim collector_claims%ROWTYPE;
  v_claim_id UUID;
BEGIN
  -- Check idempotency
  SELECT * INTO v_existing_claim 
  FROM collector_claims 
  WHERE idempotency_key = p_idempotency_key;
  
  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'claim_id', v_existing_claim.id,
      'message', 'Claim already exists (idempotent)'
    );
  END IF;
  
  -- Lock and get report
  SELECT * INTO v_report 
  FROM waste_reports 
  WHERE id = p_report_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Report not found');
  END IF;
  
  IF v_report.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Report is not available for claiming');
  END IF;
  
  -- Check collector
  SELECT * INTO v_collector FROM profiles WHERE id = p_collector_id FOR UPDATE;
  
  IF v_collector.role != 'collector' THEN
    RETURN jsonb_build_object('success', false, 'error', 'User is not a collector');
  END IF;
  
  IF v_collector.active_claim_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Collector already has an active claim');
  END IF;
  
  IF v_collector.neighborhood_id != v_report.neighborhood_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Report is not in collector neighborhood');
  END IF;
  
  -- Create claim
  INSERT INTO collector_claims (report_id, collector_id, idempotency_key)
  VALUES (p_report_id, p_collector_id, p_idempotency_key)
  RETURNING id INTO v_claim_id;
  
  -- Update report
  UPDATE waste_reports 
  SET status = 'assigned', assigned_to = p_collector_id, assigned_at = NOW()
  WHERE id = p_report_id;
  
  -- Update collector active claim
  UPDATE profiles SET active_claim_id = v_claim_id WHERE id = p_collector_id;
  
  -- Create audit event
  INSERT INTO report_events (report_id, event_type, previous_status, new_status, actor_id, actor_role)
  VALUES (p_report_id, 'claimed', 'pending', 'assigned', p_collector_id, 'collector');
  
  RETURN jsonb_build_object(
    'success', true,
    'claim_id', v_claim_id,
    'message', 'Report claimed successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- COMPLETE REPORT
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION complete_report(
  p_report_id UUID,
  p_collector_id UUID,
  p_completion_photo_url TEXT,
  p_completion_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_report waste_reports%ROWTYPE;
  v_claim collector_claims%ROWTYPE;
  v_points INTEGER;
  v_neighborhood_settings JSONB;
BEGIN
  -- Get report with lock
  SELECT * INTO v_report FROM waste_reports WHERE id = p_report_id FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Report not found');
  END IF;
  
  IF v_report.assigned_to != p_collector_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Report not assigned to this collector');
  END IF;
  
  IF v_report.status NOT IN ('assigned', 'in_progress') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Report cannot be completed in current status');
  END IF;
  
  -- Get neighborhood settings for points
  SELECT settings INTO v_neighborhood_settings 
  FROM neighborhoods WHERE id = v_report.neighborhood_id;
  
  v_points := COALESCE((v_neighborhood_settings->>'points_per_report')::INTEGER, 10);
  
  -- Update report
  UPDATE waste_reports 
  SET 
    status = 'completed',
    completed_at = NOW(),
    completion_photo_url = p_completion_photo_url,
    completion_notes = p_completion_notes,
    points_awarded = v_points
  WHERE id = p_report_id;
  
  -- Update claim
  UPDATE collector_claims 
  SET completed_at = NOW(), is_active = false
  WHERE report_id = p_report_id AND collector_id = p_collector_id AND is_active = true;
  
  -- Clear collector's active claim
  UPDATE profiles SET active_claim_id = NULL WHERE id = p_collector_id;
  
  -- Award points to report creator
  PERFORM award_points(
    v_report.user_id,
    v_points,
    'report_created',
    'Waste report completed',
    p_report_id,
    'report'
  );
  
  -- Update reporter streak
  PERFORM update_user_streak(v_report.user_id);
  
  -- Create audit event
  INSERT INTO report_events (report_id, event_type, previous_status, new_status, actor_id, actor_role, notes)
  VALUES (p_report_id, 'completed', v_report.status, 'completed', p_collector_id, 'collector', p_completion_notes);
  
  RETURN jsonb_build_object(
    'success', true,
    'points_awarded', v_points,
    'message', 'Report completed successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- GET NEIGHBORHOOD STATS (for admin dashboard)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_neighborhood_stats(p_neighborhood_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_reports', (SELECT COUNT(*) FROM waste_reports WHERE neighborhood_id = p_neighborhood_id),
    'pending_reports', (SELECT COUNT(*) FROM waste_reports WHERE neighborhood_id = p_neighborhood_id AND status = 'pending'),
    'completed_today', (SELECT COUNT(*) FROM waste_reports WHERE neighborhood_id = p_neighborhood_id AND status = 'completed' AND DATE(completed_at) = CURRENT_DATE),
    'completed_this_week', (SELECT COUNT(*) FROM waste_reports WHERE neighborhood_id = p_neighborhood_id AND status = 'completed' AND completed_at >= CURRENT_DATE - INTERVAL '7 days'),
    'avg_completion_hours', (
      SELECT ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600)::numeric, 2)
      FROM waste_reports 
      WHERE neighborhood_id = p_neighborhood_id AND status = 'completed' AND completed_at >= CURRENT_DATE - INTERVAL '30 days'
    ),
    'total_residents', (SELECT COUNT(*) FROM profiles WHERE neighborhood_id = p_neighborhood_id AND role = 'resident'),
    'total_collectors', (SELECT COUNT(*) FROM profiles WHERE neighborhood_id = p_neighborhood_id AND role = 'collector'),
    'active_challenges', (SELECT COUNT(*) FROM challenges WHERE (neighborhood_id = p_neighborhood_id OR neighborhood_id IS NULL) AND status = 'active'),
    'sla_compliance_rate', (
      SELECT ROUND(
        100.0 * COUNT(*) FILTER (WHERE EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600 <= 24) / NULLIF(COUNT(*), 0),
        2
      )
      FROM waste_reports 
      WHERE neighborhood_id = p_neighborhood_id AND status = 'completed' AND completed_at >= CURRENT_DATE - INTERVAL '30 days'
    )
  ) INTO v_stats;
  
  RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 6: COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE neighborhoods IS 'Multi-tenant base table for neighborhood/society definitions';
COMMENT ON TABLE profiles IS 'Extended user profiles linked to auth.users with role-based access';
COMMENT ON TABLE waste_reports IS 'Core waste report submissions with AI classification';
COMMENT ON TABLE report_events IS 'Immutable audit trail for all report status changes';
COMMENT ON TABLE collector_claims IS 'Job claim records linking collectors to reports';
COMMENT ON TABLE points_ledger IS 'Transactional ledger for gamification points';
COMMENT ON TABLE challenges IS 'Gamification challenges (weekly/monthly/special)';
COMMENT ON TABLE badges IS 'Achievement badge definitions';
COMMENT ON TABLE user_badges IS 'Awarded badges to users';

COMMENT ON FUNCTION claim_report IS 'Atomic function to claim a report with proper locking and validation';
COMMENT ON FUNCTION complete_report IS 'Atomic function to complete a report and award points';
COMMENT ON FUNCTION award_points IS 'Award points to a user with full ledger tracking';
