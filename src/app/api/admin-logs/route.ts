import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: List admin logs (filter by campaignId)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');

    const where: Record<string, unknown> = {};
    if (campaignId) {
      where.campaignId = campaignId;
    }

    const logs = await db.adminLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit to most recent 100 logs
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error listing admin logs:', error);
    return NextResponse.json({ error: 'Failed to list admin logs' }, { status: 500 });
  }
}

// POST: Create admin log entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, details, adminName, campaignId } = body;

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }

    const log = await db.adminLog.create({
      data: {
        action,
        details: details ?? null,
        adminName: adminName ?? 'admin',
        campaignId: campaignId ?? null,
      },
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error('Error creating admin log:', error);
    return NextResponse.json({ error: 'Failed to create admin log' }, { status: 500 });
  }
}
