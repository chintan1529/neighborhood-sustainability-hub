-- Fix infinite recursion in challenge_participants RLS policy
-- The 'challenge_participants_select_same_challenge' policy references itself causing recursion

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "challenge_participants_select_same_challenge" ON challenge_participants;

-- The 'challenge_participants_select_own' policy is sufficient for users to see their own participations
-- If we need users to see other participants in same challenge, we can use a view or function instead
