-- Notifications and alerts tables
-- This migration adds support for in-app notifications

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'report_status', 'message', 'workshop', 'challenge', 'points', 'badge', 'system'
    title TEXT NOT NULL,
    body TEXT,
    reference_id UUID, -- Links to related entity (report, workshop, challenge, etc.)
    reference_type TEXT, -- 'report', 'workshop', 'challenge', 'message', etc.
    action_url TEXT, -- URL to navigate to when clicked
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    -- In-app notifications
    in_app_enabled BOOLEAN DEFAULT TRUE,
    -- Email notifications
    email_enabled BOOLEAN DEFAULT FALSE,
    -- Push notifications (for future use)
    push_enabled BOOLEAN DEFAULT FALSE,
    -- Notification types
    report_updates BOOLEAN DEFAULT TRUE,
    messages BOOLEAN DEFAULT TRUE,
    workshops BOOLEAN DEFAULT TRUE,
    challenges BOOLEAN DEFAULT TRUE,
    points_updates BOOLEAN DEFAULT TRUE,
    badge_earned BOOLEAN DEFAULT TRUE,
    system_updates BOOLEAN DEFAULT TRUE,
    -- Quiet hours (optional)
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    -- Metadata
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
-- Users can only see their own notifications
CREATE POLICY "Users can view their own notifications"
    ON notifications FOR SELECT
    USING (user_id = auth.uid());

-- Users can mark their own notifications as read
CREATE POLICY "Users can update their own notifications"
    ON notifications FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
    ON notifications FOR DELETE
    USING (user_id = auth.uid());

-- System can insert notifications (via service role)
CREATE POLICY "System can insert notifications"
    ON notifications FOR INSERT
    WITH CHECK (true);

-- RLS Policies for notification_preferences
-- Users can view their own preferences
CREATE POLICY "Users can view their own preferences"
    ON notification_preferences FOR SELECT
    USING (user_id = auth.uid());

-- Users can update their own preferences
CREATE POLICY "Users can update their own preferences"
    ON notification_preferences FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can insert their own preferences
CREATE POLICY "Users can insert their own preferences"
    ON notification_preferences FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Function to create default notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notification_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create preferences for new profiles
DROP TRIGGER IF EXISTS on_profile_created_notification_prefs ON profiles;
CREATE TRIGGER on_profile_created_notification_prefs
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_default_notification_preferences();

-- Function to send a notification
CREATE OR REPLACE FUNCTION send_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_body TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_reference_type TEXT DEFAULT NULL,
    p_action_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_notification_id UUID;
    v_prefs notification_preferences;
BEGIN
    -- Check user preferences
    SELECT * INTO v_prefs FROM notification_preferences WHERE user_id = p_user_id;
    
    -- If no preferences, create default
    IF v_prefs IS NULL THEN
        INSERT INTO notification_preferences (user_id) VALUES (p_user_id);
        v_prefs.in_app_enabled := TRUE;
    END IF;
    
    -- Check if in-app notifications are enabled
    IF NOT v_prefs.in_app_enabled THEN
        RETURN NULL;
    END IF;
    
    -- Check specific notification type preferences
    IF (p_type = 'report_status' AND NOT COALESCE(v_prefs.report_updates, TRUE)) OR
       (p_type = 'message' AND NOT COALESCE(v_prefs.messages, TRUE)) OR
       (p_type = 'workshop' AND NOT COALESCE(v_prefs.workshops, TRUE)) OR
       (p_type = 'challenge' AND NOT COALESCE(v_prefs.challenges, TRUE)) OR
       (p_type = 'points' AND NOT COALESCE(v_prefs.points_updates, TRUE)) OR
       (p_type = 'badge' AND NOT COALESCE(v_prefs.badge_earned, TRUE)) OR
       (p_type = 'system' AND NOT COALESCE(v_prefs.system_updates, TRUE)) THEN
        RETURN NULL;
    END IF;
    
    -- Insert notification
    INSERT INTO notifications (user_id, type, title, body, reference_id, reference_type, action_url)
    VALUES (p_user_id, p_type, p_title, p_body, p_reference_id, p_reference_type, p_action_url)
    RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to send notification when report status changes
CREATE OR REPLACE FUNCTION notify_report_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        PERFORM send_notification(
            NEW.user_id,
            'report_status',
            'Report Status Updated',
            'Your report status changed to: ' || NEW.status,
            NEW.id,
            'report',
            '/resident/reports/' || NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_report_status_change ON waste_reports;
CREATE TRIGGER on_report_status_change
    AFTER UPDATE OF status ON waste_reports
    FOR EACH ROW
    EXECUTE FUNCTION notify_report_status_change();

-- NOTE: The following triggers are commented out because they depend on tables
-- that may not exist in your database (points_transactions, badges, user_badges).
-- Uncomment these if/when you add those tables.

-- Trigger to send notification when user earns points
-- CREATE OR REPLACE FUNCTION notify_points_earned()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     PERFORM send_notification(
--         NEW.user_id,
--         'points',
--         'Points Earned! +' || NEW.amount,
--         'You earned ' || NEW.amount || ' points for: ' || NEW.reason,
--         NEW.id,
--         'points',
--         '/resident/profile'
--     );
--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;
--
-- DROP TRIGGER IF EXISTS on_points_earned ON points_transactions;
-- CREATE TRIGGER on_points_earned
--     AFTER INSERT ON points_transactions
--     FOR EACH ROW
--     WHEN (NEW.amount > 0)
--     EXECUTE FUNCTION notify_points_earned();

-- Trigger to send notification when user earns a badge
-- CREATE OR REPLACE FUNCTION notify_badge_earned()
-- RETURNS TRIGGER AS $$
-- DECLARE
--     v_badge_name TEXT;
-- BEGIN
--     SELECT name INTO v_badge_name FROM badges WHERE id = NEW.badge_id;
--     
--     PERFORM send_notification(
--         NEW.user_id,
--         'badge',
--         'New Badge Earned! 🏆',
--         'Congratulations! You earned the "' || v_badge_name || '" badge!',
--         NEW.badge_id,
--         'badge',
--         '/resident/profile'
--     );
--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;
--
-- DROP TRIGGER IF EXISTS on_badge_earned ON user_badges;
-- CREATE TRIGGER on_badge_earned
--     AFTER INSERT ON user_badges
--     FOR EACH ROW
--     EXECUTE FUNCTION notify_badge_earned();

