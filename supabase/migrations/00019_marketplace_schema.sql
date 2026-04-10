-- 00019_marketplace_schema.sql
-- Enables the Waste-to-Value Marketplace functionalities.

-- ENUMS
CREATE TYPE listing_status AS ENUM ('active', 'negotiating', 'accepted', 'picked_up', 'completed', 'cancelled');
CREATE TYPE offer_status AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn');
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
CREATE TYPE transaction_status AS ENUM ('confirmed', 'picked_up', 'completed', 'cancelled');
CREATE TYPE payment_mode AS ENUM ('cash', 'upi', 'bank_transfer');
CREATE TYPE payment_status AS ENUM ('pending', 'completed');
CREATE TYPE notification_type AS ENUM (
    'report_status', 'message', 'workshop', 'challenge', 
    'points', 'badge', 'system', 'new_offer', 
    'offer_accepted', 'pickup_scheduled', 'transaction_completed'
);

-- TABLE: RECYCLER PROFILES
CREATE TABLE recycler_profiles (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    tax_id TEXT,
    verification_status verification_status DEFAULT 'pending',
    verified_at TIMESTAMPTZ,
    service_radius_km INTEGER DEFAULT 10,
    accepted_categories waste_category[] NOT NULL DEFAULT '{}',
    base_location GEOGRAPHY(POINT) NOT NULL,
    total_rating NUMERIC(3,2) DEFAULT 0.0,
    review_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE: MARKETPLACE LISTINGS
CREATE TABLE marketplace_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resident_id UUID REFERENCES profiles(id) NOT NULL,
    category waste_category NOT NULL,
    weight_kg NUMERIC(6,2) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    photos TEXT[] NOT NULL DEFAULT '{}',
    location GEOGRAPHY(POINT) NOT NULL,
    address_text TEXT NOT NULL,
    expected_price NUMERIC(10,2),
    ai_suggested_price NUMERIC(10,2),
    status listing_status DEFAULT 'active',
    selected_offer_id UUID, -- Foreign key established later
    fraud_flag BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE: MARKETPLACE OFFERS
CREATE TABLE marketplace_offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID REFERENCES marketplace_listings(id) ON DELETE CASCADE NOT NULL,
    recycler_id UUID REFERENCES recycler_profiles(id) NOT NULL,
    price_offered NUMERIC(10,2) NOT NULL,
    proposed_pickup_time TIMESTAMPTZ NOT NULL,
    status offer_status DEFAULT 'pending',
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE marketplace_listings ADD CONSTRAINT fk_selected_offer 
    FOREIGN KEY (selected_offer_id) REFERENCES marketplace_offers(id);

-- TABLE: MARKETPLACE TRANSACTIONS (Single Source of Truth)
CREATE TABLE marketplace_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES marketplace_listings(id),
    offer_id UUID NOT NULL REFERENCES marketplace_offers(id),
    resident_id UUID NOT NULL REFERENCES profiles(id),
    recycler_id UUID NOT NULL REFERENCES recycler_profiles(id),
    
    final_price_per_kg NUMERIC(10,2) NOT NULL,
    total_estimated_price NUMERIC(10,2) NOT NULL,
    scheduled_pickup_time TIMESTAMPTZ NOT NULL,
    
    status transaction_status DEFAULT 'confirmed',
    payment_mode payment_mode DEFAULT 'cash',
    payment_status payment_status DEFAULT 'pending',
    
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_listing_transaction UNIQUE (listing_id)
);

