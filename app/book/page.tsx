import type { Metadata } from 'next';
import Link from 'next/link';
import { query } from '@/lib/db';
import { belarusLongDate, belarusTime } from '@/lib/dikidi/time';
import { botUsername } from '@/lib/telegram';
import BookingForm from '@/components/BookingForm';
import BookingConversion from '@/components/BookingConversion';
import Script from 'next/script';

export const metadata: Metadata = {
  metadataBase: new URL('https://zaiko.by'),
  title: 'Онлайн-запись на брови и ресницы — Зайко Татьяна, Крупки',
  description:
    'Выберите услугу, удобный день и время — запись займёт минуту. Крупки, ул. Советская, 49. Ламинирование ресниц, укладка и коррекция бровей.',
  alternates: { canonical: 'https://zaiko.by/book' },
  openGraph: {
    title: 'Онлайн-запись — Зайко Татьяна',
    description: 'Свободные окна на 45 дней вперёд. Крупки, ул. Советская, 49.',
    url: 'https://zaiko.by/book',
    type: 'website',
  },
};

type ServiceRow = {
  id: string;
  name: string;
  price: string;
  duration_min: number;
};

const ERRORS: Record<string, string> = {
  invalid_name: 'Введите имя (от 2 до 80 символов).',
  invalid_phone: 'Введите корректный телефон.',
  comment_too_long: 'Комментарий слишком длинный (макс. 500 символов).',
  invalid_datetime: 'Проверьте дату и время.',
  past_time: 'Нельзя записаться на прошедшее время.',
  slot_unavailable: 'Выбранное время недоступно. Выберите другой слот.',
  invalid_service: 'Выберите услугу из списка.',
};

type BookedAppointment = {
  id: string;
  client_name: string;
  service_name: string;
  starts_at: Date;
  duration_min: number;
  price: string;
  client_token: string | null;
  client_chat_id: string | null;
};

type BookSearchParams = {
  booked?: string;
  error?: string;
  name?: string;
  phone?: string;
  comment?: string;
  services?: string;
  date?: string;
  time?: string;
};

/** Параметр может прийти массивом (`?error=a&error=b`) — берём первое значение. */
function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<BookSearchParams>;
}) {
  const params = await searchParams;
  const { rows: services } = await query<ServiceRow>(
    `select id, name, price, duration_min
       from services
      where is_active = true
      order by sort_order, name`,
  );

  const bookedId = params.booked;
  const botName = botUsername();
  const errorCode = one(params.error) || null;
  const errorMessage = errorCode ? (ERRORS[errorCode] ?? errorCode) : null;

  // Детали только что созданной записи: клиент должен видеть, куда и на что он записался,
  // а не только номер. Без них он звонит уточнять.
  let booked: BookedAppointment | null = null;
  if (bookedId && /^\d+$/.test(bookedId)) {
    const { rows } = await query<BookedAppointment>(
      `select id, client_name, service_name, starts_at, duration_min, price,
              client_token, client_chat_id
         from appointments
        where id = $1 and cancelled_at is null`,
      [Number(bookedId)],
    );
    booked = rows[0] ?? null;
  }

  return (
    <main
      className="relative min-h-screen overflow-x-clip"
      style={{ backgroundColor: '#dda2ab', color: '#1A1618' }}
    >
      <iframe
        src="/character.html?embed=1"
        title="Анимация"
        className="hidden md:block fixed inset-0 h-screen w-screen border-0"
        style={{ pointerEvents: 'none' }}
        loading="eager"
      />

      <div className="relative z-10 flex min-h-screen flex-col px-4 py-10 pointer-events-none">
        <div className="pointer-events-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium transition hover:opacity-80"
            style={{ color: '#3d2222' }}
          >
            ← На главную
          </Link>
        </div>

        <div className="pointer-events-auto mx-auto mt-6 w-full max-w-xl">
          <div
            className="rounded-2xl border border-border bg-white/75 p-6 shadow-lg backdrop-blur-md"
            style={{ color: '#1A1618' }}
          >
            <h1 className="font-display text-3xl" style={{ fontFamily: 'var(--font-playfair)' }}>
              Онлайн-запись
            </h1>
            {bookedId ? (
              <div className="mt-6 rounded-2xl border border-border bg-white px-4 py-3 text-sm">
                <div className="mb-3 aspect-[4/3] w-full overflow-hidden rounded-xl md:hidden">
                  <iframe
                    src="/character.html?embed=1&card=1"
                    title="Анимация"
                    className="h-full w-full border-0"
                    style={{ pointerEvents: 'none' }}
                    loading="lazy"
                  />
                </div>
                {booked ? (
                  <>
                    <p className="font-medium text-charcoal">
                      {belarusLongDate(new Date(booked.starts_at))}, {belarusTime(new Date(booked.starts_at))}
                    </p>
                    <p className="mt-1 text-muted">
                      {booked.service_name} · {booked.duration_min} мин · {Number(booked.price)} BYN
                    </p>
                    <p className="mt-2">
                      Запись №{booked.id} создана. Мастер свяжется с вами при необходимости.
                    </p>
                  </>
                ) : (
                  <p>
                    Запись №{bookedId} создана. Мастер свяжется с вами при необходимости.
                  </p>
                )}
                {booked?.client_chat_id ? (
                  <p className="mt-3 text-xs" style={{ color: '#3f7a4f' }}>
                    Напоминание в Telegram включено ✓
                  </p>
                ) : booked?.client_token && botName ? (
                  <>
                    <a
                      href={`https://t.me/${botName}?start=${booked.client_token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                      style={{ backgroundColor: '#2AABEE' }}
                    >
                      Получить напоминание в Telegram
                    </a>
                    <p className="mt-1.5 text-[11px] text-muted">
                      Откройте бота и нажмите /start — напомним за час до визита.
                    </p>
                  </>
                ) : null}
                <BookingConversion appointmentId={bookedId} />
              </div>
            ) : null}

            <BookingForm
              services={services}
              initial={{
                errorCode,
                errorMessage,
                name: one(params.name),
                phone: one(params.phone),
                comment: one(params.comment),
                serviceIds: one(params.services)
                  .split(',')
                  .filter((id) => /^\d+$/.test(id)),
                date: one(params.date),
                time: one(params.time),
              }}
            />
          </div>
        </div>
      </div>

      <Script
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `(function(){
            var iframe=null;
            function getIframe(){ if(!iframe) iframe=document.querySelector('iframe[src^="/character.html"]'); return iframe; }
            function send(type,x,y){ var f=getIframe(); if(f&&f.contentWindow){ var r=f.getBoundingClientRect(); f.contentWindow.postMessage({type:type,x:x-r.left,y:y-r.top},'*'); } }
            document.addEventListener('pointermove',function(e){ send('pointer',e.clientX,e.clientY); },{passive:true});
            document.addEventListener('pointerdown',function(e){ send('down',e.clientX,e.clientY); },{passive:true});
            document.addEventListener('focusin',function(e){
              var t=e.target;
              if(t && (t.tagName==='INPUT'||t.tagName==='SELECT'||t.tagName==='TEXTAREA')){
                var r=t.getBoundingClientRect();
                send('pointer',r.left+r.width/2,r.top+r.height/2);
              }
            });
            document.addEventListener('input',function(e){
              var t=e.target;
              if(t && (t.tagName==='INPUT'||t.tagName==='SELECT'||t.tagName==='TEXTAREA')){
                var r=t.getBoundingClientRect();
                send('pointer',r.left+r.width/2,r.top+r.height/2);
              }
            });
          })();`,
        }}
      />
    </main>
  );
}
