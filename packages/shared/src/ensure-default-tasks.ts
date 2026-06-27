// Ежедневное создание дефолтных задач — см. 04-features-logic.md,
// раздел "Ежедневное создание дефолтных задач".
//
// При открытии приложения (на любом клиенте) проверяем, есть ли в tasks хотя бы
// одна строка с day = сегодня (локальная дата) для текущего user_id. Если нет —
// создаём 3 дефолтные задачи. Это покрывает и день регистрации (когда триггер
// в Supabase сидирует задачи на серверную UTC-дату, которая может не совпасть
// с локальной "сегодня" пользователя), и каждый последующий новый день.
//
// Эта проверка должна выполняться ОДИН РАЗ при инициализации экрана "Сегодня",
// не на каждый рендер — вызывающий код (web/mobile) отвечает за это (например,
// через useEffect с пустым массивом зависимостей или эквивалент).

import { DEFAULT_DAILY_TASKS } from './seeds';
import { getTodayLocal } from './date-utils';

/**
 * Тип параметра объявлен как `any` намеренно: реальный `SupabaseClient` из
 * @supabase/supabase-js имеет глубокий generic-тип, и попытка структурно
 * сопоставить его с детальным интерфейсом здесь приводит к ошибке TypeScript
 * "Type instantiation is excessively deep and possibly infinite". Чистая
 * бизнес-логика ниже не зависит от конкретного клиента — этого достаточно.
 */
export type AnySupabaseClient = any; // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Проверяет наличие задач на сегодня и создаёт дефолтные, если их нет.
 * Безопасно вызывать многократно — не создаёт дублей, так как проверяет
 * наличие перед вставкой.
 */
export async function ensureDefaultTasksForToday(
  supabase: AnySupabaseClient,
  userId: string
): Promise<void> {
  const today = getTodayLocal();

  const { data, error } = await supabase
    .from('tasks')
    .select('id')
    .eq('user_id', userId)
    .eq('day', today);

  if (error) {
    // Не блокируем рендер экрана из-за сетевой ошибки — просто не создаём задачи
    // в этом проходе, следующая попытка будет при следующем открытии экрана.
    console.error('ensureDefaultTasksForToday: ошибка проверки задач', error);
    return;
  }

  if (data && data.length > 0) {
    return; // на сегодня уже есть задачи — ничего не делаем
  }

  const rows = DEFAULT_DAILY_TASKS.map((task) => ({
    user_id: userId,
    day: today,
    text: task.text,
    category: task.category,
    done: false,
  }));

  const { error: insertError } = await supabase.from('tasks').insert(rows);
  if (insertError) {
    console.error('ensureDefaultTasksForToday: ошибка создания задач', insertError);
  }
}
