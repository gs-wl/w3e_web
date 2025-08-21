#!/usr/bin/env node

/**
 * Test script for cache cleanup functionality
 * This script tests the cache cleanup API endpoints
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const CACHE_FILE_PATH = path.join(__dirname, '..', 'src', 'data', 'news-cache.json');

async function testCleanup() {
  console.log('🧪 Testing Cache Cleanup System\n');
  
  try {
    // Test 1: Check scheduler status
    console.log('1. Checking scheduler status...');
    const schedulerResponse = await fetch(`${BASE_URL}/api/news/cache/scheduler`);
    const schedulerData = await schedulerResponse.json();
    console.log('   Scheduler Status:', schedulerData);
    
    // Test 2: Check cache status
    console.log('\n2. Checking cache status...');
    const cacheStatusResponse = await fetch(`${BASE_URL}/api/news/cache/cleanup`);
    const cacheStatusData = await cacheStatusResponse.json();
    console.log('   Cache Status:', cacheStatusData);
    
    // Test 3: Create a test expired cache file
    console.log('\n3. Creating test expired cache...');
    const expiredDate = new Date(Date.now() - (25 * 60 * 60 * 1000)); // 25 hours ago
    const testCache = {
      twitterPosts: [{ id: 'test1', content: 'Test tweet' }],
      aiNews: [{ id: 'test2', title: 'Test news' }],
      lastUpdated: expiredDate.toISOString(),
      version: 1
    };
    
    // Backup existing cache if it exists
    let backupCache = null;
    if (fs.existsSync(CACHE_FILE_PATH)) {
      backupCache = fs.readFileSync(CACHE_FILE_PATH, 'utf8');
      console.log('   Backed up existing cache');
    }
    
    // Write expired cache
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(testCache, null, 2));
    console.log('   Created expired cache file (25 hours old)');
    
    // Test 4: Trigger manual cleanup
    console.log('\n4. Triggering manual cleanup...');
    const cleanupResponse = await fetch(`${BASE_URL}/api/news/cache/cleanup`, {
      method: 'POST'
    });
    const cleanupData = await cleanupResponse.json();
    console.log('   Cleanup Result:', cleanupData);
    
    // Test 5: Verify cache was deleted
    console.log('\n5. Verifying cache deletion...');
    const cacheExists = fs.existsSync(CACHE_FILE_PATH);
    console.log('   Cache file exists after cleanup:', cacheExists);
    
    if (cleanupData.cleaned && !cacheExists) {
      console.log('   ✅ Cleanup successful - expired cache was deleted');
    } else if (!cleanupData.cleaned && cacheExists) {
      console.log('   ⚠️  Cache was not cleaned (might not be expired)');
    } else {
      console.log('   ❌ Unexpected cleanup result');
    }
    
    // Test 6: Test scheduler control
    console.log('\n6. Testing scheduler control...');
    
    // Start scheduler
    const startResponse = await fetch(`${BASE_URL}/api/news/cache/scheduler`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start' })
    });
    const startData = await startResponse.json();
    console.log('   Start scheduler:', startData.message);
    
    // Check status
    const statusResponse = await fetch(`${BASE_URL}/api/news/cache/scheduler`);
    const statusData = await statusResponse.json();
    console.log('   Scheduler running:', statusData.scheduler?.isRunning);
    
    // Restore backup if it existed
    if (backupCache) {
      fs.writeFileSync(CACHE_FILE_PATH, backupCache);
      console.log('\n   Restored original cache file');
    }
    
    console.log('\n🎉 Cache cleanup test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    // Try to restore backup on error
    if (backupCache) {
      try {
        fs.writeFileSync(CACHE_FILE_PATH, backupCache);
        console.log('   Restored original cache file after error');
      } catch (restoreError) {
        console.error('   Failed to restore cache:', restoreError.message);
      }
    }
  }
}

// Run the test
if (require.main === module) {
  testCleanup();
}

module.exports = { testCleanup };