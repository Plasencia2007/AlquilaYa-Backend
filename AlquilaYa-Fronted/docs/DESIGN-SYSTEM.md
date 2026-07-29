# AlquilaYa — Design System

Fuente de verdad: [`src/app/globals.css`](../src/app/globals.css). Este documento explica el *por qué* de cada token y cuándo usar cada uno — para verlos en vivo, usa el catálogo de componentes (`npm run ladle`, ver [ítem 25](../../MEJORAS.md)).

## Paleta

### Tokens semánticos (cambian con el tema — úsalos para toda la UI)

| Token | Uso |
|---|---|
| `background` / `foreground` | Fondo y texto base de la página |
| `card` / `card-foreground` | Superficies elevadas (cards, modales) |
| `popover` / `popover-foreground` | Menús flotantes, tooltips |
| `primary` / `primary-foreground` | Marca — CTAs, links, acentos |
| `secondary` / `secondary-foreground` | Acento secundario (poco usado) |
| `muted` / `muted-foreground` | Fondos sutiles, texto secundario |
| `accent` / `accent-foreground` | Resaltes suaves |
| `destructive` / `destructive-foreground` | Errores, acciones irreversibles |
| `border` / `input` / `ring` | Bordes, campos de formulario, anillo de foco |
| `sidebar*` | Tokens dedicados para las sidebars de los 3 paneles |

### Semáforo (success / warning / info)

`success`, `warning`, `info` — cada uno con su `-foreground` (texto legible sobre el color sólido, correcto en ambos temas) y su `-light` (fondo sutil para chips/banners). **Nunca** uses `green-*`, `amber-*`, `red-*` de Tailwind directamente — no se adaptan a dark mode y no siguen la paleta de marca.

```
✅ bg-success-light text-success        ❌ bg-green-100 text-green-700
✅ text-warning                         ❌ text-amber-600
✅ bg-destructive/10 text-destructive   ❌ bg-red-50 text-red-700
```

### Paleta fija (no cambia con el tema)

Para elementos que viven **siempre** sobre una foto oscura o una tarjeta siempre-clara (el hero del home, por ejemplo) — donde un token que se invierte en dark mode se vería mal:

- `brand-{50,100,200,400,500,600,700,800,900,950}` — la escala roja/borgoña de marca.
- `cream-{50,100,200,300,400,500,600,700,900}` — la escala crema de marca.

### Acento "flash" (instantáneo/digital)

`flash` / `flash-foreground` — violeta reservado para features de verificación automática (RENIEC/SUNAT instantánea) y el banner promocional del dashboard. Es el ÚNICO lugar donde se usa un color fuera de la paleta roja/crema — a propósito, para que destaque como "esto es distinto/especial". No lo reutilices para algo que no sea ese tipo de feature destacada.

## Tipografía

6 niveles definidos como utilidades (`@layer utilities` en globals.css), codificados a partir del patrón que ya predominaba en el código real:

| Clase | Uso | Especificación |
|---|---|---|
| `.text-display` | Hero / momento de máximo impacto (uso puntual) | Manrope, 5xl→6xl→[5.5rem], extrabold |
| `.text-h1` | Título de página | Manrope, 3xl→4xl, extrabold, tracking-tight |
| `.text-h2` | Título de sección dentro de una página | Manrope, xl, bold |
| `.text-h3` | Título de subsección / card | Inter, lg, bold |
| `.text-h4` | Eyebrow / etiqueta en mayúsculas | Inter, xs, bold, uppercase, tracking-wider |
| `.text-body` / `.text-caption` | Cuerpo / metadatos | `text-sm` y `text-xs` ya son el estándar de facto — estos son alias documentales |

Familias: `font-sans` (Inter) para cuerpo, `font-headline` (Manrope) para h1/h2/h3/h4/`.brand-logo` (aplicado automáticamente a las etiquetas `<h1>`-`<h4>` vía `@layer base`).

## Espaciado

Escala 4/8pt nativa de Tailwind, sin tokens nuevos:

- Padding de card → `p-6` (24px)
- Padding vertical de sección de página → `py-16` (64px), `py-12` en vistas densas (dashboards)
- Gap de grid de cards → `gap-6` (24px), `gap-4` en listas compactas

El código heredado usa `p-5`/`p-4`/`gap-4` con más frecuencia — es la variación real que existe hoy. Usa los valores de arriba en código nuevo.

## Elevación (sombras)

3 niveles, con tinte cálido (ink de marca, no negro puro) y más sutiles en dark mode:

| Clase | Uso |
|---|---|
| `shadow-card` | Cards en reposo (`PropertyCard`, `ui/card.tsx`) |
| `shadow-popover` | Menús flotantes, dropdowns, tooltips, selects |
| `shadow-overlay` | Dialogs, sheets, alert-dialogs — la superficie modal más grande |

