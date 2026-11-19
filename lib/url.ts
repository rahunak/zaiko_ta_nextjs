/**
 * Добавляет параметры к адресу возврата, сохраняя уже имеющиеся.
 *
 * Админка возвращает пользователя туда, откуда он пришёл, а страницы уже содержат
 * параметры (`/admin/schedule?date=…&range=…`). Приклеивание `?cancelled=` вторым
 * вопросительным знаком ломало и баннер, и выбранный диапазон.
 */
export function withQuery(
  url: string,
  params: Record<string, string | undefined>,
): string {
  const [path, search = ''] = url.split('?');
  const query = new URLSearchParams(search);

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue;
    }
    query.set(key, value);
  }

  const suffix = query.toString();
  return suffix ? `${path}?${suffix}` : path;
}
