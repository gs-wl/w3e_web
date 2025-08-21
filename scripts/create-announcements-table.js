const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createAnnouncementsTable() {
  try {
    console.log('🔄 Creating announcements table...');
    
    // First, let's check if the table already exists
    const { data: existingTable, error: checkError } = await supabase
      .from('announcements')
      .select('*')
      .limit(1);
    
    if (!checkError) {
      console.log('✅ Announcements table already exists!');
      console.log('📊 Current announcements:', existingTable?.length || 0);
      return;
    }
    
    if (checkError && !checkError.message.includes('does not exist')) {
      console.error('❌ Error checking table:', checkError);
      return;
    }
    
    console.log('📝 Table does not exist, creating it...');
    
    // Create the announcements table using SQL
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS announcements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'success', 'urgent')),
        is_active BOOLEAN DEFAULT true,
        admin_wallet TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_announcements_is_active ON announcements(is_active);
      CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at);
      CREATE INDEX IF NOT EXISTS idx_announcements_admin_wallet ON announcements(admin_wallet);
      
      -- Create updated_at trigger
      CREATE OR REPLACE FUNCTION update_announcements_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ language 'plpgsql';
      
      DROP TRIGGER IF EXISTS update_announcements_updated_at ON announcements;
      CREATE TRIGGER update_announcements_updated_at
          BEFORE UPDATE ON announcements
          FOR EACH ROW
          EXECUTE FUNCTION update_announcements_updated_at();
    `;
    
    // Execute the SQL using rpc (if available) or try direct SQL execution
    try {
      const { error: sqlError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
      
      if (sqlError) {
        console.log('⚠️  RPC method not available, trying alternative approach...');
        throw sqlError;
      }
      
      console.log('✅ Table created successfully using RPC!');
    } catch (rpcError) {
      console.log('💡 Trying to create table using direct SQL execution...');
      
      // Alternative: Try to create a simple version first
      const simpleSQL = `
        CREATE TABLE IF NOT EXISTS announcements (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title TEXT NOT NULL,
          message TEXT NOT NULL,
          type TEXT NOT NULL,
          is_active BOOLEAN DEFAULT true,
          admin_wallet TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;
      
      // This might not work with anon key, but let's try
      const { error: directError } = await supabase.from('_sql').insert({ query: simpleSQL });
      
      if (directError) {
        console.log('❌ Cannot create table with current permissions.');
        console.log('📋 Please run this SQL manually in your Supabase SQL Editor:');
        console.log('\n' + '='.repeat(60));
        console.log(createTableSQL);
        console.log('='.repeat(60));
        console.log('\n💡 Steps:');
        console.log('1. Go to your Supabase Dashboard');
        console.log('2. Navigate to SQL Editor');
        console.log('3. Copy and paste the SQL above');
        console.log('4. Click "Run"');
        console.log('5. Then run: node scripts/check-announcement-setup.js');
        return;
      }
    }
    
    // Test the table
    console.log('🔍 Testing table creation...');
    const { data: testData, error: testError } = await supabase
      .from('announcements')
      .select('*')
      .limit(1);
    
    if (testError) {
      console.error('❌ Error accessing announcements table:', testError);
    } else {
      console.log('✅ Announcements table is accessible!');
      console.log('📊 Current announcements:', testData?.length || 0);
    }
    
    console.log('\n🎉 Setup completed! You can now:');
    console.log('1. Restart your development server');
    console.log('2. Connect with an admin wallet');
    console.log('3. Use the floating admin button to manage announcements');
    
  } catch (error) {
    console.error('❌ Failed to create announcements table:', error);
    console.log('\n💡 Manual setup required:');
    console.log('Please create the table manually in Supabase SQL Editor.');
  }
}

createAnnouncementsTable();