En dark mode los 3 niveles bajan de opacidad porque una sombra negra encima de un fondo ya oscuro aporta poco — la separación visual la da el `border` que ya acompaña a la mayoría de las cards.

## Radio de borde

- Chips / badges / pills → `rounded-full`
- Inputs y botones → `rounded-md` / `rounded-lg` (siguen la escala de `--radius`)
- Cards → `rounded-xl` (16px)

**Nota:** con `--radius: 0.75rem`, `rounded-xl` (este token) y el `rounded-2xl` nativo de Tailwind dan hoy el mismo valor visual — son intercambiables *ahora mismo*, pero solo `rounded-xl` sigue la escala si `--radius` cambia algún día. Usa `rounded-xl` en código nuevo.

## Anillo de foco

Todo interactivo debe mostrar foco de teclado. Los componentes `ui/*` (shadcn) ya lo resuelven con `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`. Para elementos nativos sueltos (`<button>`, `<a>`, `[role="button"]`) hay una regla de respaldo global en `@layer base` de `globals.css` — no necesitas añadir la utilidad a mano salvo que quieras un estilo de foco distinto al de respaldo.

## Estados hover en cards

- **Card clickeable** (toda ella es un `<Link>`/botón): `transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-popover`.
- **Card informativa** (sin acción propia, como `RoommateCard`): sin hover. Un hover sin acción detrás confunde — no lo añadas "por consistencia visual".
- **Card con múltiples sub-acciones** (como `ReservationCard`, que tiene su propio link de imagen + botones): sin hover en el contenedor; cada sub-elemento interactivo lleva su propio estado hover.

## Do / Don't

| ✅ Hacer | ❌ Evitar |
|---|---|
| `bg-success-light text-success` para un estado positivo | `bg-green-100 text-green-700` |
| `bg-card` / `bg-background` para superficies que deben adaptarse al tema | `bg-white` hardcodeado |
| `shadow-card` en una card nueva | `shadow-sm` / `shadow-md` genéricos de Tailwind |
| `.text-h1` en el título principal de una página nueva | Combinar `text-3xl font-extrabold tracking-tight` a mano cada vez |
| Reusar `PasswordInput`, `Progress`, `CenteredSpinner`, `SuccessScreen`, `PaymentResult` (`components/ui`/`components/shared`) | Copiar-pegar el mismo bloque de JSX en una página nueva |
| Preguntarte si un color realmente necesita ser fijo (`brand-*`/`cream-*`) antes de usarlo | Usar `brand-*`/`cream-*` por defecto — son la excepción, no la regla |

## Organización de `src/components/` (#75)

Tres carpetas, un criterio por dónde vive un componente:

| Carpeta | Contenido |
|---|---|
| `ui/` | Primitivos (shadcn y similares): `Button`, `Kbd`, `CopyButton`, `Tooltip`. Sin lógica de dominio — no saben qué es una "propiedad" o una "reserva". |
| `shared/` | Compuestos multi-rol: usados por 2+ de `student/landlord/admin` (o público + privado), como `ReputationBadge`, `CenteredSpinner`, `PageBreadcrumb`, `CommandPalette`. |
| `{rol}/` (`student/`, `landlord/`, `admin/`) | Específicos de un solo rol/panel: `RoommateCard` (student), `ReservationCard` (landlord). |

Nombre de archivo: **kebab-case** siempre (`reputation-badge.tsx`, no `ReputationBadge.tsx`), incluso cuando el componente exportado es PascalCase — es la convención ya dominante en `ui/` y `shared/`. No sueltes componentes directo en la raíz de `components/`; si no encaja en `{rol}/`, va en `shared/` (multi-rol) o `ui/` (primitivo sin dominio).

> Existen ~20 archivos heredados en `admin/` y `landlord/` con nombre PascalCase (p. ej. `StatusBadge.tsx`, `ReservationCard.tsx`, `IngresosChart.tsx`) y algunos sueltos en `shared/` (`Footer.tsx`, `MapPicker.tsx`). Renombrarlos es un batch aparte (muchos imports cada uno) — no se tocan como parte de este ítem.

## Deuda conocida (fuera de este documento)

- El kit `components/ui/legacy-*` (usado en landlord/admin) coexiste con los componentes shadcn — ya lee tokens correctamente mapeados, pero sigue siendo un segundo sistema paralelo pendiente de retirar (ver ítem 41 de `MEJORAS.md`).
- El panel de landlord/admin tiene su propia paleta (`#8f0304`, `#c14b4c` hardcodeados) sin token dedicado todavía — ítems 301-304 y 372-373 de `MEJORAS.md`.
