import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// DELETE: Delete a single code by ID, only if status is 'unused'
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if the code exists
    const code = await db.code.findUnique({
      where: { id },
    });

    if (!code) {
      return NextResponse.json(
        { error: 'Code not found' },
        { status: 404 }
      );
    }

    // Protect used codes from deletion
    if (code.status !== 'unused') {
      return NextResponse.json(
        { error: 'Cannot delete a used code' },
        { status: 403 }
      );
    }

    // Delete the code
    await db.code.delete({
      where: { id },
    });

    // Log admin action
    await db.adminLog.create({
      data: {
        action: 'batch_delete_codes',
        details: `Deleted single unused code ${code.value} (id: ${id}) from campaign ${code.campaignId}`,
        adminName: 'admin',
        campaignId: code.campaignId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting code:', error);
    return NextResponse.json(
      { error: 'Failed to delete code' },
      { status: 500 }
    );
  }
}
