import { api } from '@/lib/api';

/** Pregunta pública de un estudiante sobre una propiedad, con la respuesta del arrendador si existe. */
export interface Pregunta {
  id: number;
  propiedadId: number;
  estudianteId: number;
  estudianteNombre: string;
  pregunta: string;
  respuesta?: string;
  fechaRespuesta?: string;
  fechaCreacion: string;
}

/** Forma que devuelve el backend (PreguntaPropiedadResponseDTO). */
interface PreguntaBackendDTO {
  id: number;
  propiedadId: number;
  estudianteId: number;
  estudianteNombre: string;
  pregunta: string;
  respuesta?: string | null;
  fechaRespuesta?: string | null;
  fechaCreacion: string;
}

function fromBackend(dto: PreguntaBackendDTO): Pregunta {
  return {
    id: dto.id,
    propiedadId: dto.propiedadId,
    estudianteId: dto.estudianteId,
    estudianteNombre: dto.estudianteNombre,
    pregunta: dto.pregunta,
    respuesta: dto.respuesta ?? undefined,
    fechaRespuesta: dto.fechaRespuesta ?? undefined,
    fechaCreacion: dto.fechaCreacion,
  };
}

export const preguntaService = {
  getPreguntas: async (propiedadId: string | number): Promise<Pregunta[]> => {
    const { data } = await api.get<PreguntaBackendDTO[]>(
      `/propiedades/${propiedadId}/preguntas`,
    );
    return data.map(fromBackend);
  },

  crearPregunta: async (propiedadId: string | number, texto: string): Promise<Pregunta> => {
    const { data } = await api.post<PreguntaBackendDTO>(
      `/propiedades/${propiedadId}/preguntas`,
      { pregunta: texto },
    );
    return fromBackend(data);
  },

  responderPregunta: async (
    propiedadId: string | number,
    preguntaId: number,
    respuesta: string,
  ): Promise<Pregunta> => {
    const { data } = await api.put<PreguntaBackendDTO>(
      `/propiedades/${propiedadId}/preguntas/${preguntaId}/respuesta`,
      { respuesta },
    );
    return fromBackend(data);
  },
};
