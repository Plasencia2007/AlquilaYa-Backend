'use client';

import VerificationPanel from '@/components/auth/verification-panel';

export default function LandlordProfileDocsPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-3xl font-black text-on-surface tracking-tighter opacity-90">
          Documentos de verificación
        </h1>
        <p className="text-on-surface-variant text-[12px] font-medium mt-0.5 tracking-tight">
          Verifica tu identidad para que los estudiantes confíen en ti.
        </p>
      </header>
      <VerificationPanel />
    </div>
  );
}
