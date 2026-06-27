'use client';

import { useState, type FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/hooks/useAuth';

type Screen = 'signin' | 'signup' | 'forgot';

export default function LoginPage() {
  const { requiresPasswordSetup, clearPasswordSetupFlag } = useAuth();
  const [screen, setScreen] = useState<Screen>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err) {
      setError(
        err instanceof Error
          ? 'Неверный email или пароль.'
          : 'Что-то пошло не так. Попробуйте ещё раз.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignUp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      // Сидирование данных нового пользователя выполняется Postgres-триггером
      // on_auth_user_created (см. supabase/migrations/20260101000003_*.sql).
      setInfo('Регистрация прошла успешно. Если требуется подтверждение email — проверьте почту.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Что-то пошло не так. Попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgotPassword(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: typeof window !== 'undefined' ? window.location.origin + '/login' : undefined,
      });
      if (error) throw error;
      setInfo('Если такой email зарегистрирован, на него отправлена ссылка для восстановления пароля.');
    } catch {
      setError('Не удалось отправить письмо. Попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSetPassword(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError('Пароли не совпадают.');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      // Снимаем флаг — теперь AppShell разрешит редирект на /today.
      clearPasswordSetupFlag();
    } catch {
      setError('Не удалось сохранить пароль. Попробуйте ещё раз.');
    } finally {
      setSubmitting(false);
    }
  }

  // Этот экран остаётся на случай восстановления пароля (ссылка из письма
  // "Забыли пароль?" создаёт временную сессию точно так же, как раньше
  // создавал инвайт) — сама регистрация теперь открыта для всех на форме ниже.
  if (requiresPasswordSetup) {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-xl border border-border bg-panel p-6">
          <h1 className="mb-1 text-lg font-semibold text-text">Новый пароль</h1>
          <p className="mb-6 text-sm text-text-dim">Установите пароль для входа в дальнейшем</p>

          <form onSubmit={handleSetPassword} className="flex flex-col gap-3">
            <div>
              <label htmlFor="new-password" className="mb-1 block text-xs text-text-dim">
                Новый пароль
              </label>
              <input
                id="new-password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-panel-2 px-3 py-2 text-sm text-text outline-none focus-visible:border-accent-blue"
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="mb-1 block text-xs text-text-dim">
                Повторите пароль
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-border bg-panel-2 px-3 py-2 text-sm text-text outline-none focus-visible:border-accent-blue"
              />
            </div>

            {error && <p className="text-sm text-accent-coral">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 rounded-lg bg-accent-amber px-3 py-2 text-sm font-medium text-bg transition disabled:opacity-60"
            >
              {submitting ? 'Сохранение…' : 'Сохранить и войти'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (screen === 'forgot') {
    return (
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-xl border border-border bg-panel p-6">
          <h1 className="mb-1 text-lg font-semibold text-text">Восстановление пароля</h1>
          <p className="mb-6 text-sm text-text-dim">Отправим ссылку для смены пароля на email</p>

          <form onSubmit={handleForgotPassword} className="flex flex-col gap-3">
            <div>
              <label htmlFor="reset-email" className="mb-1 block text-xs text-text-dim">
                Email
              </label>
              <input
                id="reset-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-border bg-panel-2 px-3 py-2 text-sm text-text outline-none focus-visible:border-accent-blue"
              />
            </div>

            {error && <p className="text-sm text-accent-coral">{error}</p>}
            {info && <p className="text-sm text-accent-teal">{info}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 rounded-lg bg-accent-amber px-3 py-2 text-sm font-medium text-bg transition disabled:opacity-60"
            >
              {submitting ? 'Отправка…' : 'Отправить ссылку'}
            </button>
            <button
              type="button"
              onClick={() => {
                setScreen('signin');
                setError(null);
                setInfo(null);
              }}
              className="text-xs text-text-dim hover:text-text"
            >
              ← Назад ко входу
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-panel p-6">
        <h1 className="mb-1 text-lg font-semibold text-text">Поиск работы + обучение</h1>
        <p className="mb-6 text-sm text-text-dim">
          {screen === 'signin' ? 'Войдите в свою учётную запись' : 'Создайте учётную запись'}
        </p>

        <div className="mb-5 flex rounded-lg border border-border-soft bg-panel-2 p-1 text-sm">
          <button
            type="button"
            onClick={() => {
              setScreen('signin');
              setError(null);
              setInfo(null);
            }}
            className={`flex-1 rounded-md py-1.5 transition ${
              screen === 'signin' ? 'bg-panel text-text' : 'text-text-dim'
            }`}
          >
            Войти
          </button>
          <button
            type="button"
            onClick={() => {
              setScreen('signup');
              setError(null);
              setInfo(null);
            }}
            className={`flex-1 rounded-md py-1.5 transition ${
              screen === 'signup' ? 'bg-panel text-text' : 'text-text-dim'
            }`}
          >
            Зарегистрироваться
          </button>
        </div>

        <form onSubmit={screen === 'signin' ? handleSignIn : handleSignUp} className="flex flex-col gap-3">
          <div>
            <label htmlFor="email" className="mb-1 block text-xs text-text-dim">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-panel-2 px-3 py-2 text-sm text-text outline-none focus-visible:border-accent-blue"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-xs text-text-dim">
              Пароль
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete={screen === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-panel-2 px-3 py-2 text-sm text-text outline-none focus-visible:border-accent-blue"
            />
          </div>

          {error && <p className="text-sm text-accent-coral">{error}</p>}
          {info && <p className="text-sm text-accent-teal">{info}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 rounded-lg bg-accent-amber px-3 py-2 text-sm font-medium text-bg transition disabled:opacity-60"
          >
            {submitting ? 'Подождите…' : screen === 'signin' ? 'Войти' : 'Зарегистрироваться'}
          </button>
          {screen === 'signin' && (
            <button
              type="button"
              onClick={() => {
                setScreen('forgot');
                setError(null);
                setInfo(null);
              }}
              className="text-xs text-text-dim hover:text-text"
            >
              Забыли пароль?
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
