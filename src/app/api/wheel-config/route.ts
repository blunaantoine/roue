import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: Get wheel config for a campaign (query param campaignId)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId query param is required' }, { status: 400 });
    }

    const wheelConfig = await db.wheelConfig.findUnique({
      where: { campaignId },
    });

    if (!wheelConfig) {
      return NextResponse.json({ error: 'Wheel config not found for this campaign' }, { status: 404 });
    }

    return NextResponse.json(wheelConfig);
  } catch (error) {
    console.error('Error getting wheel config:', error);
    return NextResponse.json({ error: 'Failed to get wheel config' }, { status: 500 });
  }
}

// PUT: Update wheel config
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      campaignId,
      spinDuration,
      minRotations,
      maxRotations,
      pointerColor,
      centerColor,
      outerRingColor,
      backgroundColor,
      textColor,
      fontSize,
    } = body;

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId is required' }, { status: 400 });
    }

    const existing = await db.wheelConfig.findUnique({ where: { campaignId } });
    if (!existing) {
      return NextResponse.json({ error: 'Wheel config not found for this campaign' }, { status: 404 });
    }

    const wheelConfig = await db.wheelConfig.update({
      where: { campaignId },
      data: {
        ...(spinDuration !== undefined && { spinDuration }),
        ...(minRotations !== undefined && { minRotations }),
        ...(maxRotations !== undefined && { maxRotations }),
        ...(pointerColor !== undefined && { pointerColor }),
        ...(centerColor !== undefined && { centerColor }),
        ...(outerRingColor !== undefined && { outerRingColor }),
        ...(backgroundColor !== undefined && { backgroundColor }),
        ...(textColor !== undefined && { textColor }),
        ...(fontSize !== undefined && { fontSize }),
      },
    });

    // Log admin action
    await db.adminLog.create({
      data: {
        action: 'update_wheel_config',
        details: `Updated wheel config for campaign ${campaignId}`,
        adminName: 'admin',
        campaignId,
      },
    });

    return NextResponse.json(wheelConfig);
  } catch (error) {
    console.error('Error updating wheel config:', error);
    return NextResponse.json({ error: 'Failed to update wheel config' }, { status: 500 });
  }
}
