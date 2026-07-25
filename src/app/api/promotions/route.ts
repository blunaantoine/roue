import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: List promotion messages (filter by campaignId)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId query param is required' }, { status: 400 });
    }

    const promotions = await db.promotionMessage.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(promotions);
  } catch (error) {
    console.error('Error listing promotions:', error);
    return NextResponse.json({ error: 'Failed to list promotions' }, { status: 500 });
  }
}

// POST: Create promotion message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, imageUrl, active, campaignId } = body;

    if (!title || !content || !campaignId) {
      return NextResponse.json({ error: 'title, content, and campaignId are required' }, { status: 400 });
    }

    const campaign = await db.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const promotion = await db.promotionMessage.create({
      data: {
        title,
        content,
        imageUrl: imageUrl ?? null,
        active: active ?? true,
        campaignId,
      },
    });

    // Log admin action
    await db.adminLog.create({
      data: {
        action: 'create_promotion',
        details: `Created promotion message: ${title}`,
        adminName: 'admin',
        campaignId,
      },
    });

    return NextResponse.json(promotion, { status: 201 });
  } catch (error) {
    console.error('Error creating promotion:', error);
    return NextResponse.json({ error: 'Failed to create promotion' }, { status: 500 });
  }
}
