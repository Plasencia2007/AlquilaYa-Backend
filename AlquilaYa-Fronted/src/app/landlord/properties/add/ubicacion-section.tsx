'use client';

import { type ChangeEvent } from 'react';
import dynamic from 'next/dynamic';

// Leaflet necesita el navegador → carga sin SSR.
const MapPicker = dynamic(() => import('@/components/shared/MapPicker'), { ssr: false });

import { UPEU_COORDS, UPEU_RADIO_MAX_KM, formatearDistancia, type ZonaGeo } from '@/lib/geo';
import { type ZonaResolucion } from '@/services/universidad-service';
import { cn } from '@/lib/cn';
import { Field, InputField, Section } from './property-form-primitives';
import type { Errores, FormState } from './property-form-types';

interface UbicacionSectionProps {
  form: FormState;
  errores: Errores;
  onInput: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  zonas: ZonaResolucion[];
  requestingGeo: boolean;
  usarMiUbicacion: () => void;
  geocoding: boolean;
  ubicarDireccion: () => void;
  geoMsg: string | null;
  distanciaUpeu: number | null;
  zonaActual: ZonaGeo | null;
  onPinChange: (lat: number, lng: number) => void;
}

export function UbicacionSection({
  form,
  errores,
  onInput,
  zonas,
  requestingGeo,
  usarMiUbicacion,
  geocoding,
  ubicarDireccion,
  geoMsg,
  distanciaUpeu,
  zonaActual,
  onPinChange,
}: UbicacionSectionProps) {
  return (
    <Section
      step={2}
      icon="location_on"
      title="Ubicación"
      subtitle={
        zonas.length > 0
          ? 'La propiedad debe ubicarse dentro de una zona de cobertura de una universidad registrada'
          : `Las propiedades deben estar a menos de ${UPEU_RADIO_MAX_KM} km del campus`
      }
    >
      <div data-field="direccion">
        <Field label="Dirección" hint={`${form.direccion.length}/255`} required error={errores.direccion}>
          <InputField
            name="direccion"
            icon="home_pin"
            value={form.direccion}
            onChange={onInput}
            placeholder="Av. Las Flores 123, Ñaña, Lima"
            maxLength={255}
            error={!!errores.direccion}
          />
        </Field>
      </div>

      <details className="rounded-xl border border-border bg-card/40 px-3 py-2">
        <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
          Coordenadas exactas (avanzado)
        </summary>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div data-field="latitud">
            <Field label="Latitud" hint="-90 a 90" error={errores.latitud}>
              <InputField
                type="number"
                step="0.000001"
                name="latitud"
                value={form.latitud}
                onChange={onInput}
                placeholder="-11.987800"
                error={!!errores.latitud}
              />
            </Field>
          </div>
          <div data-field="longitud">
            <Field label="Longitud" hint="-180 a 180" error={errores.longitud}>
              <InputField
                type="number"
                step="0.000001"
                name="longitud"
                value={form.longitud}
                onChange={onInput}
                placeholder="-76.898000"
                error={!!errores.longitud}
              />
            </Field>
          </div>
        </div>
      </details>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={usarMiUbicacion}
          disabled={requestingGeo}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card text-sm font-semibold text-foreground hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span className={cn('material-symbols-outlined text-[16px]', requestingGeo && 'animate-spin')}>
            {requestingGeo ? 'autorenew' : 'my_location'}
          </span>
          {requestingGeo ? 'Buscando…' : 'Usar mi ubicación'}
        </button>

        <button
          type="button"
          onClick={ubicarDireccion}
          disabled={geocoding || form.direccion.trim().length < 5}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card text-sm font-semibold text-foreground hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          title="Ubicar la dirección escrita en el mapa"
        >
          <span className={cn('material-symbols-outlined text-[16px]', geocoding && 'animate-spin')}>
            {geocoding ? 'autorenew' : 'pin_drop'}
          </span>
          {geocoding ? 'Ubicando…' : 'Ubicar dirección'}
        </button>

        {geoMsg && <span className="text-[11px] text-muted-foreground">{geoMsg}</span>}

        {/* Distancia al campus: solo en modo fallback (sin zonas cargadas). Con zonas, manda
            el badge de zona de abajo y este indicador de un solo campus sería contradictorio. */}
        {distanciaUpeu !== null && zonas.length === 0 && (
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border',
              distanciaUpeu <= UPEU_RADIO_MAX_KM
                ? 'bg-[var(--color-success-light)] text-[var(--color-success)] border-[var(--color-success)]/20'
                : 'bg-destructive/10 text-destructive border-destructive/20',
            )}
          >
            <span className="material-symbols-outlined text-[13px]">school</span>
            {distanciaUpeu <= UPEU_RADIO_MAX_KM ? 'A ' : 'Fuera de rango: '}
            {formatearDistancia(distanciaUpeu)} del campus
          </span>
        )}

        {/* Zona de cobertura resuelta en vivo (coincide con la validación del backend). */}
        {distanciaUpeu !== null && zonas.length > 0 && (
          zonaActual ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border bg-[var(--color-success-light)] text-[var(--color-success)] border-[var(--color-success)]/20">
              <span className="material-symbols-outlined text-[13px]">where_to_vote</span>
              En {zonaActual.nombre}
              {zonaActual.universidadNombre ? ` · ${zonaActual.universidadNombre}` : ''}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border bg-destructive/10 text-destructive border-destructive/20">
              <span className="material-symbols-outlined text-[13px]">wrong_location</span>
              Fuera de cobertura — no podrás publicar aquí
            </span>
          )
        )}
      </div>

      {/* Mapa interactivo: pin arrastrable + zonas de cobertura sombreadas */}
      <div>
        <MapPicker
          lat={Number.isNaN(parseFloat(form.latitud)) ? UPEU_COORDS.lat : parseFloat(form.latitud)}
          lng={Number.isNaN(parseFloat(form.longitud)) ? UPEU_COORDS.lng : parseFloat(form.longitud)}
          onPositionChange={onPinChange}
          zonas={zonas}
        />
        <p className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">
          Arrastra el pin o haz clic en el mapa para ubicar tu propiedad. El área sombreada
          es la zona de cobertura de cada universidad — tu propiedad debe caer dentro.
        </p>
      </div>
    </Section>
  );
}
