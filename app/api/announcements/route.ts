import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key for admin operations, fallback to anon key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Announcement {
  id?: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'urgent';
  created_at?: string;
  is_active: boolean;
  admin_wallet: string;
}

// GET - Fetch all active announcements
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching announcements:', error);
      return NextResponse.json({ error: 'Failed to fetch announcements' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new announcement (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, message, type, admin_wallet } = body;

    // Validate required fields
    if (!title || !message || !type || !admin_wallet) {
      return NextResponse.json(
        { error: 'Missing required fields: title, message, type, admin_wallet' },
        { status: 400 }
      );
    }

    // Validate admin wallet (check against admin_wallets table)
    const { data: adminCheck, error: adminError } = await supabase
      .from('admin_wallets')
      .select('address')
      .eq('address', admin_wallet)
      .eq('is_active', true)
      .single();

    if (adminError || !adminCheck) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid admin wallet' },
        { status: 403 }
      );
    }

    // Create announcement
    const { data, error } = await supabase
      .from('announcements')
      .insert({
        title,
        message,
        type,
        admin_wallet,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating announcement:', error);
      return NextResponse.json({ error: 'Failed to create announcement' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update announcement (admin only)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, message, type, is_active, admin_wallet } = body;

    if (!id || !admin_wallet) {
      return NextResponse.json(
        { error: 'Missing required fields: id, admin_wallet' },
        { status: 400 }
      );
    }

    // Validate admin wallet
    const { data: adminCheck, error: adminError } = await supabase
      .from('admin_wallets')
      .select('address')
      .eq('address', admin_wallet)
      .eq('is_active', true)
      .single();

    if (adminError || !adminCheck) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid admin wallet' },
        { status: 403 }
      );
    }

    // Update announcement
    const updateData: any = { updated_at: new Date().toISOString() };
    if (title !== undefined) updateData.title = title;
    if (message !== undefined) updateData.message = message;
    if (type !== undefined) updateData.type = type;
    if (is_active !== undefined) updateData.is_active = is_active;

    const { data, error } = await supabase
      .from('announcements')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating announcement:', error);
      return NextResponse.json({ error: 'Failed to update announcement' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete announcement (admin only)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const admin_wallet = searchParams.get('admin_wallet');

    if (!id || !admin_wallet) {
      return NextResponse.json(
        { error: 'Missing required parameters: id, admin_wallet' },
        { status: 400 }
      );
    }

    // Validate admin wallet
    const { data: adminCheck, error: adminError } = await supabase
      .from('admin_wallets')
      .select('address')
      .eq('address', admin_wallet)
      .eq('is_active', true)
      .single();

    if (adminError || !adminCheck) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid admin wallet' },
        { status: 403 }
      );
    }

    // Delete announcement
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting announcement:', error);
      return NextResponse.json({ error: 'Failed to delete announcement' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}