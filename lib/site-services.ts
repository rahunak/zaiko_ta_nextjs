import { query } from '@/lib/db';
import { services as marketingServices } from '@/lib/data';

/**
 * Услуги для публичных страниц: цены и длительность берутся из БД (тот же
 * источник, что и в /book), а тексты остаются маркетинговыми из lib/data.ts.
 *
 * Раньше цены на лендинге и в записи задавались в двух местах и разъезжались:
 * клиент видел «50 BYN» на сайте и другую сумму в форме. Если услуги нет в БД
 * (или она отключена в админке), карточка не показывается — сайт не обещает
 * то, что нельзя записать.
 */
export type SiteService = {
  name: string;
  /** «40 BYN» */
  price: string;
  /** 40 — для JSON-LD */
  priceValue: number;
  /** «60 мин» */
  duration: string;
  desc: string;
};

const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');

/** Запасной вариант на случай недоступности БД: страница не должна падать. */
function fallback(): SiteService[] {
  return marketingServices.map((service) => {
    const value = parseFloat(service.price.match(/[\d.]+/)?.[0] ?? '0');
    return {
      name: service.name,
      price: `${value} BYN`,
      priceValue: value,
      duration: service.duration,
      desc: service.desc,
    };
  });
}

export async function getSiteServices(): Promise<SiteService[]> {
  try {
    const { rows } = await query<{ name: string; price: string; duration_min: number }>(
      `select name, price, duration_min
         from services
        where is_active = true
        order by sort_order, name`,
    );

    const byName = new Map(rows.map((row) => [normalize(row.name), row]));
    const result: SiteService[] = [];

    for (const marketing of marketingServices) {
      const row = byName.get(normalize(marketing.name));
      if (!row) continue;

      const priceValue = Math.round(Number(row.price));
      result.push({
        name: row.name,
        price: `${priceValue} BYN`,
        priceValue,
        duration: `${row.duration_min} мин`,
        desc: marketing.desc,
      });
    }

    return result.length > 0 ? result : fallback();
  } catch {
    return fallback();
  }
}
