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
import { ServiceWorkerRegister } from '@/components/pwa/service-worker-register';

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

// S5: el guard client-side que había acá (leía `document.cookie` buscando 'auth-token=')
// se ELIMINÓ — con el access token httpOnly, `document.cookie` NUNCA lo ve, así que el guard
// SIEMPRE habría visto "sin token" y expulsado a CUALQUIER usuario logueado de las rutas
// privadas. La protección real y verdadera sigue intacta en `proxy.ts` (el middleware de
// Next 16): corre en el SERVIDOR, donde SÍ puede leer cookies httpOnly sin problema (el
// httpOnly sólo bloquea el JS del navegador) — y de hecho es más segura que este guard
// client-side, porque redirige ANTES de servir el HTML de la ruta protegida.

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
      </head>

      <body className="antialiased min-h-screen flex flex-col bg-background text-foreground">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>
            <GoogleAuthProvider>
              <CampusHydrator />
              <ServiceWorkerRegister />
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
