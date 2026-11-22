import { query } from '@/lib/db';
import { moveServiceAction } from './actions';

type ServiceRow = {
  id: string;
  name: string;
  price: string;
  duration_min: number;
  is_active: boolean;
};

export default async function AdminServicesPage() {
  const { rows: services } = await query<ServiceRow>(
    `select id, name, price, duration_min, is_active
       from services
      order by sort_order, name`,
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl">Услуги</h1>
        <p className="mt-1 text-sm text-muted">
          Порядок строк — это порядок карточек в форме онлайн-записи и списков в админке.
          Меняйте его стрелками: изменения сохраняются сразу.
        </p>
      </div>

      <section className="rounded-2xl border border-border bg-white p-5">
        <ol className="divide-y divide-border">
          {services.map((service, index) => (
            <li
              key={service.id}
              className={`flex items-center gap-3 py-3 first:pt-0 last:pb-0 ${
                service.is_active ? '' : 'opacity-60'
              }`}
            >
              <span className="w-6 shrink-0 text-sm tabular-nums text-muted">{index + 1}</span>

              <span className="min-w-0 flex-1 text-sm">
                <span className="block text-charcoal">{service.name}</span>
                <span className="block text-xs text-muted">
                  {Number(service.price)} BYN · {service.duration_min} мин
                  {service.is_active ? '' : ' · не показывается на сайте'}
                </span>
              </span>

              <div className="flex shrink-0 gap-1">
                {(
                  [
                    { direction: 'up', label: 'Выше', glyph: '↑', disabled: index === 0 },
                    {
                      direction: 'down',
                      label: 'Ниже',
                      glyph: '↓',
                      disabled: index === services.length - 1,
                    },
                  ] as const
                ).map((button) => (
                  <form key={button.direction} action={moveServiceAction}>
                    <input type="hidden" name="id" value={service.id} />
                    <input type="hidden" name="direction" value={button.direction} />
                    <button
                      type="submit"
                      disabled={button.disabled}
                      aria-label={`${button.label}: ${service.name}`}
                      title={button.label}
                      className="h-8 w-8 rounded-lg border border-border text-sm transition enabled:hover:border-rose enabled:hover:text-rose-dark disabled:opacity-30"
                    >
                      {button.glyph}
                    </button>
                  </form>
                ))}
              </div>
            </li>
          ))}
        </ol>

        {services.length === 0 ? (
          <p className="text-sm text-muted">В справочнике пока нет услуг.</p>
        ) : null}
      </section>
    </div>
  );
}
