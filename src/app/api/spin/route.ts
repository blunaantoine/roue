import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Probability-based prize selection
function selectPrizeByProbability(prizes: { id: string; probability: number; isLosing: boolean }[]): string | null {
  const totalProbability = prizes.reduce((sum, p) => sum + p.probability, 0);
  if (totalProbability === 0) return null;

  let random = Math.random() * totalProbability;
  for (const prize of prizes) {
    random -= prize.probability;
    if (random <= 0) {
      return prize.id;
    }
  }

  // Fallback: return the last prize
  return prizes[prizes.length - 1]?.id ?? null;
}

// POST: Process a spin
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

    // Determine the result
    let wonPrizeId: string | null = null;
    let isWinning = false;

    // If code has a pre-assigned prizeId, use that prize
    if (code.prizeId) {
      wonPrizeId = code.prizeId;
      const assignedPrize = code.prize;
      isWinning = !assignedPrize?.isLosing;
    } else {
      // No assigned prize - randomly select based on probabilities
      const prizes = code.campaign.prizes;
      wonPrizeId = selectPrizeByProbability(prizes);

      if (wonPrizeId) {
        const selectedPrize = prizes.find(p => p.id === wonPrizeId);
        isWinning = !selectedPrize?.isLosing;
      }
    }

    // Update code status
    const codeStatus = isWinning ? 'winning' : 'losing';
    await db.code.update({
      where: { id: code.id },
      data: {
        status: codeStatus,
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
    const prizes = code.campaign.prizes;
    const wheelConfig = code.campaign.wheelConfig;
    const prizeIndex = wonPrizeId
      ? prizes.findIndex(p => p.id === wonPrizeId)
      : -1;

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
      codeStatus,
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
