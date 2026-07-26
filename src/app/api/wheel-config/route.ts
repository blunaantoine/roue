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
      // Auto-create default wheel config
      const newConfig = await db.wheelConfig.create({
        data: {
          campaignId,
          sectorCount: 10,
          losingSectorCount: 4,
          spinDuration: 5000,
          minRotations: 3,
          maxRotations: 7,
          pointerColor: '#FF0000',
          centerColor: '#FFFFFF',
          outerRingColor: '#333333',
          backgroundColor: '#1a1a2e',
          textColor: '#FFFFFF',
          fontSize: 14,
          soundEnabled: true,
        },
      });
      return NextResponse.json(newConfig);
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
      sectorCount,
      losingSectorCount,
      spinDuration,
      minRotations,
      maxRotations,
      pointerColor,
      centerColor,
      outerRingColor,
      backgroundColor,
      textColor,
      fontSize,
      soundEnabled,
    } = body;

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId is required' }, { status: 400 });
    }

    const existing = await db.wheelConfig.findUnique({ where: { campaignId } });
    if (!existing) {
      // Create if not exists
      const newConfig = await db.wheelConfig.create({
        data: {
          campaignId,
          sectorCount: sectorCount ?? 10,
          losingSectorCount: losingSectorCount ?? 4,
          spinDuration: spinDuration ?? 5000,
          minRotations: minRotations ?? 3,
          maxRotations: maxRotations ?? 7,
          pointerColor: pointerColor ?? '#FF0000',
          centerColor: centerColor ?? '#FFFFFF',
          outerRingColor: outerRingColor ?? '#333333',
          backgroundColor: backgroundColor ?? '#1a1a2e',
          textColor: textColor ?? '#FFFFFF',
          fontSize: fontSize ?? 14,
          soundEnabled: soundEnabled ?? true,
        },
      });
      return NextResponse.json({ wheelConfig: newConfig });
    }

    const wheelConfig = await db.wheelConfig.update({
      where: { campaignId },
      data: {
        ...(sectorCount !== undefined && { sectorCount }),
        ...(losingSectorCount !== undefined && { losingSectorCount }),
        ...(spinDuration !== undefined && { spinDuration }),
        ...(minRotations !== undefined && { minRotations }),
        ...(maxRotations !== undefined && { maxRotations }),
        ...(pointerColor !== undefined && { pointerColor }),
        ...(centerColor !== undefined && { centerColor }),
        ...(outerRingColor !== undefined && { outerRingColor }),
        ...(backgroundColor !== undefined && { backgroundColor }),
        ...(textColor !== undefined && { textColor }),
        ...(fontSize !== undefined && { fontSize }),
        ...(soundEnabled !== undefined && { soundEnabled }),
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

    return NextResponse.json({ wheelConfig });
  } catch (error) {
    console.error('Error updating wheel config:', error);
    return NextResponse.json({ error: 'Failed to update wheel config' }, { status: 500 });
  }
}
