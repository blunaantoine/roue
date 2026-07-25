import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: List all campaigns
export async function GET() {
  try {
    const campaigns = await db.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        wheelConfig: true,
        _count: {
          select: { prizes: true, codes: true, participations: true },
        },
      },
    });
    return NextResponse.json(campaigns);
  } catch (error) {
    console.error('Error listing campaigns:', error);
    return NextResponse.json({ error: 'Failed to list campaigns' }, { status: 500 });
  }
}

// POST: Create a new campaign (with auto-creation of WheelConfig)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, startDate, endDate, active } = body;

    if (!name) {
      return NextResponse.json({ error: 'Campaign name is required' }, { status: 400 });
    }

    const campaign = await db.campaign.create({
      data: {
        name,
        description,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        active: active ?? true,
        wheelConfig: {
          create: {},
        },
      },
      include: {
        wheelConfig: true,
        _count: {
          select: { prizes: true, codes: true, participations: true },
        },
      },
    });

    // Log admin action
    await db.adminLog.create({
      data: {
        action: 'create_campaign',
        details: `Created campaign: ${name}`,
        adminName: 'admin',
        campaignId: campaign.id,
      },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}
