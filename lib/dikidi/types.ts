/** Минимально необходимые типы ответа журнала DIKIDI (структура подтверждена HAR-записью). */
export type DikidiJournalRecord = {
  id?: string;
  begin?: string;
  end?: string;
  date?: string;
  duration?: string;
  info?: {
    client_name?: string;
    client_phone?: string;
    comment?: string;
    duration?: string;
    services_title?: string[];
    services?: Array<{ title?: string; cost?: string; duration?: string }>;
    masters?: Array<{ cost?: string; duration?: string; username?: string }>;
  };
};

export type DikidiJournalResponse = {
  master?: {
    info?: Record<string, { id?: string; title?: string }>;
    records?: Record<
      string,
      Record<string, Record<string, DikidiJournalRecord>>
    >;
  };
};

/** Унифицированная запись для расписания админки. */
export type ScheduleEntry = {
  key: string;
  source: 'dikidi' | 'admin' | 'online';
  dikidiId: string | null;
  dateKey: string;
  startsAtIso: string;
  endsAtIso: string | null;
  timeFrom: string;
  timeTo: string;
  clientName: string;
  clientPhone: string;
  services: string[];
  price: number;
  durationMin: number;
  comment: string;
  syncStatus?: 'local' | 'synced' | 'failed';
  syncError?: string | null;
};
