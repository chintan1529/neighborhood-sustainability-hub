-- Workshops and Campaigns tables
-- This migration adds support for community workshops, training sessions, and awareness campaigns

-- Workshops table
CREATE TABLE IF NOT EXISTS workshops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    short_description TEXT,
    type TEXT NOT NULL CHECK (type IN ('workshop', 'campaign', 'training', 'event')),
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('draft', 'upcoming', 'ongoing', 'completed', 'cancelled')),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ,
    location TEXT,
    location_type TEXT DEFAULT 'in-person' CHECK (location_type IN ('in-person', 'online', 'hybrid')),
    max_participants INTEGER,
    points_reward INTEGER DEFAULT 50,
    neighborhood_id UUID REFERENCES neighborhoods(id) ON DELETE SET NULL,
    image_url TEXT,
    organizer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    requirements TEXT,
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workshop registrations table
CREATE TABLE IF NOT EXISTS workshop_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'attended', 'cancelled', 'no_show')),
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    attended_at TIMESTAMPTZ,
    notes TEXT,
    UNIQUE(workshop_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_workshops_status ON workshops(status);
CREATE INDEX IF NOT EXISTS idx_workshops_starts_at ON workshops(starts_at);
CREATE INDEX IF NOT EXISTS idx_workshops_type ON workshops(type);
CREATE INDEX IF NOT EXISTS idx_workshops_neighborhood ON workshops(neighborhood_id);
CREATE INDEX IF NOT EXISTS idx_workshop_registrations_user ON workshop_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_workshop_registrations_workshop ON workshop_registrations(workshop_id);

-- Enable RLS
ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_registrations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workshops
-- Everyone can view published workshops
CREATE POLICY "Anyone can view upcoming and ongoing workshops"
    ON workshops FOR SELECT
    USING (status IN ('upcoming', 'ongoing', 'completed'));

-- Admins can manage workshops
CREATE POLICY "Admins can manage workshops"
    ON workshops FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- RLS Policies for workshop_registrations
-- Users can view their own registrations
CREATE POLICY "Users can view their own registrations"
    ON workshop_registrations FOR SELECT
    USING (user_id = auth.uid());

-- Users can register for workshops
CREATE POLICY "Users can register for workshops"
    ON workshop_registrations FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Users can cancel their own registrations
CREATE POLICY "Users can cancel their own registrations"
    ON workshop_registrations FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid() AND status = 'cancelled');

-- Admins can manage all registrations
CREATE POLICY "Admins can manage all registrations"
    ON workshop_registrations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Insert some sample workshops
INSERT INTO workshops (title, short_description, description, type, status, starts_at, ends_at, location, location_type, max_participants, points_reward, tags) VALUES
(
    'Composting 101: Turn Waste into Garden Gold',
    'Learn the basics of home composting and reduce your organic waste by up to 30%.',
    'Join us for a hands-on workshop where you''ll learn how to set up and maintain a home compost bin. Topics covered include: what can be composted, the science of decomposition, troubleshooting common problems, and using finished compost in your garden. Participants will receive a free starter compost kit!',
    'workshop',
    'upcoming',
    NOW() + INTERVAL '7 days',
    NOW() + INTERVAL '7 days' + INTERVAL '2 hours',
    'Community Garden, Green Street',
    'in-person',
    25,
    75,
    ARRAY['composting', 'organic', 'garden', 'beginner']
),
(
    'Zero Waste Living Challenge',
    'A 30-day community challenge to reduce household waste. Weekly meetups and prizes!',
    'Take the Zero Waste Challenge! This month-long campaign will guide you through reducing your household waste step by step. Weekly themes include: refusing single-use plastics, composting, repairing instead of replacing, and shopping sustainably. Track your progress and compete with neighbors for eco-prizes!',
    'campaign',
    'upcoming',
    NOW() + INTERVAL '14 days',
    NOW() + INTERVAL '44 days',
    'Community Center + Online',
    'hybrid',
    100,
    150,
    ARRAY['zero-waste', 'challenge', 'community', 'sustainability']
),
(
    'E-Waste Collection Drive',
    'Safely dispose of your old electronics and learn about e-waste recycling.',
    'Bring your old phones, computers, batteries, and other electronic waste for safe, environmentally responsible disposal. Our partners from the recycling center will be on hand to explain how e-waste is processed and why proper disposal matters for our community and the planet.',
    'event',
    'upcoming',
    NOW() + INTERVAL '21 days',
    NOW() + INTERVAL '21 days' + INTERVAL '6 hours',
    'Neighborhood Parking Lot, Main Road',
    'in-person',
    NULL,
    30,
    ARRAY['e-waste', 'electronics', 'recycling', 'collection']
),
(
    'Plastic-Free Living Webinar',
    'Online session on reducing plastic use in everyday life.',
    'Discover practical tips and alternatives for reducing plastic consumption at home and work. This webinar covers: plastic-free shopping, natural cleaning products, sustainable food storage, and the true cost of plastic pollution. Q&A session included!',
    'training',
    'upcoming',
    NOW() + INTERVAL '10 days',
    NOW() + INTERVAL '10 days' + INTERVAL '90 minutes',
    'Zoom (link will be sent after registration)',
    'online',
    50,
    40,
    ARRAY['plastic-free', 'online', 'tips', 'lifestyle']
);
