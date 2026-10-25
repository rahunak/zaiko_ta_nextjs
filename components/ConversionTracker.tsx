'use client'

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

/**
 * Глобальный трекер конверсионных кликов (план роста 25.10, Этап 4):
 * делегированный слушатель на document — не нужно править каждую кнопку.
 * События GA4:
 *   whatsapp_click   — a[href*="wa.me"] / api.whatsapp.com
 *   viber_click      — a[href^="viber://"] (без target=_blank — Deep-link)
 *   telegram_click   — a[href*="t.me"]
 *   dikidi_click     — a[href*="dikidi.net"] (онлайн-запись)
 *   instagram_click  — a[href*="instagram.com"]
 * Телефонные звонки (tel:) ловит PhoneClickTracker — tel_click.
 *
 * После деплоя владелец отмечает эти события как ключевые в GA4
 * (Администратор → События → отметить ключевые) — тогда они пойдут
 * в конверсии через атрибуцию.
 */
interface TrackRule {
  selector: string
  event: string
}

const RULES: TrackRule[] = [
  { selector: 'a[href*="wa.me"]', event: "whatsapp_click" },
  { selector: 'a[href*="api.whatsapp.com"]', event: "whatsapp_click" },
  { selector: 'a[href^="viber://"]', event: "viber_click" },
  { selector: 'a[href*="t.me"]', event: "telegram_click" },
  { selector: 'a[href*="dikidi.net"]', event: "dikidi_click" },
  { selector: 'a[href*="instagram.com"]', event: "instagram_click" },
]

export default function ConversionTracker() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest) return;
      const path = window.location.pathname;

      for (const rule of RULES) {
        const link = target.closest(rule.selector);
        if (!link) continue;
        // Один клик по ссылке → одно событие (вдруг ссылка попала в 2 селектора)
        const el = link as HTMLElement
        if (el.dataset.ga4Converted) break
        el.dataset.ga4Converted = "1"
        trackEvent(rule.event, { page_path: path });
        break;
      }
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
