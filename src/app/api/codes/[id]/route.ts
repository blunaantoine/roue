import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: Get code details
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const code = await db.code.findUnique({
      where: { id },
      include: {
        prize: true,
        campaign: true,
        participation: true,
      },
    });

    if (!code) {
      return NextResponse.json({ error: 'Code not found' }, { status: 404 });
    }

    return NextResponse.json(code);
  } catch (error) {
    console.error('Error getting code:', error);
    return NextResponse.json({ error: 'Failed to get code' }, { status: 500 });
  }
}

// PUT: Update code - specifically to reset a code to "losing" status (admin action)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, prizeId } = body;

    const existing = await db.code.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Code not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'losing' || status === 'unused') {
        updateData.usedAt = null;
      } else {
        updateData.usedAt = new Date();
      }
    }
    if (prizeId !== undefined) {
      updateData.prizeId = prizeId === null ? null : prizeId;
    }

    const code = await db.code.update({
      where: { id },
      data: updateData,
      include: {
        prize: true,
        campaign: true,
      },
    });

    // Log admin action
    await db.adminLog.create({
      data: {
        action: 'update_code',
        details: `Updated code ${existing.value} to status: ${status ?? 'unchanged'}`,
        adminName: 'admin',
        campaignId: existing.campaignId,
      },
    });

    return NextResponse.json(code);
  } catch (error) {
    console.error('Error updating code:', error);
    return NextResponse.json({ error: 'Failed to update code' }, { status: 500 });
  }
}
