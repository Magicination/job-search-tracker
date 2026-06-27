// AppShell (см. components/AppShell.tsx) выполняет редирект:
// - на /login, если пользователь не авторизован
// - на /today, если авторизован и оказался на /
// Здесь достаточно пустого фрагмента — редирект происходит до отрисовки контента.
export default function RootPage() {
  return null;
}
