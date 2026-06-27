import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../lib/hooks/useAuth";
import { ToastProvider } from "../lib/hooks/useToast";
import { ThemeProvider } from "../lib/hooks/useTheme";
import { AppShell } from "../components/AppShell";

export const metadata: Metadata = {
  title: "Поиск работы + обучение",
  description: "Личный трекер поиска работы и обучения",
};

// Этот скрипт выполняется синхронно до первой отрисовки React и до загрузки
// CSS — выставляет класс .light на <html> ДО рендера, читая сохранённый
// выбор из localStorage. Без этого при выбранной светлой теме на долю
// секунды мелькала бы тёмная (та, что задана по умолчанию в globals.css),
// пока React не успеет смонтироваться и применить тему через useEffect.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = window.localStorage.getItem('theme');
    var theme = stored === 'dark' || stored === 'light'
      ? stored
      : (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    if (theme === 'light') document.documentElement.classList.add('light');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full antialiased">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-text">
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <AppShell>{children}</AppShell>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
