import { handleCronDispatch } from '@/lib/notifications/cron-http';

/** Тик напоминаний. Дёргается внешним планировщиком (cron-job.org, QStash) или вручную. */
export const dynamic = 'force-dynamic';

export const GET = handleCronDispatch;
export const POST = handleCronDispatch;
