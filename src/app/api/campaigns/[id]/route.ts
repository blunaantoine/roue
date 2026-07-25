import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: Get campaign by ID (include prizes, wheelConfig)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const campaign = await db.campaign.findUnique({
      where: { id },
      include: {
        prizes: { orderBy: { sortOrder: 'asc' } },
        wheelConfig: true,
        _count: {
          select: { codes: true, participations: true, contacts: true, promotionMessages: true },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    return NextResponse.json(campaign);
  } catch (error) {
    console.error('Error getting campaign:', error);
    return NextResponse.json({ error: 'Failed to get campaign' }, { status: 500 });
  }
}

// PUT: Update campaign
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, startDate, endDate, active } = body;

    const existing = await db.campaign.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const campaign = await db.campaign.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(startDate !== undefined && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(active !== undefined && { active }),
      },
      include: {
        prizes: { orderBy: { sortOrder: 'asc' } },
        wheelConfig: true,
      },
    });

    // Log admin action
    await db.adminLog.create({
      data: {
        action: 'update_campaign',
        details: `Updated campaign: ${campaign.name}`,
        adminName: 'admin',
        campaignId: id,
      },
    });

    return NextResponse.json(campaign);
  } catch (error) {
    console.error('Error updating campaign:', error);
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
  }
}

// DELETE: Delete campaign
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.campaign.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    await db.campaign.delete({ where: { id } });

    // Log admin action
    await db.adminLog.create({
      data: {
        action: 'delete_campaign',
        details: `Deleted campaign: ${existing.name}`,
        adminName: 'admin',
        campaignId: null,
      },
    });

    return NextResponse.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json({ error: 'Failed to delete campaign' }, { status: 500 });
  }
}
