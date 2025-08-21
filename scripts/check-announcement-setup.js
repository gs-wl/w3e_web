const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function checkSetup() {
  console.log('🔍 Checking Announcement System Setup...');
  console.log('=' .repeat(50));
  
  // Check environment variables
  console.log('📋 Environment Variables:');
  if (!supabaseUrl) {
    console.log('❌ NEXT_PUBLIC_SUPABASE_URL: Missing');
  } else {
    console.log(`✅ NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl.substring(0, 30)}...`);
  }
  
  if (!supabaseServiceKey) {
    console.log('❌ SUPABASE_SERVICE_ROLE_KEY: Missing');
  } else {
    console.log(`✅ SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey.substring(0, 20)}...`);
  }
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('\n❌ Setup incomplete. Please configure environment variables first.');
    console.log('📖 See ANNOUNCEMENT_SETUP.md for instructions.');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  console.log('\n🔗 Database Connection:');
  
  try {
    // Test basic connection
    const { data, error } = await supabase.from('admin_wallets').select('count').limit(1);
    
    if (error) {
      if (error.message.includes('relation "admin_wallets" does not exist')) {
        console.log('❌ Tables not created yet');
        console.log('🔧 Run: node scripts/apply-schema.js');
        return;
      } else {
        console.log('❌ Connection failed:', error.message);
        return;
      }
    }
    
    console.log('✅ Database connection successful');
    
    // Check tables
    console.log('\n📊 Database Tables:');
    
    // Check admin_wallets table
    const { data: adminWallets, error: adminError } = await supabase
      .from('admin_wallets')
      .select('*');
    
    if (adminError) {
      console.log('❌ admin_wallets table:', adminError.message);
    } else {
      console.log(`✅ admin_wallets table: ${adminWallets.length} admin(s)`);
      adminWallets.forEach(admin => {
        console.log(`   - ${admin.address} (${admin.name || 'Unnamed'})`);
      });
    }
    
    // Check announcements table
    const { data: announcements, error: announcementError } = await supabase
      .from('announcements')
      .select('*');
    
    if (announcementError) {
      console.log('❌ announcements table:', announcementError.message);
    } else {
      console.log(`✅ announcements table: ${announcements.length} announcement(s)`);
      announcements.forEach(announcement => {
        console.log(`   - ${announcement.title} (${announcement.type}, active: ${announcement.is_active})`);
      });
    }
    
    // Test API endpoint
    console.log('\n🌐 API Endpoints:');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/announcements`);
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ GET /api/announcements: ${data.announcements?.length || 0} announcements`);
      } else {
        console.log(`❌ GET /api/announcements: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.log('❌ API endpoint test failed:', error.message);
      console.log('💡 Make sure your development server is running');
    }
    
    console.log('\n🎉 Setup Status:');
    if (adminWallets.length === 0) {
      console.log('⚠️  No admin wallets configured');
      console.log('💡 Add your wallet address to admin_wallets table');
    } else {
      console.log('✅ Announcement system is ready!');
      console.log('🔧 Connect with an admin wallet to see the admin button');
    }
    
  } catch (error) {
    console.log('❌ Setup check failed:', error.message);
  }
}

checkSetup();