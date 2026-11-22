import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import {
  getAvailableDates,
  getAvailableSlots,
} from '@/lib/availability';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const serviceIdsParam = searchParams.get('serviceIds');
  const serviceId = searchParams.get('serviceId');

  const idsRaw = serviceIdsParam ? serviceIdsParam : serviceId ? serviceId : '';
  const ids = idsRaw
    .split(',')
    .map((v) => v.trim())
    .filter((v) => /^\d+$/.test(v))
    .map(Number);

  if (ids.length === 0) {
    return NextResponse.json({ error: 'invalid_service' }, { status: 400 });
  }

  const { rows } = await query<{ id: string; duration_min: number }>(
    'select id, duration_min from services where id = any($1::bigint[]) and is_active = true',
    [ids],
  );

  if (rows.length !== ids.length) {
    return NextResponse.json({ error: 'service_not_found' }, { status: 404 });
  }

  const duration = rows.reduce((sum, r) => sum + Number(r.duration_min), 0);

  const date = searchParams.get('date');
  if (date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'invalid_date' }, { status: 400 });
    }
    const slots = await getAvailableSlots(date, duration);
    return NextResponse.json({ slots });
  }

  const days = Math.min(Math.max(Number(searchParams.get('days') || 45), 1), 90);
  const dates = await getAvailableDates(duration, days);
  return NextResponse.json({ dates });
}
