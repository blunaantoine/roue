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

// PUT: Update code status and result (admin action)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, result, prizeId } = body;

    const existing = await db.code.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Code not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    // Update status (usage: unused/used)
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'unused') {
        // Resetting to unused: clear usage date and result
        updateData.usedAt = null;
        updateData.result = null;
      } else if (status === 'used') {
        updateData.usedAt = new Date();
      }
    }

    // Update result (outcome: winning/losing/null)
    if (result !== undefined) {
      updateData.result = result === null ? null : result;
      // If setting a result, code must be "used"
      if (result !== null) {
        updateData.status = 'used';
        updateData.usedAt = updateData.usedAt || new Date();
      }
    }

    // Update prizeId
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
        details: `Updated code ${existing.value}: status=${status ?? 'unchanged'}, result=${result ?? 'unchanged'}, prizeId=${prizeId ?? 'unchanged'}`,
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
