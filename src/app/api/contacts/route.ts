import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: List contacts (filter by campaignId)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId query param is required' }, { status: 400 });
    }

    const contacts = await db.whatsAppContact.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(contacts);
  } catch (error) {
    console.error('Error listing contacts:', error);
    return NextResponse.json({ error: 'Failed to list contacts' }, { status: 500 });
  }
}

// POST: Create contact
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, notes, campaignId } = body;

    if (!name || !phone || !campaignId) {
      return NextResponse.json({ error: 'name, phone, and campaignId are required' }, { status: 400 });
    }

    const campaign = await db.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const contact = await db.whatsAppContact.create({
      data: { name, phone, notes, campaignId },
    });

    // Log admin action
    await db.adminLog.create({
      data: {
        action: 'create_contact',
        details: `Created WhatsApp contact: ${name}`,
        adminName: 'admin',
        campaignId,
      },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (error) {
    console.error('Error creating contact:', error);
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 });
  }
}

// PUT: Update contact
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, phone, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const existing = await db.whatsAppContact.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const contact = await db.whatsAppContact.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(notes !== undefined && { notes }),
      },
    });

    // Log admin action
    await db.adminLog.create({
      data: {
        action: 'update_contact',
        details: `Updated WhatsApp contact: ${contact.name}`,
        adminName: 'admin',
        campaignId: existing.campaignId,
      },
    });

    return NextResponse.json(contact);
  } catch (error) {
    console.error('Error updating contact:', error);
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 });
  }
}

// DELETE: Delete contact (use query param id)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id query param is required' }, { status: 400 });
    }

    const existing = await db.whatsAppContact.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    await db.whatsAppContact.delete({ where: { id } });

    // Log admin action
    await db.adminLog.create({
      data: {
        action: 'delete_contact',
        details: `Deleted WhatsApp contact: ${existing.name}`,
        adminName: 'admin',
        campaignId: existing.campaignId,
      },
    });

    return NextResponse.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    console.error('Error deleting contact:', error);
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 });
  }
}
