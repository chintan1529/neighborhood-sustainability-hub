-- ============================================================================
-- FEATURE 2: COMPLAINT SYSTEM
-- Citizen grievance portal with admin resolution workflow
-- ============================================================================

-- Complaint categories
CREATE TYPE complaint_category AS ENUM (
  'missed_pickup',
  'illegal_dumping',
  'overflowing_bin',
  'service_quality',
  'damaged_bin',
  'noise_complaint',
  'hazardous_waste',
  'other'
);

-- Complaint status lifecycle
CREATE TYPE complaint_status AS ENUM (
  'submitted',
  'under_review',
  'in_progress',
  'resolved',
  'rejected'
);

CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Ownership
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  neighborhood_id UUID REFERENCES neighborhoods(id) ON DELETE SET NULL,
  
  -- Classification
  category complaint_category NOT NULL,
  status complaint_status DEFAULT 'submitted',
  priority INTEGER DEFAULT 2 CHECK (priority BETWEEN 1 AND 5), -- 1=low, 5=critical

  -- Content
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  
  -- Location (optional, for location-based complaints)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  address_text TEXT,
  
  -- Media (optional photo evidence)
  photo_url TEXT,
  photo_path TEXT,
  
  -- Resolution
  assigned_to UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ,
  admin_response TEXT,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_complaints_user ON complaints(user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category);
CREATE INDEX IF NOT EXISTS idx_complaints_created ON complaints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaints_assigned ON complaints(assigned_to);

-- Enable RLS
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

-- Residents can view their own complaints
CREATE POLICY "Users can view own complaints"
  ON complaints FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Residents can create complaints
CREATE POLICY "Users can create complaints"
  ON complaints FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins can view all complaints
CREATE POLICY "Admins can view all complaints"
  ON complaints FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can update any complaint
CREATE POLICY "Admins can update complaints"
  ON complaints FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
