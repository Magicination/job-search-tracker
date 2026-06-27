#!/usr/bin/env node
// Проверяет наличие apps/web/.env.local перед запуском dev-сервера.
// Если файла нет — создаёт его из .env.example и печатает инструкцию,
// где взять реальные значения. Не блокирует запуск (Next.js всё равно
// поднимется), но без реальных ключей экраны не смогут читать/писать в Supabase.

const fs = require('fs');
const path = require('path');

const webDir = path.join(__dirname, '..', 'apps', 'web');
const envLocalPath = path.join(webDir, '.env.local');
const envExamplePath = path.join(webDir, '.env.example');

const DIVIDER = '─'.repeat(60);

function printSetupInstructions() {
  console.log('\n' + DIVIDER);
  console.log('Нужно подключить Supabase, прежде чем приложение заработает.');
  console.log(DIVIDER);
  console.log(`
1. Зайдите на https://supabase.com → "New project" (бесплатный план достаточен).

2. После создания проекта откройте боковое меню Project Settings → раздел
   "API Keys" (там же можно найти Project URL через кнопку "Connect" наверху
   страницы проекта).

   Нужны два значения:
   - Project URL                                → это NEXT_PUBLIC_SUPABASE_URL
   - anon key / публичный ключ "anon public"
     (в новых проектах может называться "publishable key", sb_publishable_...)
                                                  → это NEXT_PUBLIC_SUPABASE_ANON_KEY

   ВАЖНО: НЕ путать с "service_role" / "secret" ключом — тот даёт полный доступ
   к базе в обход всех ограничений безопасности и его нельзя использовать
   в браузерном коде. Нужен именно публичный (anon/publishable) ключ.

3. Откройте apps/web/.env.local (он только что создан из шаблона) и впишите туда
   эти два значения вместо плейсхолдеров.

4. Примените SQL-миграции к своему проекту — в дашборде Supabase откройте
   SQL Editor и по очереди выполните содержимое файлов из
   packages/supabase/migrations/, в порядке номеров:
     0001_init_schema.sql
     0002_rls_policies.sql
     0003_seed_new_user_trigger.sql

5. Запустите команду снова: npm run dev
`);
  console.log(DIVIDER + '\n');
}

if (!fs.existsSync(envLocalPath)) {
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envLocalPath);
  } else {
    fs.writeFileSync(
      envLocalPath,
      'NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co\nNEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key\n'
    );
  }
  printSetupInstructions();
  console.log('Файл .env.local создан с заглушками. Заполните его и запустите npm run dev снова.\n');
  process.exit(1);
} else {
  const content = fs.readFileSync(envLocalPath, 'utf-8');
  const looksLikePlaceholder =
    content.includes('your-project.supabase.co') || content.includes('your-anon-key');
  if (looksLikePlaceholder) {
    console.log('\n⚠️  apps/web/.env.local пока содержит значения-заглушки.');
    printSetupInstructions();
    process.exit(1);
  }
}
