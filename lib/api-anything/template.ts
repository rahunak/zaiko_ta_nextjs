/**
 * Шаблон аргументов операции api-anything.
 *
 * Параметры выученной операции заранее неизвестны, поэтому имя операции и её аргументы
 * задаются JSON-шаблоном в env, где подстановки вида {from} заменяются значениями.
 *
 * Пример: {"company":"{company}","date_from":"{from}","date_to":"{to}"}
 */
export function renderArgsTemplate(
  templateJson: string | undefined,
  values: Record<string, string>,
): Record<string, string> | { error: string } {
  if (!templateJson || !templateJson.trim()) {
    return { error: 'Шаблон аргументов не задан' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(templateJson);
  } catch {
    return { error: 'Шаблон аргументов — невалидный JSON' };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { error: 'Шаблон аргументов должен быть JSON-объектом' };
  }

  const result: Record<string, string> = {};

  for (const [key, rawValue] of Object.entries(parsed as Record<string, unknown>)) {
    if (rawValue === null || rawValue === undefined) {
      continue;
    }

    result[key] = String(rawValue).replace(
      /\{(\w+)\}/g,
      (match: string, name: string) => values[name] ?? match,
    );
  }

  return result;
}
