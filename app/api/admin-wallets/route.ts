import { NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

interface AdminWallet {
  id?: number;
  address: string;
  label?: string;
  is_active?: boolean;
  added_by?: string;
}

// GET - Fetch all admin wallets
export async function GET() {
  try {
    const supabase = getSupabase();
    
    const { data: adminWallets, error } = await supabase
      .from('admin_wallets')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching admin wallets:', error);
      return NextResponse.json(
        { error: 'Failed to fetch admin wallets' },
        { status: 500 }
      );
    }

    // Return in the same format as the old JSON file for compatibility
    const adminAddresses = adminWallets.map(wallet => wallet.address);
    
    return NextResponse.json({
      adminAddresses,
      adminWallets, // Full data for admin interfaces
      lastUpdated: new Date().toISOString(),
      version: "2.0.0" // Updated version to indicate DB storage
    });

  } catch (error) {
    console.error('Error in admin wallets GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Add new admin wallet
export async function POST(request: Request) {
  try {
    const supabase = getSupabase();
    const body: AdminWallet = await request.json();
    const { address, label, added_by } = body;

    // Validate required fields
    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
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

    // Check if address already exists
    const { data: existingWallet, error: checkError } = await supabase
      .from('admin_wallets')
      .select('id, is_active')
      .eq('address', address.toLowerCase())
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing admin wallet:', checkError);
      return NextResponse.json(
        { error: 'Failed to check existing admin wallets' },
        { status: 500 }
      );
    }

    if (existingWallet) {
      if (existingWallet.is_active) {
        return NextResponse.json(
          { error: 'This wallet address is already an active admin' },
          { status: 409 }
        );
      } else {
        // Reactivate existing inactive admin
        const { data: updatedWallet, error: updateError } = await supabase
          .from('admin_wallets')
          .update({ is_active: true, label, added_by })
          .eq('address', address.toLowerCase())
          .select()
          .single();

        if (updateError) {
          console.error('Error reactivating admin wallet:', updateError);
          return NextResponse.json(
            { error: 'Failed to reactivate admin wallet' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Admin wallet reactivated successfully',
          adminWallet: updatedWallet
        });
      }
    }

    // Create new admin wallet
    const { data: newAdminWallet, error: insertError } = await supabase
      .from('admin_wallets')
      .insert({
        address: address.toLowerCase(),
        label: label || null,
        added_by: added_by || 'api',
        is_active: true
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting admin wallet:', insertError);
      return NextResponse.json(
        { error: 'Failed to add admin wallet' },
        { status: 500 }
      );
    }

    console.log(`✅ New admin wallet added: ${address}`);

    return NextResponse.json({
      success: true,
      message: 'Admin wallet added successfully',
      adminWallet: newAdminWallet
    });

  } catch (error) {
    console.error('Error processing admin wallet request:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

// DELETE - Remove admin wallet (set inactive)
export async function DELETE(request: Request) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      );
    }

    // Set admin wallet as inactive instead of deleting
    const { data: updatedWallet, error: updateError } = await supabase
      .from('admin_wallets')
      .update({ is_active: false })
      .eq('address', address.toLowerCase())
      .select()
      .single();

    if (updateError) {
      console.error('Error deactivating admin wallet:', updateError);
      return NextResponse.json(
        { error: 'Failed to remove admin wallet' },
        { status: 500 }
      );
    }

    console.log(`✅ Admin wallet deactivated: ${address}`);

    return NextResponse.json({
      success: true,
      message: 'Admin wallet removed successfully',
      adminWallet: updatedWallet
    });

  } catch (error) {
    console.error('Error removing admin wallet:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}