const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Make sure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('🔍 Testing Supabase connection...');
    console.log(`📡 URL: ${supabaseUrl}`);
    console.log(`🔑 Key: ${supabaseKey.substring(0, 20)}...`);

    // Test basic connection
    const { data, error } = await supabase
      .from('whitelist_requests')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Connection failed:', error.message);
      console.log('\n💡 Possible solutions:');
      console.log('1. Check if your Supabase project is active');
      console.log('2. Verify the URL and API key are correct');
      console.log('3. Make sure you ran the schema.sql in Supabase SQL Editor');
      console.log('4. Check if Row Level Security policies are configured');
      return;
    }

    console.log('✅ Connection successful!');
    console.log('📊 Database is ready for whitelist operations');

    // Test whitelist table too
    const { data: whitelistData, error: whitelistError } = await supabase
      .from('whitelisted_addresses')
      .select('count')
      .limit(1);

    if (whitelistError) {
      console.warn('⚠️  Whitelist table issue:', whitelistError.message);
    } else {
      console.log('✅ Whitelist table is also ready');
    }

    // Test news cache table
    const { data: newsCacheData, error: newsCacheError } = await supabase
      .from('news_cache')
      .select('count')
      .limit(1);

    if (newsCacheError) {
      console.warn('⚠️  News cache table issue:', newsCacheError.message);
    } else {
      console.log('✅ News cache table is also ready');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testConnection();