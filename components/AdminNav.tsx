'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/admin/new', label: 'Новая запись' },
  { href: '/admin/schedule', label: 'Расписание' },
  { href: '/admin/availability', label: 'График' },
  { href: '/admin/services', label: 'Порядок услуг' },
  { href: '/admin/reminders', label: 'Напоминания' },
];

/** Навигация админки: активный раздел виден сразу, а не только по заголовку. */
export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="mx-auto flex max-w-5xl flex-wrap gap-1 px-2 pb-1.5 text-sm">
      {LINKS.map((link) => {
        const active =
          pathname === link.href ||
          (link.href === '/admin/schedule' && pathname === '/admin');

        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-10 items-center rounded-lg px-3 transition ${
              active
                ? 'bg-gradient-to-b from-rose to-rose-dark font-medium text-white shadow-sm'
                : 'text-charcoal hover:bg-cream hover:text-rose-dark'
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
