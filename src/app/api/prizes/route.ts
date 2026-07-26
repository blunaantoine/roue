import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: List prizes (filter by campaignId query param)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId query param is required' }, { status: 400 });
    }

    const prizes = await db.prize.findMany({
      where: { campaignId },
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { codes: true, participations: true },
        },
      },
    });

    return NextResponse.json(prizes);
  } catch (error) {
    console.error('Error listing prizes:', error);
    return NextResponse.json({ error: 'Failed to list prizes' }, { status: 500 });
  }
}

// POST: Create a new prize
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, imageUrl, color, icon, isLosing, sectorLabel, sectorPosition, quantity, sortOrder, active, campaignId } = body;

    if (!name || !campaignId) {
      return NextResponse.json({ error: 'Prize name and campaignId are required' }, { status: 400 });
    }

    // Verify campaign exists
    const campaign = await db.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const prize = await db.prize.create({
      data: {
        name,
        description,
        imageUrl,
        color: color ?? '#FF6B6B',
        icon,
        isLosing: isLosing ?? false,
        sectorLabel,
        sectorPosition,
        quantity,
        sortOrder: sortOrder ?? 0,
        active: active ?? true,
        campaignId,
      },
    });

    // Log admin action
    await db.adminLog.create({
      data: {
        action: 'create_prize',
        details: `Created prize: ${name} for campaign ${campaignId}`,
        adminName: 'admin',
        campaignId,
      },
    });

    return NextResponse.json(prize, { status: 201 });
  } catch (error) {
    console.error('Error creating prize:', error);
    return NextResponse.json({ error: 'Failed to create prize' }, { status: 500 });
  }
}
