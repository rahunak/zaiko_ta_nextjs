import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import {
  getAvailableDates,
  getAvailableSlots,
} from '@/lib/availability';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get('serviceId');

  if (!serviceId || !/^\d+$/.test(serviceId)) {
    return NextResponse.json({ error: 'invalid_service' }, { status: 400 });
  }

  const { rows } = await query<{ duration_min: number }>(
    'select duration_min from services where id = $1 and is_active = true',
    [Number(serviceId)],
  );

  const service = rows[0];
  if (!service) {
    return NextResponse.json({ error: 'service_not_found' }, { status: 404 });
  }

  const duration = service.duration_min;

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
