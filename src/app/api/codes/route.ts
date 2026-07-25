import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Generate a unique random alphanumeric code (8 chars)
function generateCodeValue(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude ambiguous chars like I,O,0,1
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate unique code values (check against existing in DB)
async function generateUniqueCodeValues(count: number): Promise<string[]> {
  const codes: string[] = [];
  const existingValues = await db.code.findMany({ select: { value: true } });
  const existingSet = new Set(existingValues.map(c => c.value));

  for (let i = 0; i < count; i++) {
    let attempts = 0;
    let codeValue = generateCodeValue();
    while (existingSet.has(codeValue) || codes.includes(codeValue)) {
      codeValue = generateCodeValue();
      attempts++;
      if (attempts > 100) {
        // Fallback: append a random digit
        codeValue = generateCodeValue() + Math.floor(Math.random() * 10);
      }
    }
    codes.push(codeValue);
  }
  return codes;
}

// GET: List codes (filter by campaignId, status or result query params)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    const status = searchParams.get('status');
    const result = searchParams.get('result');

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId query param is required' }, { status: 400 });
    }

    const where: Record<string, unknown> = { campaignId };
    if (status) {
      where.status = status;
    }
    if (result) {
      where.result = result;
    }

    const codes = await db.code.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        prize: true,
        participation: true,
      },
    });

    return NextResponse.json(codes);
  } catch (error) {
    console.error('Error listing codes:', error);
    return NextResponse.json({ error: 'Failed to list codes' }, { status: 500 });
  }
}

// POST: Generate codes (body: { campaignId, count, prizeIds for specific codes })
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignId, count, prizeIds } = body;

    if (!campaignId || !count) {
      return NextResponse.json({ error: 'campaignId and count are required' }, { status: 400 });
    }

    if (count < 1 || count > 10000) {
      return NextResponse.json({ error: 'count must be between 1 and 10000' }, { status: 400 });
    }

    // Verify campaign exists
    const campaign = await db.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const codeValues = await generateUniqueCodeValues(count);

    // If prizeIds are provided, assign prizes to codes
    const validatedPrizeIds: (string | null)[] = [];
    if (prizeIds && Array.isArray(prizeIds)) {
      for (const prizeId of prizeIds) {
        if (prizeId === null) {
          validatedPrizeIds.push(null);
        } else {
          const prize = await db.prize.findUnique({ where: { id: prizeId } });
          if (!prize || prize.campaignId !== campaignId) {
            return NextResponse.json(
              { error: `Prize ${prizeId} not found or does not belong to this campaign` },
              { status: 400 }
            );
          }
          validatedPrizeIds.push(prizeId);
        }
      }
    }

    // Create codes in batch
    const codesToCreate = codeValues.map((value, index) => ({
      value,
      campaignId,
      prizeId: validatedPrizeIds[index] ?? null,
    }));

    const createdCodes = await db.code.createMany({
      data: codesToCreate,
    });

    // Log admin action
    await db.adminLog.create({
      data: {
        action: 'generate_codes',
        details: `Generated ${count} codes for campaign ${campaignId}`,
        adminName: 'admin',
        campaignId,
      },
    });

    return NextResponse.json({
      count: createdCodes.count,
      codes: codesToCreate,
    }, { status: 201 });
  } catch (error) {
    console.error('Error generating codes:', error);
    return NextResponse.json({ error: 'Failed to generate codes' }, { status: 500 });
  }
}
