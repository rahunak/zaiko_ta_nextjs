import { redirect } from 'next/navigation';

/** По умолчанию админка открывает расписание; новая запись живёт на /admin/new. */
export default function AdminIndexPage(): never {
  redirect('/admin/schedule');
}
