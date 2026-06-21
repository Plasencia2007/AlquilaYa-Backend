'use client';

import { Play } from 'lucide-react';
import { useState } from 'react';

import { cn } from '@/lib/cn';

interface ParsedVideo {
  kind: 'youtube' | 'vimeo' | 'file' | 'unknown';
  embedUrl?: string;
  fileUrl?: string;
  youtubeId?: string;
}

/** Detecta el proveedor del enlace y arma la URL embebible. Reflejo del validador del backend. */
function parseVideoUrl(raw: string): ParsedVideo {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { kind: 'unknown' };
  }
  const host = url.hostname.replace(/^www\./, '').toLowerCase();

  if (host === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0];
    if (id) return { kind: 'youtube', youtubeId: id, embedUrl: `https://www.youtube-nocookie.com/embed/${id}` };
  }
  if (host === 'youtube.com' || host === 'm.youtube.com') {
    const id =
      url.searchParams.get('v') ??
      (url.pathname.startsWith('/embed/') ? url.pathname.split('/')[2] : null);
    if (id) return { kind: 'youtube', youtubeId: id, embedUrl: `https://www.youtube-nocookie.com/embed/${id}` };
  }
  if (host === 'vimeo.com') {
    const id = url.pathname.split('/').filter(Boolean)[0];
    if (id && /^\d+$/.test(id)) return { kind: 'vimeo', embedUrl: `https://player.vimeo.com/video/${id}` };
  }
  if (host === 'player.vimeo.com') {
    return { kind: 'vimeo', embedUrl: raw };
  }
  if (/\.(mp4|webm|ogg)$/i.test(url.pathname)) {
    return { kind: 'file', fileUrl: raw };
  }
  return { kind: 'unknown' };
}

interface Props {
  url: string;
  titulo?: string;
  className?: string;
}

/**
 * Reproductor del video de una propiedad. YouTube/Vimeo se cargan en iframe SOLO al
 * hacer clic (facade) para no penalizar la carga de la ficha; los .mp4 directos usan
 * <video> nativo. Si el enlace no es reconocido, cae a un link "Ver video".
 */
export function PropertyVideo({ url, titulo, className }: Props) {
  const [activo, setActivo] = useState(false);
  const parsed = parseVideoUrl(url);

  if (parsed.kind === 'unknown') {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
      >
        <Play className="size-4" aria-hidden /> Ver video
      </a>
    );
  }

  if (parsed.kind === 'file') {
    return (
      <div className={cn('relative aspect-video w-full overflow-hidden rounded-2xl bg-black', className)}>
        <video
          src={parsed.fileUrl}
          controls
          playsInline
          preload="metadata"
          className="h-full w-full"
        />
      </div>
    );
  }

  const poster = parsed.youtubeId
    ? `https://i.ytimg.com/vi/${parsed.youtubeId}/hqdefault.jpg`
    : undefined;

  return (
    <div className={cn('relative aspect-video w-full overflow-hidden rounded-2xl bg-black', className)}>
      {activo ? (
        <iframe
          src={`${parsed.embedUrl}?autoplay=1`}
          title={titulo ?? 'Video de la propiedad'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setActivo(true)}
          aria-label="Reproducir video"
          className="group absolute inset-0 h-full w-full"
        >
          {poster && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={poster} alt="" className="h-full w-full object-cover" />
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/20">
            <span className="flex size-16 items-center justify-center rounded-full bg-white/90 text-primary shadow-lg transition-transform group-hover:scale-110">
              <Play className="size-7 translate-x-0.5 fill-current" aria-hidden />
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
