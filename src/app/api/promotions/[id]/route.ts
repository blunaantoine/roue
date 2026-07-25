import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PUT: Update promotion message
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, content, imageUrl, active } = body;

    const existing = await db.promotionMessage.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Promotion message not found' }, { status: 404 });
    }

    const promotion = await db.promotionMessage.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(active !== undefined && { active }),
      },
    });

    // Log admin action
    await db.adminLog.create({
      data: {
        action: 'update_promotion',
        details: `Updated promotion message: ${promotion.title}`,
        adminName: 'admin',
        campaignId: existing.campaignId,
      },
    });

    return NextResponse.json(promotion);
  } catch (error) {
    console.error('Error updating promotion:', error);
    return NextResponse.json({ error: 'Failed to update promotion' }, { status: 500 });
  }
}

// DELETE: Delete promotion message
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.promotionMessage.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Promotion message not found' }, { status: 404 });
    }

    await db.promotionMessage.delete({ where: { id } });

    // Log admin action
    await db.adminLog.create({
      data: {
        action: 'delete_promotion',
        details: `Deleted promotion message: ${existing.title}`,
        adminName: 'admin',
        campaignId: existing.campaignId,
      },
    });

    return NextResponse.json({ message: 'Promotion message deleted successfully' });
  } catch (error) {
    console.error('Error deleting promotion:', error);
    return NextResponse.json({ error: 'Failed to delete promotion' }, { status: 500 });
  }
}
