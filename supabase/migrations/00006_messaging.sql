-- Messaging system tables
-- This migration adds support for conversations and messages between users

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'report', 'support')),
    title TEXT, -- Optional title for group/support conversations
    reference_id UUID, -- Links to report_id if type='report'
    reference_type TEXT, -- 'report', etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation participants table
CREATE TABLE IF NOT EXISTS conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'member', 'admin')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    is_muted BOOLEAN DEFAULT FALSE,
    UNIQUE(conversation_id, user_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'system')),
    attachment_url TEXT,
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message read receipts (optional, for detailed tracking)
CREATE TABLE IF NOT EXISTS message_reads (
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (message_id, user_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);
CREATE INDEX IF NOT EXISTS idx_conversations_reference ON conversations(reference_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conv ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations
-- Users can view conversations they're part of
CREATE POLICY "Users can view their conversations"
    ON conversations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversation_participants
            WHERE conversation_participants.conversation_id = conversations.id
            AND conversation_participants.user_id = auth.uid()
        )
    );

-- Users can create conversations
CREATE POLICY "Users can create conversations"
    ON conversations FOR INSERT
    WITH CHECK (true);

-- Participants can update conversations they own
CREATE POLICY "Owners can update conversations"
    ON conversations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM conversation_participants
            WHERE conversation_participants.conversation_id = conversations.id
            AND conversation_participants.user_id = auth.uid()
            AND conversation_participants.role = 'owner'
        )
    );

-- RLS Policies for conversation_participants
-- Users can view their own participant records directly
CREATE POLICY "Users can view their own participant records"
    ON conversation_participants FOR SELECT
    USING (user_id = auth.uid());

-- Allow inserting participants (for creating conversations with others)
-- This allows any authenticated user to add participants
CREATE POLICY "Authenticated users can add participants"
    ON conversation_participants FOR INSERT
    WITH CHECK (true);

-- Users can update their own participant record
CREATE POLICY "Users can update their participant record"
    ON conversation_participants FOR UPDATE
    USING (user_id = auth.uid());

-- RLS Policies for messages
-- Users can view messages in their conversations
CREATE POLICY "Users can view messages in their conversations"
    ON messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM conversation_participants
            WHERE conversation_participants.conversation_id = messages.conversation_id
            AND conversation_participants.user_id = auth.uid()
        )
    );

-- Users can send messages to their conversations
CREATE POLICY "Users can send messages"
    ON messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM conversation_participants
            WHERE conversation_participants.conversation_id = messages.conversation_id
            AND conversation_participants.user_id = auth.uid()
        )
    );

-- Users can edit their own messages
CREATE POLICY "Users can edit their own messages"
    ON messages FOR UPDATE
    USING (sender_id = auth.uid());

-- RLS Policies for message_reads
CREATE POLICY "Users can view their own read receipts"
    ON message_reads FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can mark messages as read"
    ON message_reads FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Function to update conversation last_message_at on new message
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE conversations
    SET last_message_at = NOW(), updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_message ON messages;
CREATE TRIGGER on_new_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_last_message();

-- Function to create a report conversation when a report is created
CREATE OR REPLACE FUNCTION create_report_conversation()
RETURNS TRIGGER AS $$
DECLARE
    v_conversation_id UUID;
BEGIN
    -- Create conversation for the report
    INSERT INTO conversations (type, title, reference_id, reference_type)
    VALUES ('report', 'Report Discussion', NEW.id, 'report')
    RETURNING id INTO v_conversation_id;
    
    -- Add reporter as owner
    INSERT INTO conversation_participants (conversation_id, user_id, role)
    VALUES (v_conversation_id, NEW.user_id, 'owner');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable report conversation creation (optional - uncomment if needed)
-- DROP TRIGGER IF EXISTS on_report_created_conversation ON waste_reports;
-- CREATE TRIGGER on_report_created_conversation
--     AFTER INSERT ON waste_reports
--     FOR EACH ROW
--     EXECUTE FUNCTION create_report_conversation();

-- Function to send notification on new message
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
    v_participant RECORD;
    v_sender_name TEXT;
    v_conv_title TEXT;
BEGIN
    -- Get sender name
    SELECT full_name INTO v_sender_name FROM profiles WHERE id = NEW.sender_id;
    
    -- Get conversation title
    SELECT COALESCE(title, 'New Message') INTO v_conv_title FROM conversations WHERE id = NEW.conversation_id;
    
    -- Notify all participants except sender
    FOR v_participant IN
        SELECT user_id FROM conversation_participants
        WHERE conversation_id = NEW.conversation_id
        AND user_id != NEW.sender_id
        AND NOT is_muted
    LOOP
        PERFORM send_notification(
            v_participant.user_id,
            'message',
            COALESCE(v_sender_name, 'Someone') || ' sent a message',
            LEFT(NEW.content, 100),
            NEW.conversation_id,
            'conversation',
            '/resident/messages/' || NEW.conversation_id
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_message_notify ON messages;
CREATE TRIGGER on_message_notify
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_message();
