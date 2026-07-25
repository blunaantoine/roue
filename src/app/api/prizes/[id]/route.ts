import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: Get prize by ID
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const prize = await db.prize.findUnique({
      where: { id },
      include: {
        campaign: true,
        _count: {
          select: { codes: true, participations: true },
        },
      },
    });

    if (!prize) {
      return NextResponse.json({ error: 'Prize not found' }, { status: 404 });
    }

    return NextResponse.json(prize);
  } catch (error) {
    console.error('Error getting prize:', error);
    return NextResponse.json({ error: 'Failed to get prize' }, { status: 500 });
  }
}

// PUT: Update prize
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, color, icon, probability, isLosing, sectorLabel, sortOrder, active } = body;

    const existing = await db.prize.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Prize not found' }, { status: 404 });
    }

    const prize = await db.prize.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(color !== undefined && { color }),
        ...(icon !== undefined && { icon }),
        ...(probability !== undefined && { probability }),
        ...(isLosing !== undefined && { isLosing }),
        ...(sectorLabel !== undefined && { sectorLabel }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(active !== undefined && { active }),
      },
    });

    // Log admin action
    await db.adminLog.create({
      data: {
        action: 'update_prize',
        details: `Updated prize: ${prize.name}`,
        adminName: 'admin',
        campaignId: existing.campaignId,
      },
    });

    return NextResponse.json(prize);
  } catch (error) {
    console.error('Error updating prize:', error);
    return NextResponse.json({ error: 'Failed to update prize' }, { status: 500 });
  }
}

// DELETE: Delete prize
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.prize.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Prize not found' }, { status: 404 });
    }

    await db.prize.delete({ where: { id } });

    // Log admin action
    await db.adminLog.create({
      data: {
        action: 'delete_prize',
        details: `Deleted prize: ${existing.name}`,
        adminName: 'admin',
        campaignId: existing.campaignId,
      },
    });

    return NextResponse.json({ message: 'Prize deleted successfully' });
  } catch (error) {
    console.error('Error deleting prize:', error);
    return NextResponse.json({ error: 'Failed to delete prize' }, { status: 500 });
  }
}
