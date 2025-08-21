import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data: addresses, error } = await supabase
      .from('whitelisted_addresses')
      .select('address')
      .order('added_at', { ascending: false });

    if (error) {
      console.error('Error loading whitelist from Supabase:', error);
      return NextResponse.json(
        { error: 'Failed to load whitelist' }, 
        { status: 500 }
      );
    }

    // Format response to match existing structure
    const whitelist = {
      whitelistedAddresses: addresses?.map(item => item.address) || [],
      lastUpdated: new Date().toISOString(),
      version: '1.0.0'
    };
    
    console.log('📋 API: Serving whitelist with', whitelist.whitelistedAddresses.length, 'addresses');
    
    return NextResponse.json(whitelist, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error loading whitelist from API:', error);
    return NextResponse.json(
      { error: 'Failed to load whitelist' }, 
      { status: 500 }
    );
  }
}