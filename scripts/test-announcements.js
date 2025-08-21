require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

console.log('🧪 Testing Announcement System...');
console.log('==================================================');

// Check environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.log('❌ Missing environment variables');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAnnouncementsTable() {
  try {
    console.log('\n📊 Testing announcements table access...');
    
    // Test reading from announcements table
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .limit(5);
    
    if (error) {
      console.log('❌ Error accessing announcements table:', error.message);
      return false;
    }
    
    console.log('✅ Successfully connected to announcements table');
    console.log(`📝 Found ${data.length} announcements`);
    
    if (data.length > 0) {
      console.log('\n📋 Sample announcement:');
      console.log('- ID:', data[0].id);
      console.log('- Title:', data[0].title);
      console.log('- Type:', data[0].type);
      console.log('- Active:', data[0].is_active);
    }
    
    return true;
  } catch (err) {
    console.log('❌ Unexpected error:', err.message);
    return false;
  }
}

async function testApiEndpoint() {
  try {
    console.log('\n🌐 Testing API endpoint...');
    
    const response = await fetch('http://localhost:3000/api/announcements');
    
    if (!response.ok) {
      console.log('❌ API endpoint returned error:', response.status, response.statusText);
      return false;
    }
    
    const data = await response.json();
    console.log('✅ API endpoint working');
    console.log(`📝 API returned ${data.length} announcements`);
    
    return true;
  } catch (err) {
    console.log('❌ Error testing API endpoint:', err.message);
    console.log('💡 Make sure the development server is running (npm run dev)');
    return false;
  }
}

async function runTests() {
  const tableTest = await testAnnouncementsTable();
  const apiTest = await testApiEndpoint();
  
  console.log('\n==================================================');
  console.log('📊 Test Results:');
  console.log('Database Table:', tableTest ? '✅ Working' : '❌ Failed');
  console.log('API Endpoint:', apiTest ? '✅ Working' : '❌ Failed');
  
  if (tableTest && apiTest) {
    console.log('\n🎉 Announcement system is fully functional!');
    console.log('\n🚀 Next steps:');
    console.log('1. Visit your app to see the announcement bar');
    console.log('2. Connect an admin wallet to access the admin panel');
    console.log('3. Create your first announcement!');
  } else {
    console.log('\n⚠️  Some issues found. Please check the errors above.');
  }
}

runTests().catch(console.error);