// Общая логика разбора ответа hh.ru API — вынесена отдельно, чтобы не
// дублировать код между клиентским запросом (основной путь, см.
// useApplications.addApplicationFromUrl) и серверным fallback
// (app/api/parse-vacancy/route.ts, используется если браузер заблокирован
// CORS-политикой hh.ru или сетевыми ограничениями пользователя).
//
// Почему два пути: hh.ru, по всей видимости, блокирует запросы с
// датацентровых IP (типичная анти-бот защита) — серверные функции Vercel
// получали 403 даже с корректными заголовками. Запрос из браузера
// пользователя идёт с обычного "живого" IP, что должно решать эту
// проблему — но мы не можем заранее знать, разрешает ли hh.ru CORS для
// браузерных cross-origin запросов, поэтому держим сервер как fallback.

export interface ParsedVacancy {
  company: string;
  role: string;
  salary: string;
  experienceRequired: string;
  sourceUrl: string;
}

interface HhSalary {
  from: number | null;
  to: number | null;
  currency: string | null;
  gross: boolean | null;
}

interface HhVacancyResponse {
  name?: string;
  salary?: HhSalary | null;
  experience?: { name?: string } | null;
  employer?: { name?: string } | null;
  alternate_url?: string;
}

/** Извлекает числовой ID вакансии из любого формата ссылки hh.ru/hh.kz/hh.by и т.д. */
export function extractHhVacancyId(url: string): string | null {
  const match = url.match(/\/vacancy\/(\d+)/);
  return match ? match[1] : null;
}

export function isHhUrl(url: string): boolean {
  return url.includes('hh.');
}

function formatSalary(salary: HhSalary | null | undefined): string {
  if (!salary) return '';
  const { from, to, currency } = salary;
  const currencySymbol = currency === 'RUR' ? '₽' : currency ?? '';

  if (from && to) return `${from.toLocaleString('ru-RU')}–${to.toLocaleString('ru-RU')} ${currencySymbol}`;
  if (from) return `от ${from.toLocaleString('ru-RU')} ${currencySymbol}`;
  if (to) return `до ${to.toLocaleString('ru-RU')} ${currencySymbol}`;
  return '';
}

export function normalizeHhVacancy(data: HhVacancyResponse, fallbackUrl: string): ParsedVacancy {
  return {
    company: data.employer?.name ?? '',
    role: data.name ?? '',
    salary: formatSalary(data.salary),
    experienceRequired: data.experience?.name ?? '',
    sourceUrl: data.alternate_url ?? fallbackUrl,
  };
}

/**
 * Запрос напрямую из браузера к api.hh.ru. Это основной путь — браузерный
 * IP пользователя не датацентровый, в отличие от серверных функций Vercel,
 * которые hh.ru блокирует анти-бот защитой. Если этот запрос не пройдёт
 * (CORS-ошибка или сетевой сбой), вызывающий код должен попробовать
 * /api/parse-vacancy как запасной вариант.
 */
export async function fetchHhVacancyFromBrowser(vacancyId: string): Promise<ParsedVacancy> {
  const response = await fetch(`https://api.hh.ru/vacancies/${vacancyId}`, {
    headers: { Accept: 'application/json' },
  });

  if (response.status === 404) {
    throw new Error('Вакансия не найдена — возможно, она снята с публикации или ссылка неверна.');
  }
  if (!response.ok) {
    throw new Error(`hh.ru API вернул ошибку (${response.status}).`);
  }

  const data = (await response.json()) as HhVacancyResponse;
  return normalizeHhVacancy(data, `https://hh.ru/vacancy/${vacancyId}`);
}
