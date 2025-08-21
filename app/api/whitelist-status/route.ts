import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    const lowerAddress = address.toLowerCase();

    // Check whitelist requests
    const { data: requests, error: requestError } = await supabase
      .from('whitelist_requests')
      .select('*')
      .eq('wallet_address', lowerAddress)
      .order('submitted_at', { ascending: false });

    if (requestError) {
      console.error('Error checking whitelist requests:', requestError);
      return NextResponse.json(
        { error: 'Failed to check request status' },
        { status: 500 }
      );
    }

    // Check if already whitelisted
    const { data: whitelisted, error: whitelistError } = await supabase
      .from('whitelisted_addresses')
      .select('*')
      .eq('address', lowerAddress)
      .single();

    if (whitelistError && whitelistError.code !== 'PGRST116') {
      console.error('Error checking whitelist status:', whitelistError);
      return NextResponse.json(
        { error: 'Failed to check whitelist status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      address: lowerAddress,
      isWhitelisted: !!whitelisted,
      whitelistDetails: whitelisted || null,
      requests: requests || [],
      hasActiveRequest: requests && requests.length > 0 && requests[0].status === 'pending',
      latestRequest: requests && requests.length > 0 ? requests[0] : null
    });

  } catch (error) {
    console.error('Error checking whitelist status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}