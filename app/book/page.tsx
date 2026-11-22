import Link from 'next/link';
import { query } from '@/lib/db';
import { todayBelarus } from '@/lib/dikidi/time';
import { bookAppointment } from './actions';

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
  invalid_service: 'Выберите услугу из списка.',
};

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ booked?: string; error?: string }>;
}) {
  const params = await searchParams;
  const { rows: services } = await query<ServiceRow>(
    `select id, name, price, duration_min
       from services
      where is_active = true
      order by name`,
  );

  const bookedId = params.booked;
  const errorMessage = params.error ? (ERRORS[params.error] ?? params.error) : null;

  return (
    <main
      className="relative min-h-screen overflow-hidden"
      style={{ backgroundColor: '#dda2ab', color: '#1A1618' }}
    >
      <iframe
        src="/character.html?embed=1"
        title="Анимация"
        className="fixed inset-0 h-screen w-screen border-0"
        style={{ pointerEvents: 'none' }}
        loading="eager"
      />

      <div className="relative z-10 flex min-h-screen flex-col px-4 py-10 pointer-events-none">
        <div className="pointer-events-auto">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted transition hover:text-charcoal"
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
            <p className="mt-2 text-sm text-muted">
              Выберите услугу, день и время — запись сразу попадёт к мастеру.
            </p>

            {bookedId ? (
              <div className="mt-6 rounded-2xl border border-border bg-white px-4 py-3 text-sm">
                Запись №{bookedId} создана. Мастер свяжется с вами при необходимости.
              </div>
            ) : null}

            {errorMessage ? (
              <div className="mt-6 rounded-2xl border border-gold-light bg-gold-light px-4 py-3 text-sm text-gold">
                {errorMessage}
              </div>
            ) : null}

            <form
              action={bookAppointment}
              className="mt-6 space-y-4"
            >
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Имя</span>
                <input
                  name="clientName"
                  required
                  minLength={2}
                  maxLength={80}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-medium">Телефон</span>
                <input
                  name="clientPhone"
                  required
                  inputMode="tel"
                  placeholder="+375 (29) 123-45-67"
                  className="w-full rounded-lg border border-border bg-white px-3 py-2"
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block font-medium">Услуга</span>
                <select
                  name="serviceId"
                  required
                  className="w-full rounded-lg border border-border bg-white px-3 py-2"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Выберите услугу
                  </option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name} — {Number(service.price)} BYN ({service.duration_min} мин)
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-4">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Дата</span>
                  <input
                    type="date"
                    name="date"
                    required
                    min={todayBelarus()}
                    defaultValue={todayBelarus()}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2"
                  />
                </label>

                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Время</span>
                  <input
                    type="time"
                    name="time"
                    required
                    defaultValue="10:00"
                    className="w-full rounded-lg border border-border bg-white px-3 py-2"
                  />
                </label>
              </div>

              <label className="block text-sm">
                <span className="mb-1 block font-medium">Комментарий</span>
                <textarea
                  name="comment"
                  rows={3}
                  maxLength={500}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2"
                />
              </label>

              <button
                type="submit"
                className="w-full rounded-lg bg-rose-dark px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                style={{ backgroundColor: '#B8627A' }}
              >
                Записаться
              </button>
            </form>
          </div>
        </div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){
            var iframe=null;
            function getIframe(){ if(!iframe) iframe=document.querySelector('iframe[src^="/character.html"]'); return iframe; }
            function send(type,x,y){ var f=getIframe(); if(f&&f.contentWindow) f.contentWindow.postMessage({type:type,x:x,y:y},'*'); }
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
