import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import './globals.css';

import { Navbar } from '@/components/layout/navbar';
import Footer from '@/components/shared/Footer';
import { AuthDialog } from '@/components/auth/auth-dialog';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { GoogleAuthProvider } from '@/components/auth/google-auth-provider';

export const metadata: Metadata = {
  title: 'AlquilaYa — Encuentra tu cuarto ideal',
  description:
    'Plataforma de alquiler de cuartos para estudiantes UPeU. Encuentra tu próximo hogar de forma rápida y segura.',
};

// Script blocking que setea data-theme ANTES del primer paint, evitando FOUC
// cuando el usuario tiene tema oscuro guardado en localStorage o por el OS.
const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('theme');
    var theme;
    if (stored === 'dark' || stored === 'light') {
      theme = stored;
    } else {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.dataset.theme = theme;
  } catch (e) {}
})();
`;

// Redirect blocking de rutas privadas si no hay cookie auth-token (defensa
// adicional al proxy.ts; reduce flash de contenido protegido).
const authGuardScript = `
(function() {
  try {
    var token = document.cookie.split('; ').find(function(r) { return r.trim().startsWith('auth-token='); });
    var path = window.location.pathname;
    var protectedPaths = ['/admin-master', '/landlord', '/student'];
    var isProtected = protectedPaths.some(function(p) { return path.startsWith(p); });
    if (!token && isProtected) {
      window.location.replace('/');
    }
  } catch (e) {}
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script dangerouslySetInnerHTML={{ __html: authGuardScript }} />
      </head>

      <body className="antialiased min-h-screen flex flex-col bg-background text-foreground">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>
            <GoogleAuthProvider>
              <AuthDialog />
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
              <Toaster richColors closeButton position="top-right" />
            </GoogleAuthProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
