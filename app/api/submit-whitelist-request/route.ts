import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

interface WhitelistRequestInput {
  walletAddress: string;
  nickname?: string;
  email: string;
  participateAirdrops: boolean;
  joinCompetitions: boolean;
  bugBountyInterest: boolean;
}

function generateRequestId(): string {
  return 'req_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

export async function POST(request: Request) {
  try {
    const supabase = getSupabase();
    const body: WhitelistRequestInput = await request.json();
    
    console.log('📝 Received whitelist request body:', body);
    
    const { walletAddress, nickname, email, participateAirdrops, joinCompetitions, bugBountyInterest } = body;

    // Validate required fields
    if (!walletAddress || !email) {
      console.error('❌ Missing required fields:', { walletAddress: !!walletAddress, email: !!email });
      return NextResponse.json(
        { error: 'Missing required fields: walletAddress and email are required' },
        { status: 400 }
      );
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      );
    }

    // Check if wallet address already has a request
    const { data: existingRequests, error: checkError } = await supabase
      .from('whitelist_requests')
      .select('id, status, email, submitted_at')
      .eq('wallet_address', walletAddress.toLowerCase());

    if (checkError) {
      console.error('❌ Error checking existing request:', checkError);
      return NextResponse.json(
        { error: 'Failed to check existing requests' },
        { status: 500 }
      );
    }

    console.log('🔍 Existing requests found:', existingRequests);

    if (existingRequests && existingRequests.length > 0) {
      const existingRequest = existingRequests[0];
      
      if (existingRequest.status === 'pending') {
        return NextResponse.json(
          { 
            error: 'A whitelist request for this wallet address is already pending review',
            details: {
              submittedAt: existingRequest.submitted_at,
              email: existingRequest.email
            }
          },
          { status: 409 }
        );
      }
      if (existingRequest.status === 'approved') {
        return NextResponse.json(
          { 
            error: 'This wallet address has already been approved and whitelisted',
            details: {
              approvedAt: existingRequest.submitted_at
            }
          },
          { status: 409 }
        );
      }
      if (existingRequest.status === 'rejected') {
        // Allow resubmission if previously rejected
        console.log('📝 Previous request was rejected, allowing resubmission');
      }
    }

    // Check if address is already whitelisted
    const { data: whitelistedAddress, error: whitelistError } = await supabase
      .from('whitelisted_addresses')
      .select('id')
      .eq('address', walletAddress.toLowerCase())
      .single();

    if (whitelistError && whitelistError.code !== 'PGRST116') {
      console.error('Error checking whitelist:', whitelistError);
      return NextResponse.json(
        { error: 'Failed to check whitelist status' },
        { status: 500 }
      );
    }

    if (whitelistedAddress) {
      return NextResponse.json(
        { error: 'This wallet address is already whitelisted' },
        { status: 409 }
      );
    }

    // Create new request
    const requestId = generateRequestId();
    
    // Try new schema first, fallback to old schema if columns don't exist
    let insertData: any = {
      id: requestId,
      wallet_address: walletAddress.toLowerCase(),
      email,
      submitted_at: new Date().toISOString(),
      status: 'pending'
    };

    // Try to add new fields, but fallback to old schema if they don't exist
    try {
      insertData = {
        ...insertData,
        nickname: nickname || null,
        participate_airdrops: participateAirdrops || false,
        join_competitions: joinCompetitions || false,
        bug_bounty_interest: bugBountyInterest || false,
      };
    } catch (error) {
      console.log('📝 Using new schema fields');
    }
    
    console.log('📝 Attempting to insert data:', insertData);
    
    let { data: newRequest, error: insertError } = await supabase
      .from('whitelist_requests')
      .insert(insertData)
      .select()
      .single();

    // If insert failed due to missing columns, try with old schema
    if (insertError && insertError.code === '42703') { // Column does not exist
      console.log('📝 New columns not found, trying with old schema...');
      
      const oldSchemaData = {
        id: requestId,
        wallet_address: walletAddress.toLowerCase(),
        name: nickname || 'Anonymous',
        email,
        company: '',
        reason: `Participation preferences: Airdrops: ${participateAirdrops}, Competitions: ${joinCompetitions}, Bug Bounty: ${bugBountyInterest}`,
        defi_experience: '',
        submitted_at: new Date().toISOString(),
        status: 'pending'
      };
      
      const result = await supabase
        .from('whitelist_requests')
        .insert(oldSchemaData)
        .select()
        .single();
        
      newRequest = result.data;
      insertError = result.error;
    }

    if (insertError) {
      console.error('❌ Error inserting whitelist request:', insertError);
      console.error('❌ Insert error details:', {
        code: insertError.code,
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint
      });
      
      // Handle duplicate key constraint violation
      if (insertError.code === '23505') { // Unique constraint violation
        return NextResponse.json(
          { 
            error: 'A whitelist request for this wallet address already exists. Please check your previous submission or contact support if you believe this is an error.',
            code: 'DUPLICATE_REQUEST'
          },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: `Failed to submit request: ${insertError.message}` },
        { status: 500 }
      );
    }

    console.log(`✅ New whitelist request submitted: ${requestId} for ${walletAddress}`);

    return NextResponse.json({
      success: true,
      message: 'Whitelist request submitted successfully',
      requestId: requestId
    });

  } catch (error) {
    console.error('Error processing whitelist request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}