import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: Get statistics for a campaign (query param campaignId)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId query param is required' }, { status: 400 });
    }

    const campaign = await db.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Total codes generated
    const totalCodes = await db.code.count({ where: { campaignId } });

    // Usage status: unused vs used
    const unusedCodes = await db.code.count({ where: { campaignId, status: 'unused' } });
    const usedCodes = await db.code.count({ where: { campaignId, status: 'used' } });

    // Result: winning vs losing
    const winningCodes = await db.code.count({ where: { campaignId, result: 'winning' } });
    const losingCodes = await db.code.count({ where: { campaignId, result: 'losing' } });

    // Prize distribution (how many won each prize)
    const prizeDistribution = await db.participation.groupBy({
      by: ['prizeId'],
      where: { campaignId, prizeId: { not: null } },
      _count: { prizeId: true },
    });

    // Get prize names for distribution
    const prizes = await db.prize.findMany({ where: { campaignId } });
    const prizeMap = new Map(prizes.map(p => [p.id, p]));

    const distributionWithNames = prizeDistribution.map(d => ({
      prizeId: d.prizeId,
      prizeName: prizeMap.get(d.prizeId)?.name ?? 'Unknown',
      count: d._count.prizeId,
    }));

    // Recent participations (last 10)
    const recentParticipations = await db.participation.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        prize: true,
        code: true,
      },
    });

    // Participation trend (grouped by day)
    const participations = await db.participation.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });

    // Group by day
    const trendByDay: Record<string, number> = {};
    for (const p of participations) {
      const dayKey = p.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD
      trendByDay[dayKey] = (trendByDay[dayKey] ?? 0) + 1;
    }

    const trend = Object.entries(trendByDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Participation without prize (losing)
    const losingParticipations = await db.participation.count({
      where: { campaignId, prizeId: null },
    });

    return NextResponse.json({
      campaignId,
      campaignName: campaign.name,
      totalCodes,
      unusedCodes,
      usedCodes,
      winnersCount: winningCodes,
      losersCount: losingCodes,
      prizeDistribution: distributionWithNames,
      losingParticipations,
      recentParticipations,
      participationTrend: trend,
    });
  } catch (error) {
    console.error('Error getting statistics:', error);
    return NextResponse.json({ error: 'Failed to get statistics' }, { status: 500 });
  }
}
