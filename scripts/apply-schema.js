const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applySchema() {
  try {
    console.log('🔄 Applying database schema...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, '..', 'supabase', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split the schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        console.error(`❌ Error executing statement ${i + 1}:`, error);
        console.log('Statement:', statement);
        // Continue with other statements
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`);
      }
    }
    
    console.log('🎉 Schema application completed!');
    
    // Test the tables
    console.log('🔍 Testing table creation...');
    
    const { data: adminWallets, error: adminError } = await supabase
      .from('admin_wallets')
      .select('*')
      .limit(1);
    
    if (adminError) {
      console.error('❌ Error accessing admin_wallets table:', adminError);
    } else {
      console.log('✅ admin_wallets table accessible');
      console.log('📊 Admin wallets:', adminWallets);
    }
    
    const { data: announcements, error: announcementError } = await supabase
      .from('announcements')
      .select('*')
      .limit(1);
    
    if (announcementError) {
      console.error('❌ Error accessing announcements table:', announcementError);
    } else {
      console.log('✅ announcements table accessible');
      console.log('📊 Announcements:', announcements);
    }
    
  } catch (error) {
    console.error('❌ Failed to apply schema:', error);
    process.exit(1);
  }
}

applySchema();