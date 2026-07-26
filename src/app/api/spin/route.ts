import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// POST: Process a spin
// The result is determined by the ticket's predetermined result and prizeId.
// The wheel is purely an animation that stops on the sector matching the ticket's outcome.
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

    // Get wheel configuration
    const wheelConfig = code.campaign.wheelConfig;
    const sectorCount = wheelConfig?.sectorCount ?? 10;
    const losingSectorCount = wheelConfig?.losingSectorCount ?? 4;

    // Build the wheel sectors: losing sectors + winning prize sectors
    const losingPrizes = code.campaign.prizes.filter(p => p.isLosing);
    const winningPrizes = code.campaign.prizes.filter(p => !p.isLosing);

    // Build wheel sectors array (10 sectors total)
    // Losing sectors first, then winning prize sectors
    const wheelSectors: { prizeId: string | null; prize: any; isLosing: boolean; label: string; color: string }[] = [];

    // Add losing sectors
    for (let i = 0; i < losingSectorCount; i++) {
      // Distribute losing prizes across losing sectors
      const losingPrize = losingPrizes[i % losingPrizes.length] || losingPrizes[0];
      wheelSectors.push({
        prizeId: losingPrize?.id ?? null,
        prize: losingPrize,
        isLosing: true,
        label: losingPrize?.sectorLabel || losingPrize?.name || 'Perdant',
        color: losingPrize?.color || '#374151',
      });
    }

    // Add winning prize sectors
    for (const prize of winningPrizes) {
      wheelSectors.push({
        prizeId: prize.id,
        prize: prize,
        isLosing: false,
        label: prize.sectorLabel || prize.name,
        color: prize.color,
      });
    }

    // If we have fewer sectors than sectorCount, fill remaining with losing sectors
    while (wheelSectors.length < sectorCount) {
      const losingPrize = losingPrizes[0] || losingPrizes[0];
      wheelSectors.push({
        prizeId: losingPrize?.id ?? null,
        prize: losingPrize,
        isLosing: true,
        label: losingPrize?.sectorLabel || 'Perdant',
        color: losingPrize?.color || '#374151',
      });
    }

    // If we have more sectors than sectorCount, truncate
    while (wheelSectors.length > sectorCount) {
      wheelSectors.pop();
    }

    // Determine the result based on the ticket's predetermined values
    let targetSectorIndex: number;
    let isWinning: boolean;
    let wonPrizeId: string | null = null;

    if (code.result === 'winning') {
      // Winning ticket: the wheel stops on the sector matching the assigned prize
      isWinning = true;
      wonPrizeId = code.prizeId;

      if (wonPrizeId) {
        // Find the sector with this prize
        targetSectorIndex = wheelSectors.findIndex(s => s.prizeId === wonPrizeId);
        if (targetSectorIndex === -1) {
          // Prize not on wheel, find any winning sector
          targetSectorIndex = wheelSectors.findIndex(s => !s.isLosing);
        }
      } else {
        // No specific prize assigned, pick a random winning sector
        const winningSectorIndices = wheelSectors
          .map((s, i) => (!s.isLosing ? i : -1))
          .filter(i => i !== -1);
        targetSectorIndex = winningSectorIndices.length > 0
          ? winningSectorIndices[Math.floor(Math.random() * winningSectorIndices.length)]
          : 0;
        wonPrizeId = wheelSectors[targetSectorIndex]?.prizeId ?? null;
      }
    } else if (code.result === 'losing') {
      // Losing ticket: the wheel stops on a losing sector
      isWinning = false;
      const losingSectorIndices = wheelSectors
        .map((s, i) => (s.isLosing ? i : -1))
        .filter(i => i !== -1);
      targetSectorIndex = losingSectorIndices.length > 0
        ? losingSectorIndices[Math.floor(Math.random() * losingSectorIndices.length)]
        : 0;
      wonPrizeId = wheelSectors[targetSectorIndex]?.prizeId ?? null;
    } else {
      // No result assigned - default to losing for safety
      isWinning = false;
      const losingSectorIndices = wheelSectors
        .map((s, i) => (s.isLosing ? i : -1))
        .filter(i => i !== -1);
      targetSectorIndex = losingSectorIndices.length > 0
        ? losingSectorIndices[Math.floor(Math.random() * losingSectorIndices.length)]
        : 0;
      wonPrizeId = wheelSectors[targetSectorIndex]?.prizeId ?? null;
    }

    if (targetSectorIndex === -1 || targetSectorIndex === undefined) {
      targetSectorIndex = 0;
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
    const minRotations = wheelConfig?.minRotations ?? 3;
    const maxRotations = wheelConfig?.maxRotations ?? 7;
    const totalRotations = minRotations + Math.floor(Math.random() * (maxRotations - minRotations + 1));

    // The wheel rotates so that the pointer (at top) points to the target sector
    const sectorAngle = 360 / sectorCount;
    // Target angle: the center of the target sector
    const targetAngle = targetSectorIndex * sectorAngle + sectorAngle / 2;
    // Final angle: multiple full rotations + offset to land on target sector
    // The pointer is at the top (0 degrees), so we need to rotate the wheel by (360 - targetAngle) + rotations
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
      targetSectorIndex,
      animation: {
        finalAngle,
        spinDuration: wheelConfig?.spinDuration ?? 5000,
        totalRotations,
        sectorAngle,
        sectorCount,
        wheelSectors,
      },
      participantName: participantName,
      participantPhone: participantPhone,
    });
  } catch (error) {
    console.error('Error processing spin:', error);
    return NextResponse.json({ error: 'Failed to process spin' }, { status: 500 });
  }
}
