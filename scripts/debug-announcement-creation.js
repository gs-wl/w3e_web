require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

console.log('🔍 Debugging Announcement Creation...');
console.log('==================================================');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAdminWallets() {
  console.log('\n👤 Checking admin wallets...');
  
  const { data, error } = await supabase
    .from('admin_wallets')
    .select('*');
  
  if (error) {
    console.log('❌ Error fetching admin wallets:', error.message);
    return [];
  }
  
  console.log(`✅ Found ${data.length} admin wallets:`);
  data.forEach(wallet => {
    console.log(`- ${wallet.address} (active: ${wallet.is_active})`);
  });
  
  return data;
}

async function testAnnouncementCreation() {
  console.log('\n📝 Testing announcement creation...');
  
  const adminWallets = await checkAdminWallets();
  
  if (adminWallets.length === 0) {
    console.log('❌ No admin wallets found. Cannot test announcement creation.');
    return;
  }
  
  const testWallet = adminWallets[0].address;
  console.log(`Using admin wallet: ${testWallet}`);
  
  // Test creating an announcement via API
  try {
    const response = await fetch('http://localhost:3000/api/announcements', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Test Announcement',
        message: 'This is a test announcement created via script',
        type: 'info',
        admin_wallet: testWallet
      })
    });
    
    const responseText = await response.text();
    console.log('\n📡 API Response:');
    console.log('Status:', response.status);
    console.log('Response:', responseText);
    
    if (response.ok) {
      console.log('✅ Announcement created successfully via API');
      
      // Check if it appears in database
      const { data: announcements, error } = await supabase
        .from('announcements')
        .select('*');
      
      if (error) {
        console.log('❌ Error checking database:', error.message);
      } else {
        console.log(`\n📊 Database now contains ${announcements.length} announcements`);
        if (announcements.length > 0) {
          console.log('Latest announcement:', announcements[announcements.length - 1]);
        }
      }
    } else {
      console.log('❌ Failed to create announcement via API');
    }
  } catch (err) {
    console.log('❌ Error testing API:', err.message);
  }
}

async function checkTablePermissions() {
  console.log('\n🔐 Checking table permissions...');
  
  // Test direct insert
  const { data, error } = await supabase
    .from('announcements')
    .insert({
      title: 'Direct Insert Test',
      message: 'Testing direct database insert',
      type: 'info',
      admin_wallet: 'test-wallet',
      is_active: true
    })
    .select();
  
  if (error) {
    console.log('❌ Direct insert failed:', error.message);
    console.log('This might indicate RLS (Row Level Security) is blocking inserts');
  } else {
    console.log('✅ Direct insert successful:', data);
  }
}

async function runDebug() {
  await checkAdminWallets();
  await checkTablePermissions();
  await testAnnouncementCreation();
}

runDebug().catch(console.error);