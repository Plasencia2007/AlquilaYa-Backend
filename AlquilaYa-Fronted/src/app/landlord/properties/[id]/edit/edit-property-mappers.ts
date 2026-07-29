/**
 * Adaptadores entre `FormState` (el estado del wizard de alta, `add/property-form-types.ts`)
 * y las formas que habla el backend para edición: `PropiedadCompleta` (lectura, GET
 * .../completo) y `PropiedadUpdate` (escritura, PUT /propiedades/{id}).
 *
 * Ítem 311 de MEJORAS.md: esta página de edición reutiliza las mismas secciones del wizard
 * de alta (`InfoBasicaSection`, `UbicacionSection`, etc.), que solo saben hablar `FormState`.
 * Estas funciones son el único lugar donde se traduce entre ambos mundos.
 */
import type {
  PeriodoAlquiler,
  PropiedadCompleta,
  PropiedadUpdate,
  ServicioConEstado,
  TipoPropiedad,
} from '@/types/propiedad';
import { INITIAL_FORM, type FormState } from '../../add/property-form-types';

/** Puebla un `FormState` vacío con los datos de una propiedad ya existente. */
export function completaToFormState(c: PropiedadCompleta): FormState {
  const serviciosIncluidos =
    c.servicios?.filter((s) => s.estado === 'INCLUIDO').map((s) => s.servicio) ??
    c.serviciosIncluidos ??
    [];
  const serviciosAparte = c.servicios?.filter((s) => s.estado === 'APARTE').map((s) => s.servicio) ?? [];
  const montosServiciosAparte = Object.fromEntries(
    (c.servicios ?? [])
      .filter((s) => s.estado === 'APARTE' && s.monto != null)
      .map((s) => [s.servicio, String(s.monto)]),
  );

  return {
    ...INITIAL_FORM,
    titulo: c.titulo ?? '',
    descripcion: c.descripcion ?? '',
    precio: c.precio != null ? String(c.precio) : '',
    deposito: c.deposito != null ? String(c.deposito) : '',
    direccion: c.direccion ?? '',
    tipoPropiedad: (c.tipoPropiedad as TipoPropiedad) || '',
    periodoAlquiler: (c.periodoAlquiler as PeriodoAlquiler) || '',
    area: c.area != null ? String(c.area) : '',
    nroPiso: c.nroPiso != null ? String(c.nroPiso) : '',
    numDormitorios: c.numDormitorios != null ? String(c.numDormitorios) : '',
    numBanos: c.numBanos != null ? String(c.numBanos) : '',
    capacidadPersonas: c.capacidadPersonas != null ? String(c.capacidadPersonas) : '',
    tieneSala: c.tieneSala ?? false,
    tieneCocina: c.tieneCocina ?? false,
    amoblado: c.amoblado ?? false,
    gestionPorHabitacion: c.gestionPorHabitacion ?? false,
    latitud: c.latitud != null ? String(c.latitud) : '',
    longitud: c.longitud != null ? String(c.longitud) : '',
    serviciosIncluidos,
    serviciosAparte,
    montosServiciosAparte,
    reglas: c.reglas ?? [],
    estaDisponible: c.estaDisponible ?? true,
    disponibleDesde: c.disponibleDesde ?? '',
    videoUrl: c.videoUrl ?? '',
    politicaCancelacion: c.politicaCancelacion ?? 'FLEXIBLE',
  };
}

/** Arma el payload de `PUT /propiedades/{id}` a partir del `FormState` editado. */
export function formStateToUpdate(form: FormState, esInmuebleCompleto: boolean): PropiedadUpdate {
  const servicios: ServicioConEstado[] = [
    ...form.serviciosIncluidos.map((s) => ({ servicio: s, estado: 'INCLUIDO' as const })),
    ...form.serviciosAparte.map((s) => {
      const monto = parseFloat(form.montosServiciosAparte[s] ?? '');
      return {
        servicio: s,
        estado: 'APARTE' as const,
        monto: Number.isFinite(monto) && monto > 0 ? monto : undefined,
      };
    }),
  ];

  return {
    titulo: form.titulo.trim(),
    descripcion: form.descripcion.trim() || undefined,
    precio: parseFloat(form.precio),
    deposito: form.deposito !== '' ? parseFloat(form.deposito) : undefined,
    direccion: form.direccion.trim(),
    tipoPropiedad: form.tipoPropiedad || undefined,
    periodoAlquiler: form.periodoAlquiler || undefined,
    area: form.area !== '' ? parseFloat(form.area) : undefined,
    nroPiso: form.nroPiso !== '' ? parseInt(form.nroPiso, 10) : undefined,
    numDormitorios: form.numDormitorios !== '' ? parseInt(form.numDormitorios, 10) : undefined,
    numBanos: form.numBanos !== '' ? parseInt(form.numBanos, 10) : undefined,
    capacidadPersonas: form.capacidadPersonas !== '' ? parseInt(form.capacidadPersonas, 10) : undefined,
    tieneSala: esInmuebleCompleto ? form.tieneSala : undefined,
    tieneCocina: esInmuebleCompleto ? form.tieneCocina : undefined,
    amoblado: form.amoblado || undefined,
    gestionPorHabitacion: form.gestionPorHabitacion || undefined,
    latitud: form.latitud !== '' ? parseFloat(form.latitud) : undefined,
    longitud: form.longitud !== '' ? parseFloat(form.longitud) : undefined,
    serviciosIncluidos: form.serviciosIncluidos.length ? form.serviciosIncluidos : undefined,
    servicios: servicios.length ? servicios : undefined,
    reglas: form.reglas.length ? form.reglas : undefined,
    estaDisponible: form.estaDisponible,
    disponibleDesde: form.disponibleDesde || undefined,
    // "" limpia el video en el backend; omitir = no tocar. Como el form siempre trae un valor
    // (aunque sea ''), lo mandamos siempre para que borrar el campo también borre el video.
    videoUrl: form.videoUrl.trim(),
    politicaCancelacion: form.politicaCancelacion,
  };
}
