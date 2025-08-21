#!/usr/bin/env node

/**
 * Script to run database migrations
 * This script will execute the SQL migrations in Supabase
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Database Migration Runner');
console.log('============================');

const migrationsDir = path.join(__dirname, '../supabase/migrations');

if (!fs.existsSync(migrationsDir)) {
  console.error('❌ Migrations directory not found:', migrationsDir);
  process.exit(1);
}

const migrationFiles = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql'))
  .sort();

if (migrationFiles.length === 0) {
  console.log('✅ No migration files found');
  process.exit(0);
}

console.log('📋 Found migration files:');
migrationFiles.forEach((file, index) => {
  console.log(`  ${index + 1}. ${file}`);
});

console.log('\n📝 Migration SQL to run in Supabase:');
console.log('=====================================');

migrationFiles.forEach((file, index) => {
  const filePath = path.join(migrationsDir, file);
  const sql = fs.readFileSync(filePath, 'utf8');
  
  console.log(`\n-- Migration ${index + 1}: ${file}`);
  console.log('-- ' + '='.repeat(50));
  console.log(sql);
  console.log('-- ' + '='.repeat(50));
});

console.log('\n🔧 Instructions:');
console.log('1. Copy the SQL above');
console.log('2. Go to your Supabase dashboard');
console.log('3. Navigate to SQL Editor');
console.log('4. Paste and run each migration');
console.log('5. Verify the tables were created/updated');

console.log('\n✅ Migration runner completed');