-- TABLE: REVIEWS
CREATE TABLE transaction_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES marketplace_transactions(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES profiles(id),
    reviewee_id UUID NOT NULL REFERENCES profiles(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- TABLE: NOTIFICATIONS
CREATE TABLE marketplace_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) NOT NULL,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    reference_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SPATIAL + GENERAL INDEXES
CREATE INDEX idx_marketplace_location ON marketplace_listings USING GIST(location);
CREATE INDEX idx_recycler_location ON recycler_profiles USING GIST(base_location);
CREATE INDEX idx_listing_status_created ON marketplace_listings (status, created_at DESC);
CREATE INDEX idx_offers_listing ON marketplace_offers (listing_id);
CREATE INDEX idx_transactions_user ON marketplace_transactions (resident_id, recycler_id);
CREATE INDEX idx_marketplace_notifications_user ON marketplace_notifications (user_id, is_read);

-- ------------------------------------------------------------------------------------------------
-- SMART FEATURES & FUNCTIONS
-- ------------------------------------------------------------------------------------------------

-- FUNCTION: 1. Get Robust Median Pricing (PostgreSQL Continuous Aggregate)
CREATE OR REPLACE FUNCTION get_suggested_price(
    p_category waste_category, 
    p_location GEOGRAPHY(POINT), 
    p_radius_km INT DEFAULT 20
) RETURNS NUMERIC AS $$
DECLARE
    v_median_price NUMERIC;
BEGIN
    SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY t.final_price_per_kg)
    INTO v_median_price
    FROM marketplace_transactions t
    JOIN marketplace_listings l ON t.listing_id = l.id
    WHERE l.category = p_category
      AND t.status IN ('completed', 'picked_up')
      AND t.created_at >= NOW() - INTERVAL '30 days'
      AND ST_DWithin(l.location, p_location, p_radius_km * 1000);

    RETURN COALESCE(v_median_price, 0.00); 
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FUNCTION: 2. Get Urgency/Ranking Score (Normalized Out of 100)
CREATE OR REPLACE FUNCTION get_listing_urgency_score(p_listing_id UUID, p_recycler_location GEOGRAPHY(POINT))
RETURNS NUMERIC AS $$
DECLARE
    v_score NUMERIC;
    v_created_at TIMESTAMPTZ;
    v_expected NUMERIC;
    v_ai_suggested NUMERIC;
    v_listing_loc GEOGRAPHY(POINT);
    v_distance_km NUMERIC;
    
    v_dist_score NUMERIC;
    v_age_score NUMERIC;
    v_price_score NUMERIC;
BEGIN
    SELECT created_at, expected_price, ai_suggested_price, location 
    INTO v_created_at, v_expected, v_ai_suggested, v_listing_loc
    FROM marketplace_listings WHERE id = p_listing_id;

    IF NOT FOUND THEN RETURN 0; END IF;

    -- Distance evaluation (Max 50 pts, exponential decay)
    v_distance_km := ST_Distance(v_listing_loc, p_recycler_location) / 1000.0;
    v_dist_score := 50.0 * EXP(-0.2 * v_distance_km);

    -- Age evaluation (Max 30 pts, caps at 7 days)
    v_age_score := 30.0 * LEAST(EXTRACT(EPOCH FROM (NOW() - v_created_at))/86400.0 / 7.0, 1.0);

    -- Price attractiveness (Max 20 pts)
    IF v_expected IS NULL THEN 
        v_price_score := 10.0;
    ELSIF COALESCE(v_ai_suggested, 0) = 0 THEN
        v_price_score := 10.0;
    ELSE
        v_price_score := 20.0 * GREATEST(0.0, LEAST(1.0, 1.0 - (v_expected / v_ai_suggested)));
    END IF;

    v_score := ROUND(v_dist_score + v_age_score + v_price_score);
    RETURN v_score;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- FUNCTION: 3. Concurrency-Safe Transaction Locking
CREATE OR REPLACE FUNCTION accept_marketplace_offer(p_offer_id UUID, p_resident_id UUID)
RETURNS UUID AS $$
DECLARE
    v_listing_id UUID;
    v_recycler_id UUID;
    v_price NUMERIC;
    v_weight NUMERIC;
    v_pickup TIMESTAMPTZ;
    v_transaction_id UUID;
BEGIN
    -- 1. Lock listing
    SELECT id, weight_kg INTO v_listing_id, v_weight 
    FROM marketplace_listings 
    WHERE id = (SELECT listing_id FROM marketplace_offers WHERE id = p_offer_id)
      AND resident_id = p_resident_id
      AND status = 'active'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Listing is no longer available or unauthorized';
    END IF;

    -- 2. Lock offer
    SELECT recycler_id, price_offered, proposed_pickup_time 
    INTO v_recycler_id, v_price, v_pickup
    FROM marketplace_offers 
    WHERE id = p_offer_id AND status = 'pending'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Offer is no longer valid';
    END IF;

    -- 3. Execute changes
    UPDATE marketplace_listings SET status = 'accepted', selected_offer_id = p_offer_id, updated_at = NOW() WHERE id = v_listing_id;
    UPDATE marketplace_offers SET status = 'accepted', updated_at = NOW() WHERE id = p_offer_id;
    
    -- Auto-Reject Competitors
    UPDATE marketplace_offers SET status = 'rejected', updated_at = NOW() 
    WHERE listing_id = v_listing_id AND id != p_offer_id AND status = 'pending';

    -- 4. Create Transaction Log
    INSERT INTO marketplace_transactions 
        (listing_id, offer_id, resident_id, recycler_id, final_price_per_kg, total_estimated_price, scheduled_pickup_time)
    VALUES 
        (v_listing_id, p_offer_id, p_resident_id, v_recycler_id, v_price, (v_price * v_weight), v_pickup)
    RETURNING id INTO v_transaction_id;

    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------------------------
