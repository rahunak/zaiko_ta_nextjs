import { handleCronDispatch } from '@/lib/notifications/cron-http';

/**
 * Старый адрес тика. Оставлен рабочим: на него могут быть настроены внешние вызовы
 * и ссылается документация. Новый адрес — `/api/cron/dispatch`, поведение то же.
 */
export const dynamic = 'force-dynamic';

export const GET = handleCronDispatch;
export const POST = handleCronDispatch;
