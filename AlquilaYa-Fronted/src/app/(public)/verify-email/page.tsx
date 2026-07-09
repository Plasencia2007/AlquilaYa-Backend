'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SuccessScreen } from '@/components/shared/success-screen';
import { servicioAuth } from '@/services/auth-service';
import { useAuthModal } from '@/stores/auth-modal-store';
import { notify } from '@/lib/notify';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { open: openAuthModal } = useAuthModal();

  const [correo, setCorreo] = useState(searchParams.get('correo') ?? '');
  const [codigo, setCodigo] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [exito, setExito] = useState(false);

  useEffect(() => {
    if (cooldown > 0) {
      const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [cooldown]);

  const enviarCodigo = async () => {
    if (!correo.trim() || enviando || cooldown > 0) return;
    setEnviando(true);
    try {
      const msg = await servicioAuth.reenviarVerificacionEmail(correo.trim());
      notify.success('Código enviado', msg);
      setCooldown(60);
    } catch (err) {
      notify.error(err, 'No se pudo enviar el código');
    } finally {
      setEnviando(false);
    }
  };

  const verificar = async () => {
    if (!correo.trim() || codigo.length < 6) {
      notify.warning('Ingresa tu correo y el código de 6 dígitos.');
      return;
    }
    setVerificando(true);
    try {
      await servicioAuth.verificarCodigoEmail(correo.trim(), codigo);
      setExito(true);
      notify.success('Correo verificado');
    } catch (err) {
      notify.error(err, 'Código incorrecto o expirado');
    } finally {
      setVerificando(false);
    }
  };

  if (exito) {
    return (
      <SuccessScreen
        title="¡Correo verificado!"
        description="Tu correo quedó confirmado. Ya puedes iniciar sesión."
        actionLabel="Iniciar sesión"
        onAction={() => {
          router.push('/');
          setTimeout(() => openAuthModal('login'), 100);
        }}
      />
    );
  }

  return (
    <main className="flex min-h-[80vh] items-center justify-center p-4 animate-in fade-in duration-500">
      <div className="w-full max-w-md space-y-6 rounded-3xl bg-card p-6 shadow-2xl border border-border/50 md:p-8">
        <div className="flex justify-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-accent text-primary">
            <Mail className="size-8" />
          </div>
        </div>
        <header className="space-y-1 text-center">
          <h1 className="font-headline text-2xl font-bold tracking-tight text-foreground">
            Verifica tu correo
          </h1>
          <p className="text-sm text-muted-foreground">
            Te enviamos un código de 6 dígitos. Ingrésalo aquí.
          </p>
        </header>

        <div className="space-y-3">
          <Input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            placeholder="Tu correo"
            className="h-12 rounded-xl bg-input text-sm"
          />
          <Input
            inputMode="numeric"
            maxLength={6}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            autoComplete="one-time-code"
            className="h-14 rounded-xl bg-input text-center text-2xl font-black tracking-[0.5em]"
          />

          <Button
            onClick={verificar}
            disabled={verificando}
            size="lg"
            className="h-12 w-full rounded-full text-sm font-bold tracking-wide shadow-lg shadow-primary/20"
          >
            {verificando ? 'Verificando…' : 'Confirmar código'}
          </Button>

          <p className="text-center text-[11px] text-muted-foreground">
            ¿No te llegó?{' '}
            <button
              type="button"
              onClick={enviarCodigo}
              disabled={enviando || cooldown > 0}
              className="font-bold text-primary transition-colors hover:text-primary/80 disabled:opacity-50"
            >
              {enviando ? 'Enviando…' : cooldown > 0 ? `Reenviar en ${cooldown}s` : 'Enviar código'}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground animate-pulse">
          Cargando…
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
