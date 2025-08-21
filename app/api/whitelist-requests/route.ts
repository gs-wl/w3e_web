import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data: requests, error } = await supabase
      .from('whitelist_requests')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Error loading whitelist requests from Supabase:', error);
      return NextResponse.json(
        { error: 'Failed to load whitelist requests' }, 
        { status: 500 }
      );
    }

    console.log('📋 API: Serving whitelist requests with', requests?.length || 0, 'requests');
    
    // Transform snake_case to camelCase for frontend compatibility
    const transformedRequests = (requests || []).map(request => ({
      id: request.id,
      walletAddress: request.wallet_address,
      name: request.nickname || request.name, // Use nickname if available, fallback to name for backward compatibility
      email: request.email,
      company: request.company,
      reason: request.reason,
      defiExperience: request.defi_experience,
      submittedAt: request.submitted_at,
      status: request.status
    }));
    
    // Format response to match existing structure
    const response = {
      requests: transformedRequests,
      lastUpdated: new Date().toISOString(),
      version: '1.0.0'
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error loading whitelist requests from API:', error);
    return NextResponse.json(
      { error: 'Failed to load whitelist requests' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabase();
    const body = await request.json();
    const { action, requestId, walletAddress } = body;

    if (action === 'approve' && requestId && walletAddress) {
      // Start a transaction-like operation
      
      // First, check if address is already whitelisted
      const { data: existingWhitelist, error: checkError } = await supabase
        .from('whitelisted_addresses')
        .select('id')
        .eq('address', walletAddress.toLowerCase())
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing whitelist:', checkError);
        return NextResponse.json(
          { error: 'Failed to check whitelist status' },
          { status: 500 }
        );
      }

      // Add to whitelist if not already there
      if (!existingWhitelist) {
        const { error: whitelistError } = await supabase
          .from('whitelisted_addresses')
          .insert({
            address: walletAddress.toLowerCase(),
            added_at: new Date().toISOString()
          });

        if (whitelistError) {
          console.error('Error adding to whitelist:', whitelistError);
          return NextResponse.json(
            { error: 'Failed to add address to whitelist' },
            { status: 500 }
          );
        }
      }
      
      // Update request status to approved
      const { error: updateError } = await supabase
        .from('whitelist_requests')
        .update({ status: 'approved' })
        .eq('id', requestId);

      if (updateError) {
        console.error('Error updating request status:', updateError);
        return NextResponse.json(
          { error: 'Failed to update request status' },
          { status: 500 }
        );
      }
      
      console.log(`✅ Approved whitelist request ${requestId} for address ${walletAddress}`);
      
      return NextResponse.json({ success: true, message: 'Request approved and address whitelisted' });
    }
    
    if (action === 'reject' && requestId) {
      // Update request status to rejected
      const { error: updateError } = await supabase
        .from('whitelist_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (updateError) {
        console.error('Error updating request status:', updateError);
        return NextResponse.json(
          { error: 'Failed to update request status' },
          { status: 500 }
        );
      }
      
      console.log(`❌ Rejected whitelist request ${requestId}`);
      
      return NextResponse.json({ success: true, message: 'Request rejected' });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error processing whitelist request action:', error);
    return NextResponse.json(
      { error: 'Failed to process request' }, 
      { status: 500 }
    );
  }
}