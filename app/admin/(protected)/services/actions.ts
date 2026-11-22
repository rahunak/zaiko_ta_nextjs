'use server';

import { revalidatePath } from 'next/cache';
import { query } from '@/lib/db';
import { requireUser } from '@/lib/auth/session';

/**
 * Меняет услугу местами с соседней.
 *
 * Порядок нормализуется при каждом перемещении: в базе всегда 1…N без дыр и
 * дублей. Обновление одним запросом (`unnest`) — либо применяется всё, либо ничего.
 */
export async function moveServiceAction(formData: FormData): Promise<void> {
  await requireUser();

  const id = Number(formData.get('id'));
  const direction = formData.get('direction') === 'up' ? 'up' : 'down';
  if (!Number.isInteger(id) || id <= 0) return;

  const { rows } = await query<{ id: string }>(
    'select id from services order by sort_order, name',
  );
  const ids = rows.map((row) => row.id);

  const index = ids.indexOf(String(id));
  const neighbor = direction === 'up' ? index - 1 : index + 1;
  if (index === -1 || neighbor < 0 || neighbor >= ids.length) return;

  [ids[index], ids[neighbor]] = [ids[neighbor], ids[index]];

  await query(
    `update services s
        set sort_order = v.ord
       from unnest($1::bigint[], $2::int[]) as v(id, ord)
      where s.id = v.id`,
    [ids.map(Number), ids.map((_, position) => position + 1)],
  );

  revalidatePath('/admin/services');
  revalidatePath('/book');
}
