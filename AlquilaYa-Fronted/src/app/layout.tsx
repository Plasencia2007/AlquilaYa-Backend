import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Inter, Manrope } from 'next/font/google';
import './globals.css';

import { Navbar } from '@/components/layout/navbar';
import Footer from '@/components/shared/Footer';
import { AuthDialog } from '@/components/auth/auth-dialog';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { GoogleAuthProvider } from '@/components/auth/google-auth-provider';
import CampusHydrator from '@/components/shared/CampusHydrator';

const fontSans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['300', '400', '500', '600'],
});

const fontHeadline = Manrope({
  subsets: ['latin'],
  variable: '--font-headline',
  weight: ['400', '500', '700', '800'],
});

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
    <html lang={locale} suppressHydrationWarning className={`${fontSans.variable} ${fontHeadline.variable}`}>
      <head>
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
              <CampusHydrator />
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
