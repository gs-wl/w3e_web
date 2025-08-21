-- Migration to update whitelist_requests table for new form fields
-- Run this in your Supabase SQL editor

-- Add new columns for the updated form
ALTER TABLE whitelist_requests 
ADD COLUMN IF NOT EXISTS nickname TEXT,
ADD COLUMN IF NOT EXISTS participate_airdrops BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS join_competitions BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS bug_bounty_interest BOOLEAN DEFAULT false;

-- Make name field optional (since we now have nickname)
ALTER TABLE whitelist_requests 
ALTER COLUMN name DROP NOT NULL,
ALTER COLUMN reason DROP NOT NULL;

-- Update the constraint to allow either name or nickname
-- (You can add a check constraint if needed)

-- Add comment for documentation
COMMENT ON COLUMN whitelist_requests.nickname IS 'Optional Web3 identity, ENS domain, or alias';
COMMENT ON COLUMN whitelist_requests.participate_airdrops IS 'User opted in for pre-launch/airdrops';
COMMENT ON COLUMN whitelist_requests.join_competitions IS 'User opted in for competitions and referral challenges';
COMMENT ON COLUMN whitelist_requests.bug_bounty_interest IS 'User interested in bug bounty program';