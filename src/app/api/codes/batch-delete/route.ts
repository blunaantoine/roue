import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST: Batch delete unused codes
// Body: { ids?: string[], campaignId?: string, createdAt?: string }
// - If ids provided: delete specific code IDs that have status 'unused'
// - If campaignId + createdAt provided: delete all unused codes in that campaign
//   created within ±500ms of the given createdAt timestamp (batch group deletion)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, campaignId, createdAt } = body;

    let deletedCount = 0;

    if (ids && Array.isArray(ids) && ids.length > 0) {
      // Mode 1: Delete by specific IDs (only unused)
      deletedCount = await db.code.deleteMany({
        where: {
          id: { in: ids },
          status: 'unused',
        },
      });

      // Log admin action
      await db.adminLog.create({
        data: {
          action: 'batch_delete_codes',
          details: `Deleted ${deletedCount} unused codes by ID selection (requested: ${ids.length})`,
          adminName: 'admin',
          campaignId: null,
        },
      });
    } else if (campaignId && createdAt) {
      // Mode 2: Delete by campaign + creation group (±500ms window)
      const createdAtDate = new Date(createdAt);
      if (isNaN(createdAtDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid createdAt date format' },
          { status: 400 }
        );
      }

      const windowMs = 500;
      const from = new Date(createdAtDate.getTime() - windowMs);
      const to = new Date(createdAtDate.getTime() + windowMs);

      deletedCount = await db.code.deleteMany({
        where: {
          campaignId,
          status: 'unused',
          createdAt: {
            gte: from,
            lte: to,
          },
        },
      });

      // Log admin action
      await db.adminLog.create({
        data: {
          action: 'batch_delete_codes',
          details: `Deleted ${deletedCount} unused codes in campaign ${campaignId} created around ${createdAt} (±500ms window)`,
          adminName: 'admin',
          campaignId,
        },
      });
    } else {
      return NextResponse.json(
        {
          error:
            'Provide either ids array or both campaignId and createdAt to identify codes to delete',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ deletedCount });
  } catch (error) {
    console.error('Error batch deleting codes:', error);
    return NextResponse.json(
      { error: 'Failed to batch delete codes' },
      { status: 500 }
    );
  }
}
