import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST: Process a spin
// The result is determined by the ticket's predetermined result and prizeId.
// The wheel just visually displays the predetermined outcome.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { codeValue, participantName, participantPhone } = body;

    if (!codeValue) {
      return NextResponse.json({ error: 'codeValue is required' }, { status: 400 });
    }

    // Find the code
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
      return NextResponse.json({ error: 'Code not found' }, { status: 404 });
    }

    if (code.status !== 'unused') {
      return NextResponse.json({ error: 'Code has already been used', status: code.status }, { status: 400 });
    }

    if (!code.campaign.active) {
      return NextResponse.json({ error: 'Campaign is not active' }, { status: 400 });
    }

    // Determine the result based on the ticket's predetermined values
    const prizes = code.campaign.prizes;
    let wonPrizeId: string | null = null;
    let isWinning = false;

    if (code.result === 'winning') {
      // Winning ticket: use its assigned prizeId
      isWinning = true;
      wonPrizeId = code.prizeId;

      if (!wonPrizeId) {
        // Edge case: winning ticket without prizeId - assign a random winning prize
        const winningPrizes = prizes.filter(p => !p.isLosing);
        if (winningPrizes.length > 0) {
          wonPrizeId = winningPrizes[Math.floor(Math.random() * winningPrizes.length)].id;
        }
      }
    } else if (code.result === 'losing') {
      // Losing ticket: the wheel lands on a losing sector
      isWinning = false;
      const losingPrizes = prizes.filter(p => p.isLosing);
      if (losingPrizes.length > 0) {
        // Randomly pick one losing sector for the wheel to land on
        wonPrizeId = losingPrizes[Math.floor(Math.random() * losingPrizes.length)].id;
      }
    } else {
      // No result assigned - this ticket hasn't been properly configured
      // Default to losing for safety
      isWinning = false;
      const losingPrizes = prizes.filter(p => p.isLosing);
      if (losingPrizes.length > 0) {
        wonPrizeId = losingPrizes[Math.floor(Math.random() * losingPrizes.length)].id;
      }
    }

    // Update code: set status to used
    const codeResult = isWinning ? 'winning' : 'losing';
    await db.code.update({
      where: { id: code.id },
      data: {
        status: 'used',
        result: codeResult,
        usedAt: new Date(),
        prizeId: wonPrizeId,
      },
    });

    // Create Participation record
    const participation = await db.participation.create({
      data: {
        participantName: participantName ?? null,
        participantPhone: participantPhone ?? null,
        codeValue: codeValue,
        prizeId: wonPrizeId,
        codeId: code.id,
        campaignId: code.campaignId,
      },
      include: {
        prize: true,
        code: true,
      },
    });

    // Get the won prize details for response
    const wonPrize = wonPrizeId
      ? await db.prize.findUnique({ where: { id: wonPrizeId } })
      : null;

    // Calculate animation parameters
    const wheelConfig = code.campaign.wheelConfig;
    const prizeIndex = wonPrizeId
      ? prizes.findIndex(p => p.id === wonPrizeId)
      : -1;

    // Equal-sized sectors (no probability)
    const sectorAngle = prizes.length > 0 ? 360 / prizes.length : 360;
    const targetAngle = prizeIndex >= 0
      ? prizeIndex * sectorAngle + sectorAngle / 2
      : 0;

    const minRotations = wheelConfig?.minRotations ?? 3;
    const maxRotations = wheelConfig?.maxRotations ?? 7;
    const totalRotations = minRotations + Math.floor(Math.random() * (maxRotations - minRotations + 1));
    const finalAngle = totalRotations * 360 + (360 - targetAngle);

    // Log participation
    await db.adminLog.create({
      data: {
        action: 'spin_completed',
        details: `Spin completed for code ${codeValue}, result: ${isWinning ? 'winning' : 'losing'}, prize: ${wonPrize?.name ?? 'none'}`,
        adminName: 'system',
        campaignId: code.campaignId,
      },
    });

    return NextResponse.json({
      participationId: participation.id,
      codeId: code.id,
      campaignId: code.campaignId,
      isWinning,
      codeResult,
      prize: wonPrize,
      prizeIndex,
      animation: {
        finalAngle,
        spinDuration: wheelConfig?.spinDuration ?? 5000,
        totalRotations,
        sectorAngle,
        prizesOnWheel: prizes.map(p => ({
          id: p.id,
          name: p.name,
          color: p.color,
          sectorLabel: p.sectorLabel ?? p.name,
          isLosing: p.isLosing,
        })),
      },
      participantName: participantName,
      participantPhone: participantPhone,
    });
  } catch (error) {
    console.error('Error processing spin:', error);
    return NextResponse.json({ error: 'Failed to process spin' }, { status: 500 });
  }
}
