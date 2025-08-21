-- Migration to create admin_wallets table
-- Run this in your Supabase SQL editor

-- Create admin_wallets table
CREATE TABLE IF NOT EXISTS admin_wallets (
  id SERIAL PRIMARY KEY,
  address TEXT NOT NULL UNIQUE,
  label TEXT, -- Optional label for the admin (e.g., "Main Admin", "Developer", etc.)
  is_active BOOLEAN DEFAULT true,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by TEXT, -- Could store who added this admin
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_wallets_address ON admin_wallets(address);
CREATE INDEX IF NOT EXISTS idx_admin_wallets_active ON admin_wallets(is_active);

-- Enable Row Level Security (RLS)
ALTER TABLE admin_wallets ENABLE ROW LEVEL SECURITY;

-- Create policy for admin wallets (adjust based on your auth requirements)
CREATE POLICY "Allow all operations on admin_wallets" ON admin_wallets
  FOR ALL USING (true) WITH CHECK (true);

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_admin_wallets_updated_at ON admin_wallets;
CREATE TRIGGER update_admin_wallets_updated_at
    BEFORE UPDATE ON admin_wallets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert existing admin addresses from your JSON file
INSERT INTO admin_wallets (address, label, added_by) VALUES
  ('0x5aBB25393df53487E3025e81d86D8378a404efF1', 'Admin 1', 'migration'),
  ('0xEFc019FbC0A7C8938E44b98e0251e77cB198E8F0', 'Admin 2', 'migration'),
  ('0xa430A66027372E4d11aE1Eca20D2D022b69eAf9c', 'Admin 3', 'migration')
ON CONFLICT (address) DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE admin_wallets IS 'Stores admin wallet addresses with metadata';
COMMENT ON COLUMN admin_wallets.address IS 'Ethereum wallet address of the admin';
COMMENT ON COLUMN admin_wallets.label IS 'Optional human-readable label for the admin';
COMMENT ON COLUMN admin_wallets.is_active IS 'Whether this admin address is currently active';
COMMENT ON COLUMN admin_wallets.added_by IS 'Who added this admin address';