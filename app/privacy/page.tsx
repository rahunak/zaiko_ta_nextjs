import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  metadataBase: new URL('https://zaiko.by'),
  title: 'Согласие на сбор и обработку данных — Зайко Татьяна',
  description:
    'Какие данные собирает сайт zaiko.by при онлайн-записи, зачем они нужны, где хранятся и как отозвать согласие на их обработку.',
  alternates: { canonical: 'https://zaiko.by/privacy' },
  robots: { index: true, follow: true },
};

/**
 * Дефолтный документ о сборе и обработке данных.
 * Юридическая формулировка типовая — при необходимости мастер согласует текст
 * с юристом, структура (оператор, данные, цели, сроки, права) уже на месте.
 */
export default function PrivacyPage() {
  return (
    <main className="min-h-screen px-4 py-12 sm:px-6" style={{ backgroundColor: '#FAF6F2', color: '#1A1618' }}>
      <div className="mx-auto w-full max-w-3xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium transition hover:opacity-80"
          style={{ color: '#8B4A63' }}
        >
          ← На главную
        </Link>

        <h1 className="mt-6 font-display text-3xl sm:text-4xl" style={{ fontFamily: 'var(--font-playfair)' }}>
          Согласие на сбор и обработку данных
        </h1>
        <p className="mt-2 text-sm" style={{ color: '#8B7E7A' }}>
          Редакция от 22 ноября 2026 года
        </p>

        <div className="mt-8 space-y-6 rounded-2xl border bg-white p-6 text-sm leading-relaxed sm:p-8" style={{ borderColor: '#E8DCDA' }}>
          <section>
            <h2 className="font-display text-lg" style={{ color: '#1A1618' }}>1. Кто обрабатывает данные</h2>
            <p className="mt-2">
              Оператор: Зайко Татьяна, мастер по бровям и ресницам, УНП KE8812226,
              г. Крупки, ул. Советская, 49, 2 этаж, кабинет 7. Телефон для связи:
              <a href="tel:+375256827229" className="ml-1 underline" style={{ color: '#8B4A63' }}>
                +375 (25) 68-27-229
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg" style={{ color: '#1A1618' }}>2. Какие данные собираются</h2>
            <p className="mt-2">При заполнении формы онлайн-записи и при обращении по телефону или в мессенджерах:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>имя, которое вы указали;</li>
              <li>номер телефона для связи и подтверждения записи;</li>
              <li>выбранные услуги, дата и время визита, сумма к оплате;</li>
              <li>комментарий к записи, если вы его оставили;</li>
              <li>технические данные посещения сайта: обезличенные данные о просмотрах и устройстве.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg" style={{ color: '#1A1618' }}>3. Зачем они нужны</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>оформить запись на выбранную услугу и время;</li>
              <li>связаться с вами, чтобы подтвердить, перенести или отменить визит;</li>
              <li>напомнить о записи;</li>
              <li>вести внутренний учёт визитов и понимать, какие услуги востребованы;</li>
              <li>улучшать сайт: видеть, какими страницами и разделами пользуются.</li>
            </ul>
            <p className="mt-2">
              Основание обработки — ваше согласие, которое вы даёте, отправляя форму записи
              или обращаясь к мастеру напрямую. Данные не используются для рассылок без
              отдельного согласия и не продаются третьим лицам.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg" style={{ color: '#1A1618' }}>4. Кому передаются данные</h2>
            <p className="mt-2">
              Данные записи могут передаваться в мессенджер Telegram — для уведомления мастера
              о новой записи и напоминаний клиенту. Передаётся только то, что нужно для записи:
              имя, телефон, услуга, дата и время.
            </p>
            <p className="mt-2">
              Для статистики посещений используются обезличенные счётчики Яндекс.Метрики и
              Google Analytics. Они не получают ваши имя и телефон.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg" style={{ color: '#1A1618' }}>5. Сколько данные хранятся</h2>
            <p className="mt-2">
              Записи хранятся, пока это нужно для учёта визитов и повторных обращений, но не
              дольше трёх лет с даты визита. После этого они удаляются или обезличиваются.
              Отозвать согласие можно раньше — тогда данные удаляются, кроме тех, что нужно
              хранить по закону.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg" style={{ color: '#1A1618' }}>6. Ваши права</h2>
            <p className="mt-2">Вы можете:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>узнать, какие ваши данные хранятся;</li>
              <li>попросить исправить неточные данные;</li>
              <li>отозвать согласие и попросить удалить данные;</li>
              <li>получить копию своих данных.</li>
            </ul>
            <p className="mt-2">
              Для этого достаточно написать или позвонить мастеру по контактам из раздела 1.
              Ответ — в течение 15 дней.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg" style={{ color: '#1A1618' }}>7. Cookie и статистика</h2>
            <p className="mt-2">
              Сайт использует cookie для работы формы записи и для обезличенной статистики
              посещений. Вы можете отключить cookie в настройках браузера — запись при этом
              останется доступной.
            </p>
          </section>

          <section>
            <h2 className="font-display text-lg" style={{ color: '#1A1618' }}>8. Изменения документа</h2>
            <p className="mt-2">
              Актуальная редакция всегда опубликована на этой странице. Дата обновления указана
              в начале документа.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
