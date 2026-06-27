// Supabase-клиент для web. В отличие от mobile (где нужен AsyncStorage adapter),
// в браузере Supabase по умолчанию использует localStorage — никакой
// дополнительной настройки storage не требуется.
// См. 03-screens-mobile.md, раздел "Хранение сессии и Supabase-клиент в Expo".

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Не бросаем исключение на этапе сборки (важно для Vercel: build должен
  // проходить даже до того, как заданы env-переменные проекта), но громко
  // предупреждаем в консоли — без них приложение не сможет подключиться
  // к Supabase в runtime.
  console.warn(
    'Не заданы NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Локально: скопируйте .env.example в .env.local. ' +
      'На Vercel: добавьте их в Project Settings → Environment Variables.'
  );
}

// createClient валидирует переданный URL и бросает исключение на пустой
// строке — используем синтаксически валидный placeholder-домен, чтобы
// сборка (build) не падала при отсутствии переменных окружения. Реальные
// запросы к этому домену просто завершатся ошибкой сети в runtime, что
// нормально для состояния "ключи ещё не настроены".
export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-anon-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);
