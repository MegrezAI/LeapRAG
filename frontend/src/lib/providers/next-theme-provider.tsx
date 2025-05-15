'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      disableTransitionOnChange
      enableSystem={false}
      defaultTheme="light"
      forcedTheme="light"
    >
      {children}
    </NextThemesProvider>
  );
}
