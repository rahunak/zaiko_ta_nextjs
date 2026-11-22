import { query } from '@/lib/db';

/**
 * Глобальные настройки проекта (таблица `app_settings`, одна строка id = 1).
 *
 * Читаются и админкой, и публичной формой /book. Если таблицы ещё нет
 * (миграция не применена), возвращаем безопасные значения по умолчанию:
 * онлайн-запись остаётся локальной и в DIKIDI ничего не уходит.
 */
export type AppSettings = {
  /** Дублировать записи из /book в DIKIDI. */
  book_sync_dikidi: boolean;
  /** За сколько часов до визита запись ещё открыта. */
  min_lead_hours: number;
  /** Буфер между процедурами (уборка, подготовка), минуты. */
  buffer_min: number;
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  book_sync_dikidi: false,
  min_lead_hours: 2,
  buffer_min: 10,
};

export async function getAppSettings(): Promise<AppSettings> {
  try {
    const { rows } = await query<AppSettings>(
      'select book_sync_dikidi, min_lead_hours, buffer_min from app_settings where id = 1',
    );

    const row = rows[0];
    if (!row) return DEFAULT_APP_SETTINGS;

    return {
      book_sync_dikidi: row.book_sync_dikidi ?? DEFAULT_APP_SETTINGS.book_sync_dikidi,
      min_lead_hours: Number.isFinite(Number(row.min_lead_hours))
        ? Math.max(0, Number(row.min_lead_hours))
        : DEFAULT_APP_SETTINGS.min_lead_hours,
      buffer_min: Number.isFinite(Number(row.buffer_min))
        ? Math.max(0, Number(row.buffer_min))
        : DEFAULT_APP_SETTINGS.buffer_min,
    };
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}
