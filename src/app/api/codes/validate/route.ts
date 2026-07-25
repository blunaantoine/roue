import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST: Validate code value (check if unused, return codeId, campaignId, prize info)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { codeValue } = body;

    if (!codeValue) {
      return NextResponse.json({ error: 'codeValue is required' }, { status: 400 });
    }

    const code = await db.code.findUnique({
      where: { value: codeValue },
      include: {
        prize: true,
        campaign: {
          include: {
            prizes: { where: { active: true }, orderBy: { sortOrder: 'asc' } },
            wheelConfig: true,
          },
        },
      },
    });

    if (!code) {
      return NextResponse.json({ error: 'Code not found', valid: false }, { status: 404 });
    }

    if (code.status !== 'unused') {
      return NextResponse.json({
        error: 'Code has already been used',
        valid: false,
        status: code.status,
        usedAt: code.usedAt,
      }, { status: 400 });
    }

    // Check if campaign is active
    if (!code.campaign.active) {
      return NextResponse.json({
        error: 'Campaign is not active',
        valid: false,
      }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      codeId: code.id,
      campaignId: code.campaignId,
      campaignName: code.campaign.name,
      hasAssignedPrize: code.prizeId !== null,
      assignedPrize: code.prize,
      prizes: code.campaign.prizes,
      wheelConfig: code.campaign.wheelConfig,
    });
  } catch (error) {
    console.error('Error validating code:', error);
    return NextResponse.json({ error: 'Failed to validate code' }, { status: 500 });
  }
}
