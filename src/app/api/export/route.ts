import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET: Export data as CSV/JSON (query params: campaignId, type=codes|participations|contacts)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    const type = searchParams.get('type') ?? 'codes';
    const format = searchParams.get('format') ?? 'json';

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId query param is required' }, { status: 400 });
    }

    const campaign = await db.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    let data: unknown[];

    switch (type) {
      case 'codes':
        data = await db.code.findMany({
          where: { campaignId },
          include: { prize: true },
          orderBy: { createdAt: 'asc' },
        });
        break;
      case 'participations':
        data = await db.participation.findMany({
          where: { campaignId },
          include: { prize: true, code: true },
          orderBy: { createdAt: 'asc' },
        });
        break;
      case 'contacts':
        data = await db.whatsAppContact.findMany({
          where: { campaignId },
          orderBy: { createdAt: 'asc' },
        });
        break;
      default:
        return NextResponse.json({ error: 'Invalid type. Use codes, participations, or contacts' }, { status: 400 });
    }

    if (format === 'csv') {
      const csv = convertToCSV(data, type);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${campaign.name}-${type}.csv"`,
        },
      });
    }

    // Default: JSON
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 });
  }
}

function convertToCSV(data: unknown[], type: string): string {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return '';
  }

  const rows = data as Record<string, unknown>[];
  const headers = getHeaders(type);
  const lines: string[] = [headers.join(',')];

  for (const row of rows) {
    const values = headers.map(header => {
      const value = getFieldValue(row, header);
      const stringValue = String(value ?? '');
      // Escape commas and quotes in values
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    });
    lines.push(values.join(','));
  }

  return lines.join('\n');
}

function getHeaders(type: string): string[] {
  switch (type) {
    case 'codes':
      return ['id', 'value', 'status', 'prizeId', 'prizeName', 'campaignId', 'createdAt', 'usedAt'];
    case 'participations':
      return ['id', 'participantName', 'participantPhone', 'codeValue', 'prizeId', 'prizeName', 'campaignId', 'createdAt'];
    case 'contacts':
      return ['id', 'name', 'phone', 'notes', 'campaignId', 'createdAt'];
    default:
      return ['id', 'createdAt'];
  }
}

function getFieldValue(row: Record<string, unknown>, header: string): unknown {
  switch (header) {
    case 'prizeName':
      const prize = row.prize as Record<string, unknown> | null;
      return prize?.name ?? (row.isLosing ? 'Losing' : '');
    case 'prizeId':
      if (row.prizeId) return row.prizeId;
      const prizeObj = row.prize as Record<string, unknown> | null;
      return prizeObj?.id ?? '';
    default:
      const value = row[header];
      if (value instanceof Date) return value.toISOString();
      return value;
  }
}