-- NOTIFICATION TRIGGERS
-- ------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_new_offer() RETURNS TRIGGER AS $$
DECLARE
    v_resident_id UUID;
    v_listing_title TEXT;
BEGIN
    SELECT resident_id, title INTO v_resident_id, v_listing_title 
    FROM marketplace_listings WHERE id = NEW.listing_id;

    INSERT INTO marketplace_notifications (user_id, type, title, body, reference_id)
    VALUES (
        v_resident_id, 
        'new_offer', 
        'New Marketplace Offer! 💸', 
        'A recycler offered ₹' || NEW.price_offered || '/kg for your ' || v_listing_title,
        NEW.listing_id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_new_marketplace_offer
AFTER INSERT ON marketplace_offers
FOR EACH ROW WHEN (NEW.status = 'pending')
EXECUTE FUNCTION notify_new_offer();

-- Trigger for accepted transaction
CREATE OR REPLACE FUNCTION notify_offer_accepted() RETURNS TRIGGER AS $$
DECLARE
    v_listing_title TEXT;
BEGIN
    SELECT title INTO v_listing_title 
    FROM marketplace_listings WHERE id = NEW.listing_id;

    INSERT INTO marketplace_notifications (user_id, type, title, body, reference_id)
    VALUES (
        NEW.recycler_id, 
        'offer_accepted', 
        'Offer Accepted! 🎉', 
        'Your offer of ₹' || NEW.final_price_per_kg || '/kg for ' || v_listing_title || ' was accepted. View pickup details.',
        NEW.listing_id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_offer_accepted
AFTER INSERT ON marketplace_transactions
FOR EACH ROW EXECUTE FUNCTION notify_offer_accepted();

-- ------------------------------------------------------------------------------------------------
-- ROW-LEVEL SECURITY
-- ------------------------------------------------------------------------------------------------

ALTER TABLE recycler_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_notifications ENABLE ROW LEVEL SECURITY;

-- RECYCLER PROFILES
CREATE POLICY "Public profiles are viewable by everyone" ON recycler_profiles FOR SELECT USING (true);
CREATE POLICY "Recyclers edit their own profile" ON recycler_profiles FOR UPDATE USING (auth.uid() = id);

-- MARKETPLACE LISTINGS
CREATE POLICY "Anyone can view active/negotiated listings" ON marketplace_listings FOR SELECT USING (status IN ('active', 'negotiating', 'accepted'));
CREATE POLICY "Residents manage listings" ON marketplace_listings FOR ALL USING (auth.uid() = resident_id);
CREATE POLICY "Admins full access listings" ON marketplace_listings FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- MARKETPLACE OFFERS
-- Residents see offers for their listings
CREATE POLICY "Residents view offers on their listings" ON marketplace_offers FOR SELECT USING (EXISTS (SELECT 1 FROM marketplace_listings l WHERE l.id = listing_id AND l.resident_id = auth.uid()));
-- Recyclers manage their own offers
CREATE POLICY "Recyclers manage their offers" ON marketplace_offers FOR ALL USING (auth.uid() = recycler_id);

-- TRANSACTIONS
CREATE POLICY "Participants view transactions" ON marketplace_transactions FOR SELECT USING (auth.uid() IN (resident_id, recycler_id));

-- NOTIFICATIONS
CREATE POLICY "Users read own notifications" ON marketplace_notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users dismiss own notifications" ON marketplace_notifications FOR UPDATE USING (auth.uid() = user_id);

-- REVIEWS
CREATE POLICY "Anyone views reviews" ON transaction_reviews FOR SELECT USING (true);
CREATE POLICY "Participants write reviews" ON transaction_reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
