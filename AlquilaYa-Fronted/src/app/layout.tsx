import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AlquilaYa — Encuentra tu cuarto ideal",
  description: "Plataforma de alquiler de cuartos. Encuentra tu próximo hogar de forma rápida y segura.",
};

import Navbar from "@/components/shared/Navbar";
import Footer from "@/components/shared/Footer";
import AuthModal from "@/features/auth/AuthModal";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const token = document.cookie.split('; ').find(row => row.trim().startsWith('auth-token='));
                  const path = window.location.pathname;
                  const protectedPaths = ['/admin-master', '/landlord', '/student'];
                  const isProtected = protectedPaths.some(p => path.startsWith(p));
                  
                  if (!token && isProtected) {
                    window.location.replace('/');
                  }
                } catch (e) {}
              })();
            `
          }}
        />
      </head>

      <body className="antialiased min-h-screen flex flex-col">
        <AuthModal />
        <Navbar />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
