-- ============================================================================
-- FEATURE 1: TRANSFER STATIONS
-- Intermediate depots that minimize long-distance hauling
-- ============================================================================

CREATE TABLE IF NOT EXISTS transfer_stations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Identity
  name VARCHAR(255) NOT NULL,
  code VARCHAR(20) UNIQUE, -- e.g., "TS-01"
  
  -- Location
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address_text TEXT,
  
  -- Capacity
  capacity_tons DECIMAL(8, 2) DEFAULT 50.0,
  current_load_tons DECIMAL(8, 2) DEFAULT 0.0,
  
  -- Operating details
  operating_hours VARCHAR(100) DEFAULT '06:00-22:00',
  waste_types_accepted TEXT[] DEFAULT ARRAY['cardboard','metal','paper','plastic','glass','organic','mixed'],
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  contact_phone VARCHAR(20),
  contact_email VARCHAR(255),
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transfer_stations_location ON transfer_stations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_transfer_stations_active ON transfer_stations(is_active);

-- Seed some sample transfer stations around Bangalore
INSERT INTO transfer_stations (name, code, latitude, longitude, address_text, capacity_tons, operating_hours, notes) VALUES
  ('Koramangala Transfer Hub', 'TS-01', 12.9352, 77.6245, 'Koramangala 5th Block, Bangalore', 80.0, '06:00-22:00', 'Primary hub for south-east zone'),
  ('Indiranagar Depot', 'TS-02', 12.9784, 77.6408, '100 Feet Road, Indiranagar', 60.0, '07:00-21:00', 'Handles residential waste from Indiranagar area'),
  ('Whitefield Collection Center', 'TS-03', 12.9698, 77.7500, 'ITPL Main Road, Whitefield', 100.0, '06:00-23:00', 'Large capacity hub for tech corridor'),
  ('Jayanagar Green Station', 'TS-04', 12.9250, 77.5838, '4th Block, Jayanagar', 45.0, '06:30-20:00', 'Eco-friendly processing station'),
  ('Hebbal Transfer Point', 'TS-05', 13.0358, 77.5970, 'Hebbal Flyover Junction', 70.0, '05:00-22:00', 'Northern zone main transfer point')
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE transfer_stations ENABLE ROW LEVEL SECURITY;

-- Policies: All authenticated users can read, only admins can modify
CREATE POLICY "Anyone can view transfer stations"
  ON transfer_stations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage transfer stations"
  ON transfer_stations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );
