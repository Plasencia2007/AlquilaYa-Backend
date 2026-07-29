'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Colecciones sugeridas por defecto, además de las que el propio estudiante
 * cree libremente desde el popover de la card (ítem 231, fase 1: front-only).
 */
export const COLECCIONES_DEFECTO = ['Para el próximo ciclo', 'Con mi grupo'];

interface FavoriteCollectionsState {
  /** Nombres de colección disponibles (defecto + creadas por el usuario). */
  colecciones: string[];
  /** propiedadId -> colecciones asignadas a ese favorito. */
  asignaciones: Record<string, string[]>;
  /** propiedadId -> nota personal corta (ítem 233). */
  notas: Record<string, string>;

  /** Crea una colección nueva (no-op si ya existe, comparación case-insensitive). */
  crearColeccion: (nombre: string) => void;
  /** Asigna una colección a un favorito; la crea primero si aún no existe. */
  asignar: (propiedadId: string, coleccion: string) => void;
  desasignar: (propiedadId: string, coleccion: string) => void;
  toggleColeccion: (propiedadId: string, coleccion: string) => void;
  coleccionesDe: (propiedadId: string) => string[];

  setNota: (propiedadId: string, nota: string) => void;
  notaDe: (propiedadId: string) => string;

  reset: () => void;
}

/**
 * Store local de colecciones/etiquetas y notas de favoritos (ítems 231 y 233
 * de MEJORAS.md). Fase 1: todo vive en `localStorage`, sin campo `coleccion`
 * en backend todavía — sigue el patrón de `hidden-properties-store.ts`
 * (array, no `Set`, para serializar bien en JSON; `skipHydration` porque
 * localStorage no existe en SSR).
 */
export const useFavoriteCollectionsStore = create<FavoriteCollectionsState>()(
  persist(
    (set, get) => ({
      colecciones: COLECCIONES_DEFECTO,
      asignaciones: {},
      notas: {},

      crearColeccion: (nombreCrudo) => {
        const nombre = nombreCrudo.trim();
        if (!nombre) return;
        set((state) =>
          state.colecciones.some((c) => c.toLowerCase() === nombre.toLowerCase())
            ? state
            : { colecciones: [...state.colecciones, nombre] },
        );
      },

      asignar: (propiedadId, coleccion) => {
        get().crearColeccion(coleccion);
        set((state) => {
          const actuales = state.asignaciones[propiedadId] ?? [];
          if (actuales.includes(coleccion)) return state;
          return {
            asignaciones: { ...state.asignaciones, [propiedadId]: [...actuales, coleccion] },
          };
        });
      },

      desasignar: (propiedadId, coleccion) =>
        set((state) => {
          const actuales = state.asignaciones[propiedadId];
          if (!actuales || !actuales.includes(coleccion)) return state;
          return {
            asignaciones: {
              ...state.asignaciones,
              [propiedadId]: actuales.filter((c) => c !== coleccion),
            },
          };
        }),

      toggleColeccion: (propiedadId, coleccion) => {
        const actuales = get().asignaciones[propiedadId] ?? [];
        if (actuales.includes(coleccion)) get().desasignar(propiedadId, coleccion);
        else get().asignar(propiedadId, coleccion);
      },

      coleccionesDe: (propiedadId) => get().asignaciones[propiedadId] ?? [],

      setNota: (propiedadId, nota) =>
        set((state) => {
          const limpia = nota.trim();
          const next = { ...state.notas };
          if (limpia) next[propiedadId] = limpia;
          else delete next[propiedadId];
          return { notas: next };
        }),

      notaDe: (propiedadId) => get().notas[propiedadId] ?? '',

      reset: () => set({ colecciones: COLECCIONES_DEFECTO, asignaciones: {}, notas: {} }),
    }),
    {
      name: 'alquilaya-favorite-collections',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);
