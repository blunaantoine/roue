import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: List participations (filter by campaignId, include prize and code details)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId query param is required' }, { status: 400 });
    }

    const participations = await db.participation.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'desc' },
      include: {
        prize: true,
        code: true,
      },
    });

    return NextResponse.json(participations);
  } catch (error) {
    console.error('Error listing participations:', error);
    return NextResponse.json({ error: 'Failed to list participations' }, { status: 500 });
  }
}
