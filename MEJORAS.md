# AlquilaYa — 500 Mejoras de Frontend (y hallazgos de Backend)

> Documento generado a partir de un análisis exhaustivo del código real del proyecto (frontend Next.js 16 + 6 microservicios Spring Boot). Cada mejora tiene **título**, **contexto** (qué pasa hoy en el código, con archivos concretos) y **solución** (qué hacer, con librería sugerida cuando aplica).
>
> Objetivo: que el producto se sienta hecho a mano, con profundidad — no un CRUD genérico.

## Índice

| Sección | Ítems | Área |
|---|---|---|
| 1 | 1–40 | Fundamentos de diseño y sistema visual |
| 2 | 41–75 | Componentes compartidos y UI kit |
| 3 | 76–105 | Home / landing pública |
| 4 | 106–140 | Búsqueda y exploración |
| 5 | 141–170 | Detalle de propiedad |
| 6 | 171–200 | Autenticación, registro y onboarding |
| 7 | 201–250 | Panel del estudiante |
| 8 | 251–270 | Mensajería y chat |
| 9 | 271–300 | Reservas y pagos (UX) |
| 10 | 301–350 | Panel del arrendador |
| 11 | 351–390 | Panel del admin |
| 12 | 391–415 | Accesibilidad |
| 13 | 416–440 | Rendimiento frontend |
| 14 | 441–460 | SEO, PWA y metadatos |
| 15 | 461–480 | Calidad de código frontend y DX |
| 16 | 481–500 | Backend — detectado durante el análisis |

**Librerías nuevas sugeridas a lo largo del documento:** `motion` (framer-motion), `@tanstack/react-table`, `@tanstack/react-query`, `@tanstack/react-virtual`, `embla-carousel-react`, `@dnd-kit/core`, `react-dropzone`, `input-otp`, `cmdk`, `yet-another-react-lightbox`, `leaflet.markercluster`, `recharts` (ya instalada, subutilizada), `@sentry/nextjs`, `vitest` + `@testing-library/react`, `@playwright/test`, `ua-parser-js`, `openapi-typescript`, `@axe-core/react`, `linkify-react`, `react-pdf`.

---

## Sección 1 · Fundamentos de diseño y sistema visual (1–40)

**1. Unificar el sistema de color a tokens semánticos**
- *Contexto:* conviven 3 enfoques: tokens (`text-primary`, `bg-card`) en search/favorites, colores crudos Tailwind (`red-700`, `stone-400`, `green-50`) en home/detalle/grupos, y CSS vars (`text-[var(--color-success)]`) — a veces los tres en el mismo archivo.
- *Solución:* barrido único que reemplace todo color crudo por su token (`red-700→primary`, `stone→muted-foreground`, `green→success`), y regla ESLint (`eslint-plugin-tailwindcss` con `no-arbitrary-value` configurado) para impedir regresiones.

**2. Erradicar el hex literal `#8f0304`**
- *Contexto:* `components/auth/verification-panel.tsx` usa el hex crudo en vez del token `--primary`.
- *Solución:* reemplazar por `text-primary`/`bg-primary` y hacer grep de otros hex literales (`#[0-9a-f]{6}`) en `src/`.

**3. Reemplazar `bg-white` hardcodeado por tokens**
- *Contexto:* `register-page-client.tsx` y `dashboard-shell.tsx` usan `bg-white dark:bg-background`, rompiendo el mapeo automático light/dark.
- *Solución:* usar `bg-background` o `bg-card` — ya resuelven ambos modos sin `dark:`.

**4. Decidir el destino de los gradientes violet/pink del dashboard**
- *Contexto:* el dashboard estudiante usa `from-primary via-violet-500 to-pink-500`, colores fuera de la paleta borgoña/crema de la marca.
- *Solución:* o se eliminan, o se promueven a tokens oficiales de acento (`--accent-2`, `--accent-3`) en `globals.css` para que el degradado sea parte del sistema, no una excepción.

**5. Escala tipográfica formal documentada**
- *Contexto:* hay Inter + Manrope configuradas, pero los tamaños de título varían por página sin patrón (text-2xl/3xl/4xl ad-hoc).
- *Solución:* definir 6 niveles (`display`, `h1`–`h4`, `body`, `caption`) como utilidades en `@theme` de globals.css y usarlas en todas las páginas.

**6. Auditar contraste del texto sobre imágenes del hero**
- *Contexto:* el home confía en gradientes `bg-black/75` para legibilidad; el comentario dice "WCAG AA" pero no está verificado.
- *Solución:* verificar con el contrast checker (texto ≥4.5:1) y subir la opacidad del scrim o añadir `text-shadow` si falla.

**7. Migrar animaciones legacy a tailwindcss-animate**
- *Contexto:* `globals.css` mantiene `fadeIn/slideDown/slideLeft/scaleIn/slideInRight` marcadas como deuda ("a migrar").
- *Solución:* reemplazar usos por `animate-in fade-in slide-in-from-*` (la librería ya está instalada) y borrar los keyframes muertos.

**8. Escala de elevación/sombra tematizada**
- *Contexto:* existe una sola `.editorial-shadow` custom; el resto usa `shadow-sm/md` de Tailwind sin criterio.
- *Solución:* definir 3 niveles de sombra como tokens (`--shadow-card`, `--shadow-overlay`, `--shadow-popover`) que cambien en dark mode (sombras más sutiles + borde).

**9. Tokens de radio de borde coherentes**
- *Contexto:* mezcla de `rounded-lg`, `rounded-xl`, `rounded-2xl` y `rounded-full` sin patrón entre cards similares.
- *Solución:* estandarizar: cards `rounded-xl`, inputs/botones `rounded-lg`, chips `rounded-full` — y documentarlo en el design system.

**10. Auditoría dark mode de los componentes legacy**
- *Contexto:* el UI kit `legacy-*` (usado en landlord/admin) tiene variantes `dark|white` propias que no leen los tokens `data-theme`.
- *Solución:* al migrar a shadcn (ítem 41) verificar cada pantalla landlord/admin en dark mode; mientras tanto mapear las variantes legacy a tokens.

**11. Sistema de espaciado 4/8pt**
- *Contexto:* paddings y gaps inconsistentes entre secciones (`p-4`, `p-5`, `p-6` en cards equivalentes).
- *Solución:* convención: cards `p-6`, secciones `py-16`, gaps de grid `gap-6` — documentada y aplicada en el barrido de la sección.

**12. Anillo de foco consistente**
- *Contexto:* los shadcn traen `focus-visible:ring` pero los legacy y varios botones custom no muestran foco.
- *Solución:* utilidad global `focus-visible:ring-2 ring-ring ring-offset-2` en todos los interactivos; verificar tabulando cada página.

**13. Estados hover consistentes en cards**
- *Contexto:* `PropertyCard` tiene hover con sombra, pero cards de grupo, roommate y stat no reaccionan igual (algunas nada).
- *Solución:* patrón único: `transition-shadow hover:shadow-lg` + `hover:border-primary/30` en toda card clickeable, nada en cards informativas.

**14. Un solo componente `PasswordInput`**
- *Contexto:* hay 3 implementaciones distintas del input con ojo: `reset-password/page.tsx`, el diálogo de `personal-tab.tsx` y el `PasswordInput` local de `security-tab.tsx` (solo este tiene `aria-label`).
- *Solución:* extraer `components/ui/password-input.tsx` (con toggle accesible y soporte RHF) y usarlo en las 3 superficies + el modal de auth.

**15. Componente `ProgressBar` compartido**
- *Contexto:* la barra `h-2 rounded-full bg-muted` + inner `bg-primary` está copiada en `convivencia-tab.tsx` y dos veces en `groups/[id]/page.tsx`.
- *Solución:* crear `components/ui/progress.tsx` (shadcn tiene uno sobre `@radix-ui/react-progress`) con `aria-valuenow`.

**16. `CenteredSpinner` y `FullScreenLoader` compartidos**
- *Contexto:* el spinner centrado (`Loader2 animate-spin`) está duplicado en roommates, groups, groups/[id] y favorites público; el full-screen (`border-4 border-primary/20 border-t-primary`) en home y student layout.
- *Solución:* dos componentes en `components/shared/` y reemplazo global.

**17. Extraer `<PaymentResult />`**
- *Contexto:* `pago/exito`, `pago/fallo` y `pago/pendiente` son casi idénticas (icono + título + texto + botón).
- *Solución:* un componente `variant="exito"|"fallo"|"pendiente"` con icono, colores por token y CTA configurables; las 3 páginas quedan de ~10 líneas.

**18. Extraer `<SuccessScreen />`**
- *Contexto:* reset-password y verify-email repiten la pantalla de éxito (círculo `bg-primary/10` + `CheckCircle2` + título + botón).
- *Solución:* componente compartido con props `title`, `description`, `action`.

**19. Una sola familia de iconos**
- *Contexto:* conviven lucide-react (mayoría), Material Symbols (cargados por `<link>`) y nombres FontAwesome guardados en el catálogo de banners.
- *Solución:* estandarizar en lucide; guardar en el catálogo el nombre del icono lucide y renderizar con un `DynamicIcon` (lucide tiene `dynamicIconImports`).

**20. Eliminar el mapa `FA_TO_MATERIAL` del dashboard**
- *Contexto:* `student/page.tsx` embebe un diccionario de 35 entradas FontAwesome→Material para renderizar banners.
- *Solución:* consecuencia del ítem 19: normalizar el dato en el catálogo (backend) y borrar el mapa; mientras tanto moverlo a `lib/icons.ts`.

**21. Quitar la `<link>` bloqueante de Google Fonts**
- *Contexto:* `app/layout.tsx` carga Material Symbols vía `<link>` sin `preconnect`, fuera de `next/font` (render-blocking).
- *Solución:* si se mantienen los símbolos, cargarlos con `next/font` o subset local (`material-symbols` npm); si no, eliminarlos tras el ítem 19.

**22. `metadataBase` + Open Graph por defecto**
- *Contexto:* solo el detalle de propiedad genera OG; el root layout no define `metadataBase` ni imagen OG por defecto — compartir cualquier otra URL se ve sin preview.
- *Solución:* en `app/layout.tsx` añadir `metadataBase`, `openGraph` default (logo + claim) y `twitter.card`.

**23. Aplicar los tokens semáforo en todo el código**
- *Contexto:* `--color-success/-warning/-info` existen en globals.css pero páginas como el detalle usan `text-green-700`/`text-amber-600` crudos.
- *Solución:* exponerlos como utilidades Tailwind v4 (`@theme` → `text-success` etc.) para que sean tan cómodos como los crudos, y migrar.

**24. Documentar el design system**
- *Contexto:* el sistema de tokens es bueno pero vive solo en `globals.css`; cada dev inventa su versión.
- *Solución:* `docs/DESIGN-SYSTEM.md` con paleta, tipografía, espaciado, elevación, do/don't con capturas — o mejor, ítem 25.

**25. Catálogo vivo de componentes (Storybook o Ladle)**
- *Contexto:* con dos UI kits y ~40 componentes compartidos no hay dónde verlos todos juntos ni probar dark mode aislado.
- *Solución:* instalar **Ladle** (más liviano que Storybook, hecho para Vite) con stories de los `ui/*` y `shared/*`; toggle de tema incluido.

**26. Toggle de tema de 3 estados**
- *Contexto:* `theme-store` soporta `light|dark|system` pero `theme-toggle.tsx` solo alterna Sun/Moon (el modo `system` queda inaccesible desde la UI).
- *Solución:* dropdown con las 3 opciones (Sol/Luna/Monitor) usando el `DropdownMenu` de Radix ya instalado.

**27. Tematizar el autofill de inputs**
- *Contexto:* el amarillo webkit del autofill rompe la estética en dark mode (inputs del login/registro).
- *Solución:* CSS `input:-webkit-autofill { -webkit-box-shadow: 0 0 0 1000px var(--color-input) inset; -webkit-text-fill-color: var(--color-foreground) }` en globals.css.

**28. Set de favicons e iconos completo**
- *Contexto:* solo hay `favicon.ico`; faltan `apple-touch-icon`, iconos 192/512 y variante maskable para PWA.
- *Solución:* generar el set (RealFaviconGenerator o `app/icon.tsx` de Next) y referenciarlo en `manifest` + metadata.

**29. Ilustraciones propias en los empty states**
- *Contexto:* `EmptyState` usa solo iconos lucide — funcional pero genérico.
- *Solución:* set de 6–8 ilustraciones SVG con la paleta borgoña (estilo unDraw personalizado con `--primary`) para favoritos vacíos, sin mensajes, sin reservas, sin resultados, error, y sin conexión.

**30. Skeletons consistentes con `ui/skeleton`**
- *Contexto:* conviven `SkeletonCard`, pulsos ad-hoc (home) y spinners donde debería haber skeleton (roommates, groups).
- *Solución:* todo estado de carga de contenido usa skeleton con la forma real del contenido; spinner solo para acciones puntuales (botones).

**31. Grid responsivo estandarizado para cards**
- *Contexto:* los grids de cards varían (`sm:grid-cols-2 lg:grid-cols-3` vs `md:grid-cols-2 xl:grid-cols-4`) entre páginas equivalentes.
- *Solución:* clase utilitaria `.card-grid` (o componente `CardGrid`) con breakpoints únicos: 1 / 2 (sm) / 3 (lg) / 4 (2xl).

**32. Container queries para `PropertyCard`**
- *Contexto:* la card se usa en contextos de ancho muy distinto (grid 4-col, carrusel, sidebar de similares) y se adapta por viewport, no por contenedor.
- *Solución:* Tailwind v4 trae `@container` nativo: hacer la card container-aware (`@sm:flex-row`) y eliminar las variantes `compact/full` manuales donde sea posible.

**33. Cifras con `tabular-nums`**
- *Contexto:* precios y contadores (S/ 450, stats) bailan al cambiar dígitos porque Inter es proporcional.
- *Solución:* utilidad `.tnum { font-variant-numeric: tabular-nums }` en precios, stats, contadores y tablas de finanzas.

**34. Formato de moneda centralizado**
- *Contexto:* cada componente concatena `S/ ${precio}` a mano, con inconsistencias de decimales.
- *Solución:* `lib/money.ts` con `formatPEN(monto)` usando `Intl.NumberFormat('es-PE', { style:'currency', currency:'PEN' })`; migrar todos los usos.

**35. Formato de fechas centralizado**
- *Contexto:* `relative-time.ts` existe, pero fechas absolutas se formatean ad-hoc en reservas, chat y tablas.
- *Solución:* `lib/dates.ts` con `formatFecha`, `formatFechaHora`, `formatRango` sobre date-fns/locale es — un solo estilo de fecha en toda la app.

**36. Motion system con `motion` (framer-motion)**
- *Contexto:* no hay animaciones de entrada/transición más allá de `tailwindcss-animate`; el producto se siente estático comparado con Airbnb/Urbania.
- *Solución:* instalar `motion`, crear `components/motion/` con `FadeIn`, `Stagger`, `SlideUp` reutilizables y aplicarlos en home, grids de resultados y dashboards.

**37. View Transitions entre rutas**
- *Contexto:* Next 16 soporta la View Transitions API; hoy los cambios de ruta son cortes secos.
- *Solución:* habilitar `experimental.viewTransition` y animar la transición card→detalle (la imagen de la propiedad "viaja" al hero del detalle).

**38. Respetar `prefers-reduced-motion`**
- *Contexto:* las animaciones existentes (y las nuevas de los ítems 36–37) no consultan la preferencia del usuario.
- *Solución:* variante `motion-reduce:` de Tailwind en animaciones decorativas y `useReducedMotion()` de motion para deshabilitar stagger/parallax.

**39. Curvas de easing propias**
- *Contexto:* todo usa los easings default de Tailwind; los productos pulidos tienen curvas características.
- *Solución:* tokens `--ease-out-expo: cubic-bezier(0.16,1,0.3,1)` y `--ease-spring` en `@theme`, usados por hovers, modales y acordeones.

**40. Logo como SVG con variantes**
- *Contexto:* `layout/logo.tsx` existe pero sin variantes para dark mode ni tamaño reducido (bottom nav / favicon).
- *Solución:* SVG con `currentColor` para heredar tema + variante isotipo (solo símbolo) para espacios pequeños.

---

## Sección 2 · Componentes compartidos y UI kit (41–75)

**41. Eliminar el UI kit legacy completo**
- *Contexto:* `ui/legacy-button.tsx`, `legacy-card.tsx`, `legacy-badge.tsx`, `legacy-input.tsx` conviven con los shadcn equivalentes — dos `Button`, dos `Card`, dos `Badge`, dos `Input` con APIs incompatibles, usados en 24+ archivos de landlord/admin.
- *Solución:* migración planificada por pantalla (empezar por las tablas admin) hacia los shadcn; al terminar, borrar los `legacy-*` y bloquear su import con regla ESLint `no-restricted-imports`.

**42. Eliminar `ui/modal.tsx` custom**
- *Contexto:* reinventa Radix Dialog con `createPortal`, Esc y scroll-lock manuales; solo lo usan `landlord/properties/active/page.tsx` y `edit-property-modal.tsx`.
- *Solución:* migrar esos 2 usos a `ui/dialog.tsx` (Radix, ya instalado) y borrar el archivo.

**43. Arreglar la clase muerta `bg-surface`**
- *Contexto:* `ui/modal.tsx` renderiza `bg-surface`, un token que NO existe en globals.css — el modal queda transparente en algunos contextos.
- *Solución:* mientras se ejecuta el ítem 42, cambiar a `bg-card`; añadir chequeo de clases inexistentes (el build de Tailwind v4 puede reportarlas).

**44. Un solo `StatCard` con variantes**
- *Contexto:* existen `student/stat-card.tsx`, `landlord/stat-card.tsx` y `admin/StatsCard.tsx` — tres implementaciones del mismo concepto.
- *Solución:* `components/shared/stat-card.tsx` con props `icon`, `label`, `value`, `delta` (tendencia ±%), `href` opcional, y skeleton integrado; borrar las tres copias.

**45. Unificar las dos `PropertyCard`**
- *Contexto:* `student/property-card.tsx` (pública/estudiante) y `landlord/property-card.tsx` (gestión) duplican estructura de imagen+precio+badges.
- *Solución:* una base común (`PropertyCardBase` con slots) y dos composiciones finas encima; o al menos compartir subcomponentes (imagen con fallback, fila de precio, badges).

**46. Completar el set shadcn que falta**
- *Contexto:* faltan piezas que las pantallas ya necesitan: `pagination`, `breadcrumb`, `command`, `calendar`, `combobox`, `accordion`, `collapsible`, `hover-card`, `progress`, `toggle-group`, `carousel`.
- *Solución:* `npx shadcn@latest add` de cada una según se vayan usando en los ítems siguientes (no instalar en bloque sin uso).

**47. `DataTable` genérico con TanStack Table**
- *Contexto:* las tablas admin/landlord (`UserDirectoryTable`, `CarrerasTable`, `CatalogosTable`…) implementan render, filtros y acciones a mano, sin ordenamiento ni paginación uniforme.
- *Solución:* instalar `@tanstack/react-table` y crear `components/ui/data-table.tsx` (patrón oficial shadcn) con sorting, filtro global, paginación, selección de filas y columnas ocultables; migrar todas las tablas.

**48. `Combobox` con búsqueda para selects largos**
- *Contexto:* carreras (decenas), universidades y zonas usan `Select` plano — encontrar una opción es incómodo.
- *Solución:* combobox shadcn (Popover + Command con `cmdk`) con búsqueda y estado vacío; usarlo en academic-tab, filtros y formularios admin.

**49. Command palette global (Ctrl+K)**
- *Contexto:* la navegación entre paneles (sobre todo admin, con muchas secciones) es solo por sidebar.
- *Solución:* `cmdk` con acciones por rol: buscar propiedad, ir a sección, acciones rápidas ("aprobar pendientes"). Diferenciador de producto notable con poco esfuerzo.

**50. Breadcrumbs en páginas anidadas**
- *Contexto:* detalle de propiedad, grupo, conversación y subpáginas admin no muestran dónde estás ni ofrecen vuelta jerárquica.
- *Solución:* componente `Breadcrumb` shadcn alimentado por un mapa de rutas; incluir JSON-LD `BreadcrumbList` (ver ítem 460).

**51. Adoptar `EmptyState` compartido en roommates y groups**
- *Contexto:* `student/roommates/page.tsx` y `groups/page.tsx` reimplementan el empty state inline (dashed border) en vez de usar `components/shared/empty-state.tsx`.
- *Solución:* reemplazar por el compartido con icono/ilustración y CTA ("completa tu perfil de convivencia").

**52. `ErrorState` con retry estándar**
- *Contexto:* `error-state.tsx` existe pero varias páginas fallan en silencio o solo con toast (roommates, groups, notifications, history).
- *Solución:* patrón único: toda carga fallida de página renderiza `ErrorState` con `onRetry`; el toast queda solo para acciones puntuales.

**53. Desduplicar la navbar de búsqueda**
- *Contexto:* `search-client.tsx` implementa una navbar completa propia (logo, links, auth, UserMenu) porque la global se oculta en `/search` — duplica la lógica de `TopBar`/`UserMenu`.
- *Solución:* extraer las piezas (logo+links, bloque auth) como componentes compartidos que consuman tanto `Navbar` como la barra de búsqueda.

**54. `Avatar` único con next/image + iniciales**
- *Contexto:* hay `<img>` planos (detalle, profile hero, personal-tab), `avatar-initial.tsx`, y `lib/avatar.ts` (color determinista) — tres piezas sin ensamblar.
- *Solución:* `components/ui/user-avatar.tsx`: recibe `src` y `nombre`; usa next/image con `esImagenExterna` para `unoptimized`, y cae a iniciales con color determinista; reemplazar todos los avatares.

**55. Badge de estado de reserva unificado**
- *Contexto:* `lib/reservation-status.ts` ya centraliza meta (label, color, timeline) pero cada superficie pinta su propio badge.
- *Solución:* `<ReservationStatusBadge estado={...} />` que lea esa meta — un solo lugar para colores de estado en estudiante, arrendador y admin.

**56. `NumberInput` de moneda**
- *Contexto:* precios en formularios (publicar propiedad, temporadas) usan `<Input type="number">` sin formato ni prefijo S/.
- *Solución:* input con prefijo S/, separador de miles al blur y valor numérico limpio en el form (composición sobre `Input`, o `react-number-format`).

**57. Componente `Rating` (estrellas) único**
- *Contexto:* las estrellas se pintan ad-hoc (`fill-yellow-500` en el detalle) y el form de reseña tiene el suyo propio.
- *Solución:* `components/ui/rating.tsx` con modo `readonly` (media con fracción) e `interactive` (RHF-compatible, teclas ←→), color por token `--color-warning`.

**58. `ImageUploader` unificado con drag & drop**
- *Contexto:* la subida de imágenes (propiedades, avatar, documentos KYC) tiene UX distinta en cada lugar y sin arrastrar-soltar ni reordenamiento visual.
- *Solución:* instalar `react-dropzone` + `@dnd-kit/sortable`: dropzone con previews, barra de progreso por archivo, reordenar arrastrando (el backend ya tiene `PATCH /imagenes/reordenar`), y validación de peso/tipo con Zod (`document-schema.ts` como referencia).

**59. Unificar estilos del `PhoneInput`**
- *Contexto:* `react-phone-number-input` se estila vía `.alquilaya-phone-input` en globals.css con valores propios, desalineado del `Input` shadcn.
- *Solución:* mapear esas reglas a los tokens (`--color-input`, `--radius`) para que sea indistinguible de los demás inputs.

**60. `DatePicker`/`DateRangePicker` estándar**
- *Contexto:* `react-day-picker` ya se usa en reservas/quick-view pero sin wrapper común (estilos y locale repetidos).
- *Solución:* `components/ui/calendar.tsx` (shadcn) + `DateRangePicker` con presets ("Este mes", "Próximo ciclo") y locale es fijado una vez.

**61. Tooltips en todos los botones icon-only**
- *Contexto:* botones de solo icono (compartir, favorito, denunciar, acciones de tabla) no explican qué hacen.
- *Solución:* envolver con `ui/tooltip.tsx` (ya instalado); regla de equipo: icon-button ⇒ tooltip + aria-label.

**62. `notify.promise` para acciones largas**
- *Contexto:* `lib/notify.ts` ya expone `promise` pero casi todo usa success/error manual — acciones como publicar propiedad no muestran progreso.
- *Solución:* adoptar `notify.promise(fn(), { loading, success, error })` en publicar, subir imágenes, aprobar/rechazar y pagos.

**63. Migrar `ConfirmActionModal` legacy a AlertDialog**
- *Contexto:* `components/admin/ConfirmActionModal` (legacy kit) duplica lo que `ui/alert-dialog.tsx` ya resuelve con accesibilidad Radix.
- *Solución:* API única `useConfirm()` (hook + AlertDialog) para todas las confirmaciones destructivas de admin/landlord.

**64. Documentar el patrón Sheet para filtros móviles**
- *Contexto:* `filters-sheet.tsx` funciona bien, pero es el único uso de Sheet — otros paneles móviles (notificaciones, quick view) lo resuelven distinto.
- *Solución:* establecer Sheet como el patrón de panel móvil y aplicarlo a la campana de notificaciones y al quick view.

**65. Hook `useTabParam` para tabs sincronizadas con URL**
- *Contexto:* el perfil sincroniza tabs con `?tab=` ad-hoc; otras pantallas con tabs (reservas por estado) no persisten en URL.
- *Solución:* extraer `hooks/use-tab-param.ts` sobre `use-search-params-state` (ya existe) y usarlo en perfil, reservas y admin.

**66. Aplicar `use-infinite-scroll` donde falta**
- *Contexto:* el hook existe y se usa en búsqueda, pero mensajes, notificaciones y listas admin cargan todo o solo la primera página.
- *Solución:* infinite scroll en notificaciones (backend ya pagina) y mensajes hacia arriba (ítem 253).

**67. `CopyButton` compartido**
- *Contexto:* copiar link de invitación de grupo y compartir propiedad implementan clipboard + feedback cada uno por su lado.
- *Solución:* `components/ui/copy-button.tsx` con icono Check animado 2s y fallback a `document.execCommand` para contextos no-secure.

**68. `StatusDot` semáforo con tokens**
- *Contexto:* estados online/verificado/disponible se pintan con puntos de colores crudos en varios lugares.
- *Solución:* mini componente `<StatusDot status="success|warning|error|neutral" pulse?>` usando los tokens semáforo.

**69. `Timeline` visual de estados**
- *Contexto:* `lib/reservation-status.ts` ya calcula el timeline de una reserva pero no hay componente que lo dibuje.
- *Solución:* `components/shared/timeline.tsx` (pasos con check/actual/pendiente) usable en detalle de reserva, verificación KYC y estado de depósito.

**70. `Stepper` accesible reutilizable**
- *Contexto:* `CenteredStepper` del registro es puramente visual (sin `aria-current`) y el flujo de publicar propiedad necesitará otro.
- *Solución:* stepper único con `role="list"`, `aria-current="step"`, estados done/current/next, orientación horizontal/vertical.

**71. Wrapper `FormField` RHF+Zod consistente**
- *Contexto:* `ui/form.tsx` (shadcn) existe pero muchos formularios montan label+input+error a mano con estilos distintos.
- *Solución:* usar siempre `FormField/FormItem/FormMessage` de shadcn; los errores del backend (`validationErrors` de `api-errors.ts`) se inyectan con `setError` (ítem 190).

**72. Componente `Kbd` para atajos**
- *Contexto:* con el command palette (ítem 49) y atajos futuros, no hay forma visual de mostrar teclas.
- *Solución:* `<Kbd>⌘K</Kbd>` minimal con borde y `bg-muted` — detalle de pulido que comunica producto serio.

**73. Componente `Money`**
- *Contexto:* complemento de los ítems 33–34: precios grandes (hero de detalle, finanzas) requieren jerarquía (S/ pequeño, monto grande, período en muted).
- *Solución:* `<Money value={450} period="mes" size="lg" />` que combine `formatPEN` + `tabular-nums` + estilos por tamaño.

**74. Variantes de tamaño para `ReputationBadge`**
- *Contexto:* `components/reputation-badge.tsx` (suelto en la raíz) tiene un solo tamaño; se necesita en cards (mini) y perfil (grande).
- *Solución:* moverlo a `components/shared/`, props `size="sm|md|lg"` y tooltip explicando cómo se calcula el nivel.

**75. Convención de imports para componentes**
- *Contexto:* hay componentes en la raíz de `components/` (`reputation-badge`), en carpetas por dominio y en `ui/` — sin criterio documentado ni consistencia PascalCase/kebab-case en archivos admin (`StatsCard.tsx` vs `stat-card.tsx`).
- *Solución:* documentar la regla (ui = primitivos, shared = compuestos multi-rol, {rol}/ = específicos), renombrar a kebab-case uniforme y mover los sueltos.

---

## Sección 3 · Home / landing pública (76–105)

**76. Reemplazar las imágenes Unsplash hardcodeadas**
- *Contexto:* el hero y el banner CTA de `(public)/page.tsx` usan URLs de `images.unsplash.com` fijas en el código — se nota stock genérico y depende de un tercero.
- *Solución:* fotos propias (o de propiedades reales con permiso) servidas desde Cloudinary con transformaciones `f_auto,q_auto`; idealmente gestionables desde el catálogo BANNER.

**77. Botón "Gestión central" muerto**
- *Contexto:* la card "Administradores" del home tiene un botón sin `onClick` — no hace nada.
- *Solución:* enlazarlo al login de admin, o mejor: quitar la card (los admins no llegan por el home) y dejar solo Estudiantes/Propietarios.

**78. Botón "Guía completa" muerto**
- *Contexto:* el CTA final tiene un botón "Guía completa" sin acción.
- *Solución:* crear la página `/guia` (cómo funciona paso a paso, con capturas) o cambiar el CTA a "Explorar cuartos" → `/search`.

**79. Estado de error visible en destacados**
- *Contexto:* si `obtenerDestacadas(4)` falla, el `.catch` deja el grid vacío en silencio — el home parece "sin propiedades".
- *Solución:* mini `ErrorState` inline con botón reintentar (sin romper el resto del home).

**80. Empty state para destacados**
- *Contexto:* si no hay destacadas, se renderiza un grid vacío sin mensaje.
- *Solución:* fallback a "propiedades recientes" y, si tampoco hay, mensaje con CTA a publicar/buscar.

**81. Migrar el home a tokens de color**
- *Contexto:* usa `text-red-300/400`, `bg-red-700 hover:bg-red-800`, `text-stone-800/400`, `border-stone-200` — nada del sistema semántico.
- *Solución:* barrido: `red-*→primary/primary-foreground`, `stone-*→muted/muted-foreground/border`; el home debe ser el escaparate del design system.

**82. Autocompletado de zonas en el buscador del hero**
- *Contexto:* el input de zona del hero es texto libre sin sugerencias.
- *Solución:* combobox (ítem 48) alimentado por `catalogos/universidades/zonas/activas` (ya existe `zonas-cache.ts`) + geolocalización "Cerca de mí".

**83. Chips de búsquedas populares bajo el hero**
- *Contexto:* el usuario nuevo no sabe qué buscar; el hero solo tiene el formulario.
- *Solución:* chips clicables ("Cerca de UPeU", "Hasta S/ 500", "Amoblados", "Solo mujeres") que naveguen a `/search` con filtros pre-serializados (`search-url.ts` ya sabe serializarlos).

**84. Sección "Cómo funciona"**
- *Contexto:* el home no explica el flujo busca → visita → reserva → paga; genera desconfianza en un producto de pagos.
- *Solución:* sección de 3–4 pasos con ilustraciones (ítem 29) y microcopy del flujo real (aprobación del arrendador + pago MercadoPago).

**85. Testimonios con reseñas reales**
- *Contexto:* no hay prueba social; el backend ya guarda reseñas con rating y comentario.
- *Solución:* carrusel de 3–5 reseñas destacadas (nuevo endpoint público `GET /resenas/destacadas` o curadas vía catálogo), con nombre parcial y carrera.

**86. Estadísticas de la plataforma**
- *Contexto:* no hay cifras ("+120 cuartos", "+300 estudiantes") que den escala y confianza.
- *Solución:* endpoint público de stats agregadas (ítem 490) + contadores animados con `motion` al entrar en viewport.

**87. Mapa interactivo en el home**
- *Contexto:* `PropertiesMap` ya existe pero el home no muestra la dimensión geográfica, que es EL diferencial del producto (distancia al campus).
- *Solución:* sección con el mapa centrado en UPeU y pins de propiedades activas, CTA "Ver mapa completo" → `/search?vista=mapa`.

**88. Sección de zonas destacadas**
- *Contexto:* las zonas de cobertura existen en el catálogo (con geometría y tarifas) pero el usuario no las descubre.
- *Solución:* cards por zona (nombre + foto + "N cuartos desde S/ X") que lleven a `/search?zonaId=…`; el conteo sale de la búsqueda paginada con `size=0`/total.

**89. Landing dedicada para arrendadores**
- *Contexto:* el CTA "Proveedores" mezcla ambos públicos en el mismo home; no hay página de venta para dueños.
- *Solución:* `/arrendadores` con propuesta de valor (comisión, verificación, pagos MP), calculadora de ingreso estimado (usa `/propiedades/precio-sugerido`) y CTA a registro con `?rol=arrendador`.

**90. Animaciones de entrada al hacer scroll**
- *Contexto:* las secciones aparecen de golpe; el home se siente plano.
- *Solución:* `motion` con `whileInView` + stagger en cards de destacados y pasos de "Cómo funciona" (respetando ítem 38).

**91. Navbar transparente → sólida al scroll**
- *Contexto:* la navbar es estática sobre el hero con imagen.
- *Solución:* estado `scrolled` (IntersectionObserver sobre un sentinel) que active `glass-nav` (la clase ya existe en globals.css) con transición suave.

**92. Blur placeholder en la imagen del hero**
- *Contexto:* el hero carga la imagen sin placeholder — flash de fondo vacío en conexiones lentas.
- *Solución:* `placeholder="blur"` con `blurDataURL` (Cloudinary lo genera con `e_blur:1000,q_1,w_50`) + `priority`.

**93. `priority` y `sizes` correctos en imágenes above-the-fold**
- *Contexto:* hay que garantizar que el hero use `priority` y las 4 destacadas `sizes` acordes al grid para no descargar tamaños de más.
- *Solución:* auditar con DevTools (red) y fijar `sizes="(max-width:640px) 100vw, 25vw"` en las cards del home.

**94. Efecto Ken Burns sutil en el hero**
- *Contexto:* el hero estático no comunica "producto vivo".
- *Solución:* animación CSS lenta de `scale(1)→scale(1.06)` en 20s alternada sobre la imagen (deshabilitada con `motion-reduce`), o un fade entre 2–3 fotos.

**95. Footer con enlaces reales**
- *Contexto:* `Footer.tsx` tiene enlaces genéricos; no existen páginas de términos, privacidad ni FAQ.
- *Solución:* crear `/terminos`, `/privacidad`, `/faq` (ítems 96–98) y organizar el footer en columnas (Producto / Soporte / Legal / Redes).

**96. Página "Nosotros"**
- *Contexto:* no hay historia del proyecto — clave para diferenciarse de un template y para la sustentación.
- *Solución:* `/nosotros` con misión (vivienda estudiantil UPeU), el problema que resuelve, fotos del equipo y línea de tiempo del proyecto.

**97. Página FAQ con accordion**
- *Contexto:* las dudas típicas (¿cómo pago?, ¿qué pasa si me rechazan?, ¿el depósito?) no están respondidas en ningún lado.
- *Solución:* `/faq` con `Accordion` shadcn, agrupada por rol (estudiante/arrendador), y JSON-LD `FAQPage` para SEO.

**98. Términos y condiciones + política de privacidad**
- *Contexto:* la plataforma procesa pagos (MercadoPago) y datos personales (DNI, RUC) sin páginas legales — requisito de la Ley de Protección de Datos peruana (Ley 29733) y de MP.
- *Solución:* redactar ambas páginas estáticas (MDX), versionarlas con fecha, y enlazarlas desde registro (ítem 185) y footer.

**99. Captura de correo para alertas de nuevas propiedades**
- *Contexto:* un visitante que no encuentra nada hoy se pierde para siempre.
- *Solución:* bloque "Avísame de nuevos cuartos en mi zona" (email + zona) — conecta con búsquedas guardadas (ítem 492).

**100. Sección de universidades soportadas**
- *Contexto:* la migración multi-universidad (Fase 1 lista en catálogo) es invisible en el home, que sigue 100% UPeU.
- *Solución:* fila de logos/cards de universidades activas (`GET /catalogos/universidades`) que preseleccionen `universidadId` en la búsqueda — prepara la Fase 2.

**101. Badges de confianza**
- *Contexto:* no se comunica verificación de arrendadores (RENIEC/SUNAT) ni pagos protegidos.
- *Solución:* franja con 3 sellos: "Arrendadores verificados (RENIEC/SUNAT)", "Pago seguro con MercadoPago", "Propiedades revisadas por el equipo" — todo es cierto, solo falta decirlo.

**102. No expulsar al arrendador del home**
- *Contexto:* `proxy.ts` redirige a todo ARRENDADOR desde `/` y `/search` a su dashboard — no puede ver cómo lucen los anuncios públicamente.
- *Solución:* permitir el home/búsqueda a todos los roles y cambiar solo el CTA de la navbar ("Ir a mi panel"); mantener la redirección únicamente post-login.

**103. Lazy load de secciones bajo el fold**
- *Contexto:* todo el home se renderiza de una (incluye mapa si se añade el ítem 87).
- *Solución:* `next/dynamic` para mapa/testimonios/estadísticas + `loading` skeleton por sección.

**104. JSON-LD de Organization y WebSite**
- *Contexto:* Google no tiene datos estructurados del sitio; no hay sitelinks searchbox.
- *Solución:* script JSON-LD en el layout con `Organization` (logo, redes) y `WebSite` con `potentialAction: SearchAction` apuntando a `/search?q={query}`.

**105. Contenido del hero gestionable desde el catálogo**
- *Contexto:* título, subtítulo e imagen del hero están en el código; cambiar una campaña requiere deploy.
- *Solución:* aprovechar el `TipoItem.BANNER` del backend (ya usado en el dashboard estudiante) para servir el copy/imagen del hero, con fallback hardcodeado.

---

## Sección 4 · Búsqueda y exploración (106–140)

**106. Migrar a la búsqueda paginada del backend**
- *Contexto:* el frontend usa `GET /propiedades/buscar` (lista completa, cacheada 5 min); el backend ya expone `/buscar/paginado` con `page`/`size` — un comentario del propio backend confirma que el front no lo usa.
- *Solución:* cambiar `usePropertiesSearch` a la variante paginada; el infinite scroll existente pasa a pedir páginas reales en vez de trocear en cliente.

**107. Orden por distancia real con `/buscar/cerca`**
- *Contexto:* el backend tiene endpoint geoespacial Haversine (`lat/lng/radioKm` → `distanciaKm` por resultado) y el front pide geolocalización, pero ordena con cálculo propio.
- *Solución:* cuando el usuario da permiso de ubicación, usar `/buscar/cerca` y mostrar "a X km de ti" con el dato del servidor.

**108. Exponer los filtros de backend que faltan**
- *Contexto:* el backend soporta `capacidadMin`, `dormitoriosMin`, `universidadId`, `zonaId` — el `FiltersSheet` no los ofrece todos.
- *Solución:* añadirlos al `filtrosSchema` de Zod, a `search-url.ts` (serialización) y al sheet con steppers (+/-) para capacidad/dormitorios.

**109. Filtro por universidad**
- *Contexto:* multi-universidad Fase 2 pendiente: la búsqueda ancla todo a la universidad "principal".
- *Solución:* selector de universidad en `WhereSearch` (persistido en URL y en el ancla de campus de `lib/geo.ts`) — el backend ya filtra por `universidadId`.

**110. Filtro por zona de cobertura**
- *Contexto:* las zonas tienen nombre, geometría y hasta tarifas, pero el estudiante no puede decir "solo Ñaña".
- *Solución:* chips de zona en el sheet (desde `zonas-cache.ts`) → `zonaId` al backend; pintar el polígono de la zona activa en el mapa.

**111. Histograma de precios en el slider**
- *Contexto:* el rango de precio es un slider ciego — no sabes dónde se concentra la oferta.
- *Solución:* mini-histograma de distribución sobre el slider (como Airbnb) con buckets calculados de los resultados; con Recharts `BarChart` minimal o divs.

**112. Búsquedas guardadas con alertas**
- *Contexto:* no hay forma de "avisarme si sale algo así"; el usuario debe volver a buscar a mano.
- *Solución:* botón "Guardar búsqueda" (serializa los filtros) + notificación cuando una propiedad nueva matchee (ítem 492 en backend); listado en el panel del estudiante.

**113. Historial de búsquedas recientes**
- *Contexto:* `WhereSearch` no recuerda nada entre sesiones.
- *Solución:* store persist (localStorage) con las últimas 5 búsquedas mostradas al enfocar el input, patrón ya usado por `history-store`.

**114. Clusters de marcadores en el mapa**
- *Contexto:* con decenas de propiedades los pins se amontonan e ilegibilizan.
- *Solución:* `leaflet.markercluster` (o `supercluster` con renderer propio) con clusters que muestran el conteo y hacen zoom al click.

**115. Precio en el marcador del mapa**
- *Contexto:* los pins actuales no dicen nada; hay que clickear uno por uno.
- *Solución:* `divIcon` de Leaflet con pill "S/ 450" (estilo Airbnb), estado hover/activo sincronizado con la card (ítem 117).

**116. "Buscar en esta área" al mover el mapa**
- *Contexto:* mover el mapa no actualiza resultados; la lista y el mapa viven desconectados.
- *Solución:* al terminar el drag/zoom, botón flotante "Buscar en esta área" que mande los bounds (o centro+radio a `/buscar/cerca`).

**117. Sincronía hover card ↔ marcador**
- *Contexto:* no hay correspondencia visual entre la lista y el mapa.
- *Solución:* estado compartido `hoveredId` en el hook de búsqueda: hover en card resalta el pin (scale + z-index) y viceversa; click en pin hace scroll a la card.

**118. Más opciones de ordenamiento**
- *Contexto:* el orden actual es limitado; el backend puede ordenar por precio/fecha/rating.
- *Solución:* select de orden (Relevancia / Precio ↑ / Precio ↓ / Más recientes / Mejor calificados / Distancia) persistido en URL.

**119. Skeleton del mapa**
- *Contexto:* mientras Leaflet carga (dynamic import) queda un hueco gris.
- *Solución:* skeleton con placeholder de mapa (patrón de cuadrícula + shimmer) del mismo tamaño para evitar layout shift.

**120. Persistir vista lista/mapa en la URL**
- *Contexto:* `ViewToggle` cambia la vista pero al compartir/recargar se pierde.
- *Solución:* `?vista=mapa|lista` vía `use-search-params-state` (ya existe el hook).

**121. Página de comparación de propiedades**
- *Contexto:* `compare-store` y `PropertyCompareBar` ya existen (máx 4), pero no hay página que compare.
- *Solución:* `/comparar` con tabla lado a lado: precio, distancia, servicios (✓/✗ por fila), reglas, rating, política de cancelación — y CTA de reserva por columna.

**122. Chips de filtros activos completos**
- *Contexto:* `FilterChips` existe pero hay que verificar que muestre TODOS los filtros aplicados (zona, universidad, capacidad…) con quitar individual.
- *Solución:* generar los chips desde el objeto de filtros de forma exhaustiva (map de config filtro→label) + chip "Limpiar todo".

**123. Contador de resultados con contexto**
- *Contexto:* no se comunica cuántos resultados hay ni dónde.
- *Solución:* encabezado "152 cuartos cerca de UPeU" (el total viene del endpoint paginado) que cambia con los filtros — refuerza la sensación de inventario real.

**124. Empty state inteligente con relajación de filtros**
- *Contexto:* "sin resultados" es un callejón sin salida.
- *Solución:* detectar el filtro más restrictivo y sugerir quitarlo ("Sin resultados con precio ≤ S/300 — prueba hasta S/400 (12 cuartos)"), pre-calculando el conteo alternativo.

**125. Toggle "solo verificados" y "solo con fotos"**
- *Contexto:* el DTO ya trae `arrendadorVerificado` e `imagenes[]`, pero no se puede filtrar por confianza.
- *Solución:* dos switches en el sheet; filtrado en backend (nuevo param) o en cliente mientras tanto.

**126. Búsqueda por texto libre**
- *Contexto:* no se puede buscar "amoblado con baño propio" — solo filtros estructurados.
- *Solución:* input `q` que use full-text search de PostgreSQL en el backend (ítem 491); en el front, chip del término activo + highlight en resultados.

**127. Cancelación de requests obsoletos**
- *Contexto:* cambiar filtros rápido puede resolver respuestas fuera de orden (race) y pintar resultados viejos.
- *Solución:* `AbortController` por búsqueda en `usePropertiesSearch` (axios soporta `signal`), cancelando la anterior al disparar una nueva.

**128. Prefetch del detalle al hacer hover**
- *Contexto:* entrar al detalle siempre parte de cero.
- *Solución:* en `PropertyCard`, `onMouseEnter` → `router.prefetch(/property/${id})` + precargar la primera imagen; la navegación se siente instantánea.

**129. Restaurar scroll al volver del detalle**
- *Contexto:* volver de una propiedad devuelve al tope de la lista — frustrante tras scrollear 30 cards.
- *Solución:* guardar `scrollTop` del contenedor de resultados en sessionStorage (keyed por URL de búsqueda) y restaurarlo al montar.

**130. Carrusel de fotos dentro de la card**
- *Contexto:* la card muestra una sola foto; hay que entrar al detalle para ver más.
- *Solución:* `embla-carousel-react` en la card (flechas al hover + dots), lazy: solo carga las demás fotos cuando el usuario interactúa.

**131. Quick view (vista rápida) desde la card**
- *Contexto:* comparar varias propiedades implica muchas idas y vueltas.
- *Solución:* botón "Vista rápida" que abra un Dialog con galería + datos clave + CTA "Ver completo"; reutiliza los componentes del detalle.

**132. Renderizar los badges del backend**
- *Contexto:* `PropiedadPublicoDTO.badges[]` ya calcula "nuevo / popular / última plaza / rebaja", pero hay que auditar si la card los pinta todos.
- *Solución:* `PropertyBadges` con estilo distintivo por tipo (rebaja en success, última plaza en warning) — es información que ya viaja gratis.

**133. Precio anterior tachado**
- *Contexto:* el DTO trae `precioAnterior` para rebajas y probablemente no se muestra.
- *Solución:* en card y detalle: `S/ 400` tachado en muted + precio actual en primary + badge "-12%" calculado.

**134. Landings programáticas de búsqueda (SEO)**
- *Contexto:* `/search` es client-side — Google no indexa "cuartos cerca de UPeU".
- *Solución:* rutas server-rendered `/cuartos/[zona]` (generadas de las zonas del catálogo) con resultados SSR iniciales + metadata única; el diferencial de tráfico orgánico.

**135. Recordar posición del mapa**
- *Contexto:* cada visita al mapa vuelve al encuadre por defecto.
- *Solución:* persistir centro/zoom en sessionStorage y restaurarlos; si hay filtro de zona activo, priorizar el encuadre de la zona.

**136. Accesibilidad del mapa**
- *Contexto:* el mapa es inaccesible por teclado y para lectores de pantalla; sin alternativa equivalente.
- *Solución:* garantizar que TODA la información del mapa exista en la lista (ya casi), añadir `aria-label` al contenedor y atajo visible "Saltar a resultados".

**137. Guardar filtros como preferencia del perfil**
- *Contexto:* un estudiante con presupuesto fijo repite los mismos filtros cada vez.
- *Solución:* al detectar 3 búsquedas seguidas con el mismo rango, ofrecer "¿Guardar como mis preferencias?" y aplicarlas por defecto (persistidas en su perfil de convivencia o localStorage).

**138. Skeleton cards con la proporción real**
- *Contexto:* `SkeletonCardGrid` existe; verificar que las proporciones (imagen 4:3 + 3 líneas) coincidan con `PropertyCard` para evitar saltos.
- *Solución:* derivar el skeleton de la misma estructura de la card (mismo wrapper) para que nunca diverjan.

**139. Telemetría de búsqueda**
- *Contexto:* no se sabe qué filtros usan los estudiantes ni qué búsquedas terminan vacías — información de producto valiosa.
- *Solución:* evento `busqueda_ejecutada` (filtros + total resultados) al analytics elegido (ítem 455); dashboard admin puede consumirlo después.

**140. Modo "explorar sin ubicación exacta"**
- *Contexto:* si el usuario niega la geolocalización solo recibe un toast de error.
- *Solución:* fallback elegante: usar el campus como ancla (ya existe `CampusHydrator`) y un banner suave "Mostrando distancias desde UPeU — activa tu ubicación para personalizarlas".

---

## Sección 5 · Detalle de propiedad (141–170)

**141. Un solo sistema de color en el detalle**
- *Contexto:* `property/[id]/page.tsx` (683 líneas) mezcla `bg-green-50 text-green-700`, `fill-yellow-500`, `bg-emerald-600`, `text-amber-600` **y** `text-[var(--color-success)]` — dos sistemas en el mismo archivo.
- *Solución:* migrar todo a los tokens semáforo (ítem 23); es la página más visible del producto y la más inconsistente.

**142. Avatar del arrendador con `next/image`**
- *Contexto:* usa `<img>` plano con `eslint-disable @next/next/no-img-element` explícito.
- *Solución:* reemplazar por el `UserAvatar` unificado (ítem 54), que decide `unoptimized` con `esImagenExterna`.

**143. Lightbox fullscreen para la galería**
- *Contexto:* `PropertyGallery` muestra las fotos pero sin experiencia inmersiva (zoom, swipe, contador).
- *Solución:* `yet-another-react-lightbox` (plugins Zoom + Thumbnails + Counter), abierto al click en cualquier foto; gesto swipe en móvil.

**144. Grid de galería estilo Airbnb**
- *Contexto:* la primera impresión del detalle depende de la galería; el layout actual no jerarquiza.
- *Solución:* grid 1 grande + 4 pequeñas con botón "Ver las N fotos" sobre la última; en móvil, carrusel con contador "3/12".

**145. Navegación interna sticky por secciones**
- *Contexto:* la página es larguísima (descripción, servicios, reglas, reseñas, mapa) sin forma de saltar.
- *Solución:* tabs sticky bajo el header (Fotos · Servicios · Reseñas · Ubicación) con scroll-spy (`IntersectionObserver`) y `scroll-margin-top`.

**146. Tiempo de respuesta real del arrendador**
- *Contexto:* `tiempoRespuestaArrendador` llega siempre `null` (TODO explícito en `UsuarioController`) y la UI muestra "—".
- *Solución:* frontend: ocultar la fila mientras sea null (no mostrar un dato vacío); backend: job de agregación sobre mensajería (ítem 489).

**147. Ratings por categoría en las reseñas**
- *Contexto:* el backend ya guarda `ratingLimpieza/Ubicacion/Precio/Trato` y expone `GET /resenas/propiedad/{id}/resumen` con los promedios — la UI probablemente solo muestra el rating global.
- *Solución:* 4 barras horizontales con el promedio por categoría en la cabecera de `PropertyReviews`, y las 4 estrellas opcionales en el form de reseña.

**148. Mostrar la respuesta del arrendador en cada reseña**
- *Contexto:* `ResenaResponseDTO` incluye `respuestaArrendador` + `fechaRespuesta`; el arrendador ya puede responder desde su panel.
- *Solución:* bloque anidado bajo la reseña ("Respuesta del propietario · hace 2 días") con avatar — señal de arrendador activo que sube conversión.

**149. Paginación de reseñas**
- *Contexto:* el listado público de reseñas por propiedad devuelve TODO (el backend no pagina el endpoint público).
- *Solución:* mostrar 6 + botón "Ver todas" (modal o expandir); backend: paginar el endpoint (ítem 485).

**150. Ordenar reseñas**
- *Contexto:* las reseñas llegan en un solo orden.
- *Solución:* select "Más recientes / Mejor calificadas / Peor calificadas" — orden en cliente mientras el backend no lo soporte.

**151. Distribución de estrellas**
- *Contexto:* el promedio (4.2) esconde la distribución; 10 reseñas de 5★ y 3 de 1★ cuentan una historia.
- *Solución:* barras 5→1 con conteo y porcentaje, clicables para filtrar las reseñas por rating.

**152. OG image con la foto de la propiedad**
- *Contexto:* `property/[id]/layout.tsx` ya genera metadata OG — verificar que use la primera imagen de la propiedad y un fallback correcto.
- *Solución:* mejor aún: `ImageResponse` de `next/og` para componer una card OG con foto + precio + distancia al campus (ítem 445).

**153. Contacto directo por WhatsApp**
- *Contexto:* el público objetivo vive en WhatsApp (el OTP ya llega por ahí); hoy solo hay chat interno.
- *Solución:* botón "WhatsApp" con `wa.me/{telefono}?text=Hola, vi tu propiedad {titulo} en AlquilaYa…` — revelar el número solo tras registrar el contacto (`POST /{id}/contacto` ya existe para el embudo).

**154. Calendario de ocupación visual**
- *Contexto:* `GET /propiedades/{id}/calendario` devuelve la ocupación pero la disponibilidad se comunica solo como texto/fechas.
- *Solución:* `react-day-picker` en modo solo-lectura con rangos ocupados en muted y disponibles resaltados, dentro del `AvailabilityPanel`.

**155. Política de cancelación explicada visualmente**
- *Contexto:* FLEXIBLE/MODERADA/ESTRICTA se muestra como texto plano; el estudiante no entiende qué implica.
- *Solución:* timeline horizontal con hitos ("Cancela hasta 7 días antes: reembolso total → después: 50%") derivado de `lib/politica-cancelacion.ts` que ya existe.

**156. Costo mensual total estimado**
- *Contexto:* el DTO separa `serviciosIncluidos` de `servicios` con estado (aparte), pero nadie suma el costo real de vivir ahí.
- *Solución:* bloque "Estimado mensual": renta + servicios no incluidos (si tienen monto) + nota de depósito — transparencia que diferencia.

**157. Puntos de interés cercanos**
- *Contexto:* el mapa del detalle solo muestra la propiedad y el campus.
- *Solución:* consulta a Overpass API (OSM, gratis) de paraderos/mercados/farmacias en 500m, pintados como mini-pins con leyenda; cachear por propiedad.

**158. Tiempo real de traslado al campus**
- *Contexto:* se muestra distancia en línea recta (Haversine), pero 800m con cerro no es lo mismo que plano.
- *Solución:* OSRM público (o Google Directions si hay presupuesto) para "12 min caminando · 4 min en mototaxi", cacheado en el backend por propiedad.

**159. Carrusel de similares con embla**
- *Contexto:* "También te puede interesar" (`obtenerSimilares`) renderiza un grid estático; los fallos se tragan en silencio.
- *Solución:* carrusel horizontal con `embla-carousel-react` (ya sugerido en ítem 130), flechas y drag; loggear el error a Sentry aunque la sección se oculte.

**160. Breadcrumb en el detalle**
- *Contexto:* llegar por link directo no da contexto ni vuelta a la búsqueda.
- *Solución:* `Inicio › Búsqueda › {titulo}` — el nodo "Búsqueda" conserva los últimos filtros (sessionStorage del ítem 129).

**161. Tour virtual 360°**
- *Contexto:* solo hay `videoUrl`; los tours 360 (Kuula/Matterport gratis para empezar) elevan muchísimo la percepción.
- *Solución:* aceptar URLs de tour en el campo video (detectar dominio) y renderizar el iframe embebido con lazy load + poster.

**162. Auditar el tracking de vistas**
- *Contexto:* el DTO expone `vistas` y la analítica del arrendador las usa; hay que confirmar que cada visita al detalle registre la vista una sola vez.
- *Solución:* disparo idempotente por sesión (sessionStorage con IDs vistos) para no inflar métricas con recargas.

**163. Denuncias con motivos del catálogo**
- *Contexto:* `ReportListingDialog` existe; el catálogo ya tiene tipos de motivo (`MOTIVO_*`) que quizá no se usan aquí.
- *Solución:* radio-group de motivos desde el catálogo + textarea opcional + confirmación "Gracias, el equipo lo revisará" — y schema Zod (ítem 472).

**164. Skeleton fiel al layout del detalle**
- *Contexto:* el skeleton actual es genérico; el salto al contenido real es brusco.
- *Solución:* skeleton que replique galería + título + sidebar sticky con las mismas dimensiones.

**165. Reportar errores silenciosos a Sentry**
- *Contexto:* similares y otros bloques fallan con `.catch(()=>{})` — invisible para el equipo.
- *Solución:* con `@sentry/nextjs` instalado (ítem 476), `captureException` en cada catch silencioso; la UI puede seguir ocultando la sección.

**166. Preguntas y respuestas públicas del anuncio**
- *Contexto:* las mismas dudas ("¿aceptan mascotas?") se repiten por chat privado una y otra vez.
- *Solución:* sección Q&A pública por propiedad (pregunta del estudiante → respuesta del arrendador, moderable por admin) — requiere dominio nuevo en backend, alto valor de producto.

**167. Fotos por habitación en `RoomList`**
- *Contexto:* con `gestionPorHabitacion`, cada habitación se lista solo con texto/precio.
- *Solución:* thumbnail por habitación (backend: imágenes por habitación, ítem del modelo) con lightbox propio; mientras tanto, al menos icono + m² + piso.

**168. JSON-LD de la propiedad**
- *Contexto:* Google no entiende el detalle como oferta de alojamiento.
- *Solución:* JSON-LD `Product`/`Offer` (precio PEN, disponibilidad) + `AggregateRating` con los datos que ya vienen en el DTO.

**169. Botón "volver" flotante en móvil**
- *Contexto:* en móvil, tras scrollear la galería, volver a resultados exige subir todo.
- *Solución:* FAB circular "‹" arriba-izquierda (aparece tras 300px de scroll) que haga `router.back()` con scroll restaurado (ítem 129).

**170. Estado "no disponible" con salidas**
- *Contexto:* una propiedad ocupada muestra apenas un badge; el visitante rebota.
- *Solución:* overlay suave en la galería + panel "Este cuarto ya se ocupó" con: notificarme si se libera (ítem 112), y 4 similares disponibles arriba del fold.

---

## Sección 6 · Autenticación, registro y onboarding (171–200)

**171. Labels visibles en reset-password y verify-email**
- *Contexto:* ambos formularios usan solo `placeholder` (desaparece al escribir) — problema de usabilidad y accesibilidad.
- *Solución:* `<Label>` explícito sobre cada input (patrón `FormField` del ítem 71); el placeholder queda como ejemplo, no como etiqueta.

**172. `aria-label` en el toggle de ojo de reset-password**
- *Contexto:* el botón mostrar/ocultar contraseña de `reset-password` no tiene nombre accesible (los de personal-tab y security-tab sí — inconsistente).
- *Solución:* resuelto de raíz por el `PasswordInput` único (ítem 14) con `aria-label="Mostrar contraseña"` dinámico.

**173. Un solo `PasswordInput` en el flujo de auth**
- *Contexto:* refuerzo del ítem 14 aplicado a auth: login modal, registro, reset y cambio de contraseña deben compartir el componente.
- *Solución:* migrar las 4 superficies al componente unificado con `PasswordStrength` opcional integrado.

**174. Stepper del registro accesible**
- *Contexto:* `CenteredStepper` es decorativo: sin `aria-current`, sin anunciar el paso al lector de pantalla.
- *Solución:* usar el Stepper del ítem 70 con `aria-current="step"` y texto "Paso 2 de 4: Datos personales" (visible u oculto).

**175. Input OTP segmentado**
- *Contexto:* el código de 6 dígitos se ingresa en un input de texto plano.
- *Solución:* librería `input-otp` (la que usa shadcn): 6 casillas, auto-avance, pegado inteligente del código completo, `autoComplete="one-time-code"`.

**176. Autocompletado del OTP en todas las superficies**
- *Contexto:* `verify-email` ya tiene `autoComplete="one-time-code"`; el paso OTP del modal de registro hay que auditarlo.
- *Solución:* mismo tratamiento en el modal (el `input-otp` del ítem 175 lo trae de fábrica).

**177. Persistir el progreso del registro**
- *Contexto:* el wizard vive en `useAuthModal` (memoria) — un F5 en el paso 3 pierde todo lo tecleado.
- *Solución:* `persist` con sessionStorage en el store del modal (excluyendo contraseña), con limpieza al completar o cerrar sesión.

**178. Requisitos de contraseña en vivo en todas partes**
- *Contexto:* `PasswordStrength` existe pero no acompaña todos los formularios donde se crea/cambia contraseña.
- *Solución:* checklist en vivo (8+ caracteres, mayúscula, número, símbolo — espejo del `@ContrasenaSegura` del backend) en registro, reset y cambio.

**179. Verificación de correo en un click**
- *Contexto:* el flujo actual exige copiar un código manualmente; el backend ya tiene `verify-email` con token.
- *Solución:* que el correo incluya botón con deep-link `/verify-email?token=…` que verifique al abrir; el código manual queda como fallback.

**180. Onboarding de convivencia post-registro**
- *Contexto:* el perfil de convivencia (clave para el matching de roommates) está escondido en una tab del perfil; casi nadie lo llenará.
- *Solución:* wizard opcional de 3 pantallas tras el primer login ("¿Cómo eres para convivir?") con las mismas preguntas de `convivencia-tab`, skippable y con barra de progreso.

**181. Conectar el `OnboardingBanner` a estado real**
- *Contexto:* los 3 pasos del banner (verificar identidad / guardar 3 favoritos / solicitar visita) deben reflejar el progreso real del usuario.
- *Solución:* derivar cada check de datos reales (estado KYC de `use-verification-status`, `favoritesStore.size`, existencia de reservas) y ocultar el banner al completar todo.

**182. Google One Tap**
- *Contexto:* ya existe `@react-oauth/google` y el backend acepta `google-login` — pero el usuario debe abrir el modal primero.
- *Solución:* habilitar One Tap (`useGoogleOneTapLogin`) en el home para visitantes no autenticados, con cooldown si lo cierran.

**183. Recordar el último método de login**
- *Contexto:* usuarios que entraron con Google intentan luego con contraseña (que no tienen) y se frustran.
- *Solución:* guardar `lastLoginMethod` en localStorage y mostrar chip "La última vez entraste con Google" sobre el botón correspondiente.

**184. Protección anti-bots (Cloudflare Turnstile)**
- *Contexto:* register/forgot-password/resend-otp son públicos; el rate-limit del backend ayuda pero los bots queman los envíos de WhatsApp.
- *Solución:* Turnstile (gratis, sin fricción visual) en registro y forgot; el backend valida el token en esos 3 endpoints.

**185. Checkbox de términos en el registro**
- *Contexto:* no se aceptan términos ni privacidad al registrarse (los ítems 95–98 crean las páginas).
- *Solución:* checkbox obligatorio con links + guardar timestamp de aceptación en el backend (campo en el registro) — cobertura legal real.

**186. Página `/login` dedicada**
- *Contexto:* el login es solo modal; los deep-links a rutas protegidas redirigen a `/` sin contexto y no hay URL para "iniciar sesión".
- *Solución:* página `/login` que reutilice el mismo `AuthDialog` en modo embebido + `?next=/student/reservations` para volver a donde iba (ítem 200).

**187. Limpieza total de stores al cerrar sesión**
- *Contexto:* al hacer logout, stores como favoritos, notificaciones, mensajes no leídos e historial de comparación pueden conservar datos del usuario anterior.
- *Solución:* función `resetAllStores()` registrada por cada store y llamada en logout (y en login con usuario distinto).

**188. Sesiones activas legibles**
- *Contexto:* `ActiveSessions` lista sesiones, pero el user-agent crudo no es legible.
- *Solución:* `ua-parser-js` para mostrar "Chrome · Windows · Lima" con icono del dispositivo, badge "Este dispositivo" en la sesión actual, y botón "Cerrar las demás" (endpoint ya existe).

**189. Auditoría de foco en el modal de auth**
- *Contexto:* el Dialog Radix da focus-trap, pero el wizard interno cambia de paso sin recolocar el foco.
- *Solución:* al cambiar de step, foco al heading del paso (`tabIndex={-1}` + `focus()`); Escape con confirmación si hay datos escritos.

**190. Errores del backend mapeados a campos**
- *Contexto:* `parseAxiosError` ya extrae `validationErrors` por campo, pero los formularios muestran solo el toast genérico.
- *Solución:* helper `applyServerErrors(form, err)` que haga `form.setError(campo, {message})` por cada validationError — el error aparece bajo el input exacto.

**191. Cooldown de reenvío unificado**
- *Contexto:* `verify-email` tiene cooldown de 60s; el reenvío de OTP del modal debe comportarse igual (el backend ya ratelimitea `resend-otp`).
- *Solución:* hook `useResendCooldown(60)` compartido con contador visible ("Reenviar en 0:42") y el número de intentos restantes si el backend lo informa.

**192. Validación de RUC en vivo en el registro de arrendador**
- *Contexto:* el backend expone `POST /arrendador/verificar-ruc` (ApiPeru/SUNAT); auditar que el paso de detalles lo use al escribir el RUC.
- *Solución:* validación async al completar 11 dígitos con spinner inline + mostrar la razón social devuelta ("¿Eres INVERSIONES PÉREZ SAC?") para confirmar.

**193. Buscador de dirección en el MapPicker del registro**
- *Contexto:* el arrendador debe clickear el mapa para ubicarse; `lib/geo.ts` ya tiene geocoding Nominatim.
- *Solución:* input de dirección con geocode debounced que recoloque el pin, y reverse-geocode al arrastrarlo (el form de publicar ya lo hace — reutilizar).

**194. Mensajes anti-enumeración en forgot-password**
- *Contexto:* hay que auditar que "correo no encontrado" no revele qué correos existen.
- *Solución:* respuesta uniforme "Si el correo existe, te llegará un enlace" tanto en UI como en backend.

**195. Título y descripción accesibles del modal**
- *Contexto:* el `AuthDialog` cambia de contenido por paso; los lectores necesitan `DialogTitle`/`DialogDescription` actualizados.
- *Solución:* asegurar que cada paso renderice su `DialogTitle` (aunque sea `VisuallyHidden`) — Radix además avisa por consola si falta.

**196. Autofocus en el primer campo de cada paso**
- *Contexto:* cada paso del wizard exige un click extra antes de teclear.
- *Solución:* `autoFocus` (o `setFocus` de RHF) en el primer input al montar cada paso — combinado con el ítem 189.

**197. Estados de envío consistentes en todos los pasos**
- *Contexto:* auditar que cada submit del wizard deshabilite el botón + spinner (evita dobles registros).
- *Solución:* `<Button loading>` estandarizado (variante con spinner integrado) usado por todo el flujo de auth.

**198. Pre-selección de rol por URL**
- *Contexto:* campañas para arrendadores no pueden llevar a un registro con el rol ya elegido.
- *Solución:* `/register?rol=arrendador` salta el paso de rol (o lo preselecciona) — útil también para el CTA de la landing del ítem 89.

**199. Open Graph del registro**
- *Contexto:* `/register` tiene metadata pero sin OG específico; se comparte en grupos de WhatsApp de cachimbos.
- *Solución:* OG image propia ("Encuentra tu cuarto cerca de UPeU — regístrate gratis") con el generador del ítem 445.

**200. Redirect post-login inteligente**
- *Contexto:* tras loguearse siempre aterrizas según tu rol, aunque estuvieras por reservar una propiedad concreta.
- *Solución:* guardar la URL de origen al abrir el modal (o `?next=`) y volver ahí tras autenticar; solo si no hay origen, aplicar el redirect por rol.

---

## Sección 7 · Panel del estudiante (201–250)

**201. Corregir el contador de "Mensajes" del dashboard (BUG)**
- *Contexto:* en `student/page.tsx` los StatCard de "Mensajes" y "Notificaciones" usan LA MISMA variable `noLeidasNotif` — el de mensajes muestra notificaciones.
- *Solución:* conectar "Mensajes" a `useUnreadMessagesStore` (ya existe y lo alimenta el STOMP); una línea de fix con impacto directo en credibilidad.

**202. Estado de error en el dashboard**
- *Contexto:* los `Promise.all` del dashboard capturan errores devolviendo `[]` — si el backend está caído, el dashboard parece "vacío pero sano".
- *Solución:* distinguir vacío de error: `Promise.allSettled` + `ErrorState` por bloque fallido con reintento.

**203. Mover `FA_TO_MATERIAL` fuera de la página**
- *Contexto:* el dashboard embebe el diccionario de 35 entradas para iconos de banners (y hay 2 copias más en landlord/admin).
- *Solución:* una sola fuente `lib/icons.ts` — o mejor, resolver de raíz con el ítem 19 (normalizar el catálogo a lucide).

**204. Widget "Continúa donde quedaste"**
- *Contexto:* `history-store` guarda las últimas 50 propiedades vistas pero el dashboard no lo aprovecha.
- *Solución:* fila horizontal con las 3 últimas vistas + CTA "Ver historial completo" — retoma la intención de búsqueda en un click.

**205. Widget de próximos pagos**
- *Contexto:* el backend tiene cuotas de renta mensual (G2, `GET /reservas/{id}/cuotas`) — el estudiante no ve cuándo vence su próxima cuota.
- *Solución:* card "Próximo pago: S/ 450 — vence en 5 días" con CTA a pagar, visible solo si tiene reserva PAGADA activa con cronograma.

**206. Acciones contextuales según estado de reserva**
- *Contexto:* el dashboard es igual para quien no tiene nada, quien espera aprobación y quien debe pagar.
- *Solución:* banner de acción dominante según estado: SOLICITADA → "esperando al arrendador"; APROBADA → "¡Te aprobaron! Paga antes de {expiración}"; PAGADA → próximos pasos.

**207. Skeleton + error en notificaciones**
- *Contexto:* `notifications/page.tsx` no tiene estado de carga ni de error (solo empty).
- *Solución:* triada completa (skeleton de 5 filas / `ErrorState` con retry / empty existente) como ya hace favoritos.

**208. Paginación de notificaciones**
- *Contexto:* el backend pagina `GET /notificaciones/mis`, pero la UI carga una sola tanda.
- *Solución:* infinite scroll con `use-infinite-scroll` (ya existe el hook) o botón "Ver más antiguas".

**209. Agrupar notificaciones por día**
- *Contexto:* la lista es plana; escanear "qué pasó hoy" cuesta.
- *Solución:* separadores "Hoy / Ayer / Esta semana / Anteriores" (agrupación con date-fns) + contador por grupo.

**210. Preferencias de notificación**
- *Contexto:* el estudiante no puede elegir qué recibir (mensajes, reservas, marketing).
- *Solución:* sección en el perfil con switches por tipo; backend: campo de preferencias en el usuario que el productor de notificaciones respete.

**211. Estado de error en historial**
- *Contexto:* `history/page.tsx` filtra fallos por-item con `.catch(()=>null)` — si todo falla queda vacío sin explicación.
- *Solución:* si >50% de los items fallan, mostrar `ErrorState`; los fallos puntuales sí pueden filtrarse.

**212. Quitar items individuales del historial**
- *Contexto:* solo existe "limpiar todo" (con AlertDialog).
- *Solución:* botón ✕ al hover de cada card que llame a `removeFromHistory(id)` del store, con undo por toast (`notify` con action).

**213. Estados completos en roommates**
- *Contexto:* `roommates/page.tsx` usa spinner en vez de skeleton, empty inline propio y error solo por toast.
- *Solución:* adoptar la triada estándar: `SkeletonCardGrid`, `EmptyState` compartido con CTA "Completa tu perfil de convivencia", `ErrorState` con retry.

**214. Filtros del board de roommates**
- *Contexto:* el board de compatibilidad lista a todos sin filtrar.
- *Solución:* filtros por carrera, ciclo y presupuesto (datos que ya están en el perfil académico) + orden por score de compatibilidad.

**215. Desglose de compatibilidad**
- *Contexto:* el score de `RoommateCard` es un número opaco.
- *Solución:* modal/hover-card con el desglose por dimensión (horarios, limpieza, visitas, ruido) en barras — hace creíble el algoritmo.

**216. Paginación del board de roommates**
- *Contexto:* carga todos los perfiles de una.
- *Solución:* paginar en cliente (12 por página) mientras el backend no pagine `GET /usuarios/roommates`.

**217. Estados completos en grupos**
- *Contexto:* `groups/page.tsx` repite el patrón spinner + empty inline + error por toast.
- *Solución:* misma triada estándar del ítem 213.

**218. Pantalla en blanco en el detalle de grupo (BUG)**
- *Contexto:* `groups/[id]/page.tsx` hace `if (!grupo) return null` — si el fetch falla o el id no existe, pantalla vacía total.
- *Solución:* `ErrorState` "Grupo no encontrado" con CTA a `/student/groups`; distinguir 404 de error de red.

**219. Tokens en el detalle de grupo**
- *Contexto:* usa `bg-green-100 text-green-700` y `bg-amber-100 text-amber-700` crudos.
- *Solución:* migrar a los tokens semáforo (barrido del ítem 1).

**220. Compartir invitación de grupo por WhatsApp**
- *Contexto:* el link de invitación solo se copia al portapapeles.
- *Solución:* botón WhatsApp (`wa.me/?text=Únete a mi grupo para alquilar en AlquilaYa: {link}`) + Web Share API en móvil (`navigator.share`).

**221. Chat grupal para grupos de roommates**
- *Contexto:* los miembros de un grupo no pueden hablar entre sí — coordinan por fuera.
- *Solución:* extender mensajería a conversaciones grupales (backend: conversación multi-participante) o, de bajo costo, link a grupo de WhatsApp guardado por el creador.

**222. Implementar la subida de avatar (botón muerto)**
- *Contexto:* el lápiz "Editar foto" de `personal-tab.tsx` no tiene `onClick`; el backend YA tiene `POST /usuarios/{id}/foto`.
- *Solución:* input file con crop cuadrado (`react-easy-crop`), preview y subida con `notify.promise`; actualizar el store de auth al éxito.

**223. Quitar el badge "Buscando roomie" hardcodeado**
- *Contexto:* `personal-tab.tsx` muestra ese badge SIEMPRE, sin leer el estado real de convivencia.
- *Solución:* leerlo del perfil de convivencia (`buscandoRoommate`) y ocultarlo si es falso; clickeable → tab de convivencia.

**224. Reputación real en el ProfileHero**
- *Contexto:* la stat "Reputación" muestra una estrella estática sin valor — el backend ya calcula score/nivel del estudiante (`GET /estudiante/{id}/info`, eventos Kafka `resenas-topic`).
- *Solución:* mostrar el `ReputationBadge` real con tooltip de cómo se gana reputación (pagos puntuales, reseñas de arrendadores).

**225. Avatares con `next/image` en el perfil**
- *Contexto:* `profile/page.tsx` (hero) y `personal-tab.tsx` usan `<img>` plano.
- *Solución:* cubierto por el `UserAvatar` unificado (ítem 54) — migrar ambas superficies.

**226. Universidad seleccionable en datos académicos**
- *Contexto:* `academic-tab.tsx` tiene la universidad `readOnly` hardcodeada "Universidad Peruana Unión" — bloquea la Fase 2 multi-universidad.
- *Solución:* select desde `GET /catalogos/universidades` (activas), persistiendo `universidadId` en el perfil académico (backend ya migró el catálogo).

**227. Carga visible de carreras**
- *Contexto:* `academic-tab` carga carreras con catch silencioso y sin skeleton; si falla, aparece un input de texto sin explicación.
- *Solución:* skeleton del select + mensaje "No pudimos cargar las carreras — escríbela manualmente" cuando caiga al fallback.

**228. Barra de completitud del perfil**
- *Contexto:* solo convivencia tiene barra; no hay medida global que motive a completar el perfil.
- *Solución:* score global (datos personales + académicos + convivencia + verificación + foto) con `ProgressBar` en el hero y lista de "te falta X".

**229. Autenticación de dos factores (2FA)**
- *Contexto:* solo hay contraseña u OAuth; para un producto con pagos, 2FA es un plus serio.
- *Solución:* TOTP opcional (Google Authenticator): backend genera secret + QR (`java-totp`), front añade paso de código en login si está activo — sección en la tab de seguridad.

**230. Timeline del estado de verificación KYC**
- *Contexto:* los documentos suben con estados en backend (pending/verificado) pero el estudiante no ve el progreso.
- *Solución:* usar el `Timeline` (ítem 69): Subido → En revisión → Aprobado/Observado (con motivo), alimentado por `use-verification-status`.

**231. Colecciones de favoritos**
- *Contexto:* los favoritos son una lista plana; con 20+ guardados se vuelve inmanejable.
- *Solución:* etiquetas/colecciones ("Para el próximo ciclo", "Con mi grupo") — front con tags locales primero, backend con campo `coleccion` después.

**232. Comparar desde favoritos**
- *Contexto:* `compare-store` existe pero favoritos no ofrece "comparar seleccionados".
- *Solución:* checkbox de selección en cada card (modo selección) + barra inferior "Comparar (3)" que abra `/comparar` (ítem 121).

**233. Nota personal por favorito**
- *Contexto:* no hay dónde apuntar "me gustó pero el baño es compartido".
- *Solución:* nota de texto corta por favorito (localStorage keyed por id, o campo en backend), visible en la card con icono de nota.

**234. Paginación de reservas**
- *Contexto:* `reservations/page.tsx` carga todas las reservas de una (`useReservations`); el backend tampoco pagina (ítem 484).
- *Solución:* paginar en ambos lados; la UI ya filtra por 7 estados — paginar dentro del filtro activo.

**235. Timeline visual en cada reserva**
- *Contexto:* `lib/reservation-status.ts` ya calcula el timeline (Solicitada → Aprobada → Pagada → Finalizada) pero la card solo muestra un badge.
- *Solución:* mini-timeline horizontal en la card expandida usando el componente del ítem 69 — el estudiante entiende dónde está y qué falta.

**236. Descargar el contrato desde reservas**
- *Contexto:* el backend expone `GET /reservas/{id}/contrato` (PDF) — el front ni siquiera lo tiene en su service.
- *Solución:* añadirlo a `reservation-service.ts` y botón "Ver contrato" (abre el PDF en nueva pestaña) en reservas PAGADA/FINALIZADA.

**237. Firma electrónica del contrato**
- *Contexto:* `POST /reservas/{id}/contrato/firmar` existe (firma G4) sin UI.
- *Solución:* flujo "Revisar y firmar": preview del PDF (ítem 295) + checkbox de conformidad + botón firmar; badge "Firmado por ambas partes" cuando corresponda.

**238. Countdown de expiración de reserva aprobada**
- *Contexto:* una APROBADA expira si no se paga (EXPIRADA es estado real; las horas son configurables por admin) — el estudiante no ve el reloj.
- *Solución:* countdown vivo en la card ("Expira en 23h 14m", en warning cuando quede <6h) + notificación previa (backend programa el aviso).

**239. CTA de pago prominente**
- *Contexto:* pagar una reserva aprobada debería ser LA acción más visible del panel.
- *Solución:* en reservas APROBADA, botón primario grande "Pagar S/ {monto}" en la card + banner en el dashboard (ítem 206).

**240. Cancelar con motivo del catálogo**
- *Contexto:* el catálogo tiene `MOTIVO_CANCELACION` y el backend acepta motivo — auditar que el flujo de cancelar lo pida.
- *Solución:* AlertDialog con radio de motivos + texto libre opcional + advertencia del reembolso según política (ítem 288).

**241. Pedir reseña al finalizar**
- *Contexto:* tras FINALIZADA no hay prompt para reseñar — por eso hay pocas reseñas (y el producto las necesita).
- *Solución:* CTA "¿Cómo te fue? Deja tu reseña" en la card finalizada + notificación 1 día después + banner en dashboard hasta que reseñe (o descarte).

**242. Pantalla de cronograma de cuotas (G2)**
- *Contexto:* `GET /reservas/{reservaId}/cuotas` existe; el estudiante con renta mensual no ve su cronograma.
- *Solución:* sección "Mis pagos" dentro del detalle de reserva: tabla de cuotas (mes, monto, estado, vencimiento) con CTA de pago por cuota pendiente.

**243. Visibilidad del depósito de garantía (G3)**
- *Contexto:* los depósitos existen en backend (capturar/devolver/retener) pero son admin-only; el estudiante no sabe qué pasó con su garantía.
- *Solución:* estado del depósito en el detalle de reserva (Retenido → En devolución → Devuelto, con montos); backend: endpoint self-service de consulta (ítem sugerido al equipo).

**244. Loading/error y service dedicado en el chat**
- *Contexto:* `messages/[id]/page.tsx` llama `api.get('/usuarios/arrendador/{id}/info')` inline, sin estado de carga/error propio (si falla, muestra "Arrendador").
- *Solución:* mover la llamada a `conversation-service`/`profile-service`, skeleton del header del chat y `ErrorState` si la conversación no existe.

**245. Badges de no-leídos en la bottom nav**
- *Contexto:* `StudentBottomNav` no muestra contadores; en móvil (el dispositivo principal) los mensajes nuevos pasan desapercibidos.
- *Solución:* dot/badge numérico en Mensajes (unread-messages-store) y Notificaciones (notifications-store), con `aria-label` "3 mensajes sin leer".

**246. Sidebar con estado activo y colapso persistente**
- *Contexto:* auditar el resaltado de la ruta activa en `StudentSidebar` y añadir colapso.
- *Solución:* `aria-current="page"` + resaltado por token sidebar; botón de colapso a iconos con preferencia en localStorage.

**247. Vista lista/cuadrícula en favoritos**
- *Contexto:* solo hay grid; comparar precios se hace mejor en lista densa.
- *Solución:* `ToggleGroup` grid/lista (persistido) — la lista muestra foto pequeña + precio + distancia + rating en una fila.

**248. Deshacer al ocultar propiedades**
- *Contexto:* `hidden-properties-store` oculta propiedades; recuperarlas exige encontrar el toggle "Mostrar N ocultas".
- *Solución:* toast con acción "Deshacer" (5s) al ocultar, patrón estándar de sonner.

**249. Perfil de roommate en modal**
- *Contexto:* la `RoommateCard` muestra poco y no hay vista ampliada del candidato.
- *Solución:* modal con bio, hábitos completos, compatibilidad desglosada (ítem 215) y CTA "Enviar mensaje" (crea conversación vía mensajería) + "Invitar a mi grupo".

**250. Centro de ayuda del estudiante**
- *Contexto:* no hay dónde resolver dudas ni pedir soporte desde el panel.
- *Solución:* página `/student/ayuda` con la FAQ (ítem 97) filtrada por rol + formulario de contacto (crea conversación con soporte o mailto) + link a WhatsApp del equipo.

---

## Sección 8 · Mensajería y chat (251–270)

**251. Indicador "escribiendo…" en el chat del estudiante**
- *Contexto:* el backend STOMP ya soporta `/chat.typing/{conversacionId}` y el chat del arrendador lo usa — auditar que `ChatWindow` (estudiante) también lo muestre.
- *Solución:* paridad total entre ambos chats: typing indicator con burbuja animada de 3 puntos y throttle de emisión (1 evento/2s).

**252. Confirmación de lectura consistente**
- *Contexto:* `PATCH /marcar-leida` existe y el chat del arrendador muestra ✓✓; verificar la vista del estudiante.
- *Solución:* doble check en los mensajes propios leídos (color primary) y simple en entregados, con leyenda accesible (`aria-label="Leído"`).

**253. Cargar mensajes antiguos con scroll infinito**
- *Contexto:* el backend pagina mensajes (máx 200); el arrendador tiene "ver anteriores" con botón — el patrón moderno es cargar al llegar arriba.
- *Solución:* `use-infinite-scroll` invertido (sentinel arriba) manteniendo la posición de scroll al prepend (scroll anchoring manual con `scrollHeight` diff).

**254. Adjuntar imágenes en el chat**
- *Contexto:* la mensajería es solo texto; los estudiantes quieren mandar captura del voucher o fotos.
- *Solución:* botón de clip → subir a Cloudinary → mensaje con `tipo=IMAGEN` y thumbnail con lightbox; backend: campo tipo/url en mensaje (ítem 495).

**255. Compartir una propiedad dentro del chat**
- *Contexto:* al negociar, los usuarios pegan URLs planas de propiedades.
- *Solución:* detectar URLs de `/property/{id}` en el texto y renderizarlas como mini-card (foto + título + precio) — solo front, sin cambio de backend.

**256. Notificaciones de escritorio/sonido opcionales**
- *Contexto:* con la pestaña en segundo plano no te enteras de mensajes nuevos.
- *Solución:* `Notification API` con permiso opt-in (toggle en preferencias) + título de pestaña parpadeante "(1) AlquilaYa" + sonido sutil configurable.

**257. Estado de conexión del WebSocket visible**
- *Contexto:* `stomp-client` reconecta con backoff 5s en silencio — si el WS cae, los mensajes parecen no llegar sin explicación.
- *Solución:* banner fino "Reconectando…" (warning) sobre el chat cuando `!connected`, que desaparece al reconectar; estado expuesto desde el singleton.

**258. Separadores de fecha en la conversación**
- *Contexto:* los mensajes corren sin marcas de día.
- *Solución:* separador centrado "Hoy / Ayer / 15 de junio" al cambiar de día (agrupación con date-fns, mismo patrón del ítem 209).

**259. Emoji picker tematizado**
- *Contexto:* `emoji-picker-react` está integrado; auditar que siga el dark mode (`theme` prop) y que cargue lazy.
- *Solución:* `<EmojiPicker theme={resolved}>` ligado al theme-store + `next/dynamic` para no meterlo en el bundle inicial (~300KB).

**260. Respuestas rápidas predefinidas**
- *Contexto:* las primeras interacciones son siempre iguales ("¿Sigue disponible?", "¿Puedo visitarlo?").
- *Solución:* chips sobre el input en conversaciones nuevas (estudiante) y para el arrendador ("Sí, está disponible", "¿Cuándo puedes venir?") — reduce fricción de arranque.

**261. Reportar usuario desde el chat**
- *Contexto:* el admin ya modera conversaciones/mensajes, pero el usuario no tiene botón para denunciar acoso o fraude.
- *Solución:* menú ⋮ en el header del chat → "Reportar" con motivos; backend: endpoint de denuncia de conversación que la marque para revisión en el panel de moderación existente.

**262. Archivar conversaciones**
- *Contexto:* el soft-delete por participante existe (`DELETE /conversaciones/{id}`) pero la UI lo trata como borrado definitivo.
- *Solución:* renombrarlo "Archivar" (más honesto con el comportamiento real), sección "Archivadas" colapsada al final de la lista y restaurar al recibir mensaje nuevo.

**263. Buscar en las conversaciones**
- *Contexto:* la lista del arrendador tiene búsqueda; la del estudiante hay que auditarla — y ninguno busca dentro de los mensajes.
- *Solución:* fase 1: filtro client-side por nombre/propiedad en la lista; fase 2: búsqueda de texto en mensajes (backend con ILIKE paginado).

**264. Paginar el listado de conversaciones**
- *Contexto:* `GET /conversaciones` devuelve todas (el backend no pagina ese listado).
- *Solución:* paginar backend + infinite scroll en la lista; con pocos usuarios no urge, pero es deuda de escala marcada.

**265. Preview del último mensaje con estado**
- *Contexto:* auditar que `ConversationList` muestre el último mensaje truncado, hora relativa y si es tuyo ("Tú: …").
- *Solución:* fila con: avatar + nombre + preview 1 línea + hora (`relative-time.ts`) + badge de no-leídos por conversación — el estándar WhatsApp.

**266. Contador de no-leídos por conversación**
- *Contexto:* `unread-messages-store` guarda el total global; la lista necesita el desglose por conversación.
- *Solución:* map `{conversacionId: count}` en el store (los eventos STOMP ya traen la conversación) + badge en cada fila y suma total para nav/bottom-nav.

**267. Scroll inteligente al recibir mensajes**
- *Contexto:* si estás leyendo mensajes viejos y llega uno nuevo, un autoscroll forzado te secuestra.
- *Solución:* autoscroll solo si estabas a <100px del final; si no, botón flotante "↓ 1 mensaje nuevo" que baja al click.

**268. Reintento de mensajes fallidos**
- *Contexto:* si el envío STOMP falla (rate limit del backend, desconexión) el mensaje puede perderse sin feedback.
- *Solución:* optimistic UI con estados enviando/enviado/fallido; en fallo, icono ⚠ + "Reintentar" en el mensaje; escuchar `/user/queue/errors` (ya existe) para el RATE_LIMIT.

**269. Links seguros y clicables en mensajes**
- *Contexto:* las URLs en mensajes son texto plano (o peor, HTML sin sanitizar — auditar).
- *Solución:* `linkify-react` para convertir URLs en `<a rel="noopener noreferrer nofollow" target="_blank">`; nunca `dangerouslySetInnerHTML` con contenido de usuarios.

**270. Accesibilidad del chat**
- *Contexto:* los mensajes entrantes no se anuncian a lectores de pantalla.
- *Solución:* `aria-live="polite"` en el contenedor de mensajes, `aria-label` con autor+hora en cada burbuja, y navegación por teclado en la lista de conversaciones.

---

## Sección 9 · Reservas y pagos — UX (271–300)

**271. Unificar las tres páginas de resultado de pago**
- *Contexto:* `pago/exito`, `pago/fallo` y `pago/pendiente` son casi idénticas con colores crudos (`text-green-500`, `text-yellow-500`).
- *Solución:* el `<PaymentResult/>` del ítem 17 con tokens semáforo; además `exito` merece confeti sutil (`canvas-confetti`, una vez, respetando reduced-motion).

**272. Polling del estado en "pago pendiente"**
- *Contexto:* `GET /pagos/estado/{reservaId}` existe justo para esto, pero la página pendiente es estática — el usuario refresca a mano.
- *Solución:* poll cada 5s (máx 2 min) con `AbortController`; al confirmarse, transición animada a la vista de éxito sin recargar.

**273. Countdown de expiración en todo el flujo**
- *Contexto:* complemento del ítem 238: la expiración configurable (admin) debe verse también en el checkout.
- *Solución:* helper `useCountdown(fechaExpiracion)` compartido entre card de reserva, checkout y banner del dashboard.

**274. Desglose de precio antes de reservar**
- *Contexto:* `ReservationFormDialog` pide fechas pero no muestra cuánto se pagará ni cómo se compone.
- *Solución:* resumen en el propio dialog: renta del período + comisión de servicio (el DTO de reserva ya trae `comision`) + depósito si aplica = total, con tooltips explicativos.

**275. Transparencia de la comisión**
- *Contexto:* `ReservaResponseDTO.comision` se calcula por zona pero el estudiante la descubre (¿o no?) al pagar.
- *Solución:* mostrar la comisión SIEMPRE desglosada (dialog de reserva, card, checkout) — la opacidad en cobros destruye confianza.

**276. Checkout embebido con MercadoPago Bricks**
- *Contexto:* el pago redirige a MP (Checkout Pro `init_point`) — se pierde el contexto visual del producto.
- *Solución:* migrar a **Checkout Bricks** (SDK `@mercadopago/sdk-react`, componente `Payment`): el formulario de tarjeta vive dentro de AlquilaYa con la marca propia; Pro queda de fallback.

**277. Estado intermedio de pago visible**
- *Contexto:* entre "pagué en MP" y "reserva PAGADA" media el webhook + Kafka — segundos donde la UI puede mostrar información vieja.
- *Solución:* estado visual "Confirmando tu pago…" (spinner + poll del ítem 272) en reservas con pago iniciado; el evento `RESERVA_PAGO_PENDIENTE` del backend ya existe para esto.

**278. Reintentar un pago fallido**
- *Contexto:* tras un fallo, el usuario debe redescubrir cómo volver a pagar.
- *Solución:* en `pago/fallo` y en la card de reserva: botón "Intentar de nuevo" que regenere la preferencia (`POST /preferencia/{reservaId}`) — mapear los motivos de rechazo de MP (ítem 299).

**279. Historial de pagos del estudiante**
- *Contexto:* no hay pantalla "mis pagos" — solo el estado por reserva.
- *Solución:* tabla con fecha, concepto, monto, método y comprobante; backend: endpoint de pagos por usuario (ítem 493).

**280. Comprobante descargable post-pago**
- *Contexto:* tras pagar no queda ningún documento — los padres (que suelen pagar) lo piden.
- *Solución:* comprobante PDF simple (número de operación MP, montos, datos de la propiedad) generado por el backend (ítem 494); botón en la página de éxito e historial.

**281. Recordatorios en el pago dividido de grupo**
- *Contexto:* en grupos, la barra de cuotas muestra quién pagó — pero nadie empuja a los morosos.
- *Solución:* botón "Recordar" por miembro pendiente (dispara notificación interna + WhatsApp vía servicio-notificaciones) con cooldown de 24h.

**282. Aislar el simulador de pago de desarrollo**
- *Contexto:* `POST /pagos/simular-exito/{reservaId}` ya está tras `@Profile("!prod")` — bien; falta que el front no muestre rastros del botón simular en builds de producción.
- *Solución:* gate por `process.env.NODE_ENV !== 'production'` + variable explícita `NEXT_PUBLIC_ENABLE_DEV_PAY` para evitar sorpresas en demos.

**283. Schema Zod para el formulario de reserva**
- *Contexto:* `reservation-form-dialog.tsx` valida a mano; el backend exige `@FutureOrPresent` y rango válido.
- *Solución:* `reserva-schema.ts` (fechaInicio ≥ hoy, fechaFin > inicio, duración mínima según período) espejando las reglas del backend — errores idénticos en ambos lados.

**284. Selector de fechas con disponibilidad real**
- *Contexto:* el calendario de reserva permite elegir fechas ya ocupadas y el error llega del backend.
- *Solución:* alimentar `react-day-picker` con `GET /propiedades/{id}/calendario` y deshabilitar (`disabled` ranges) los días ocupados — prevención en vez de error.

**285. Flujo claro de reserva por habitación**
- *Contexto:* con `gestionPorHabitacion`, la reserva lleva `habitacionId` opcional — auditar que el usuario entienda QUÉ habitación está reservando.
- *Solución:* paso previo de selección de habitación (cards con precio/piso/foto) cuando aplique; el resumen del checkout siempre nombra la habitación.

**286. Confirmaciones multicanal de reserva**
- *Contexto:* los eventos Kafka ya generan notificaciones internas; auditar si el WhatsApp del estudiante recibe la confirmación de pago/aprobación.
- *Solución:* plantillas de WhatsApp para los 3 hitos (solicitada/aprobada/pagada) vía servicio-notificaciones, con resumen y link directo.

**287. Página de checkout dedicada**
- *Contexto:* todo el flujo vive en un dialog — poco espacio para desglose, términos y confianza.
- *Solución:* `/checkout/[reservaId]`: resumen de propiedad + fechas + desglose (ítem 274) + política de cancelación + botón de pago; el dialog queda para el paso inicial de fechas.

**288. Calculadora de reembolso al cancelar**
- *Contexto:* la política (FLEXIBLE/MODERADA/ESTRICTA) determina el reembolso, pero el usuario cancela a ciegas.
- *Solución:* en el dialog de cancelación: "Si cancelas hoy recibes S/ X (70%)" calculado con `lib/politica-cancelacion.ts` + fechas de la reserva.

**289. Estado del reembolso visible**
- *Contexto:* el backend tiene `RefundService` con eventos REFUND_COMPLETADO/FALLIDO — el estudiante no ve nada de eso.
- *Solución:* estado "Reembolso en proceso / completado" en la card de reserva cancelada, alimentado por las notificaciones del evento Kafka existente.

**290. Aceptación de términos en el checkout**
- *Contexto:* el pago se hace sin aceptar condiciones de la transacción (cancelación, comisión).
- *Solución:* checkbox con resumen de la política aplicable antes del botón de pago + timestamp guardado (complementa el ítem 185).

**291. Indicador de progreso del checkout**
- *Contexto:* el flujo fechas → aprobación → pago → confirmación no se visualiza como proceso.
- *Solución:* stepper compacto arriba del checkout (Solicitud ✓ → Aprobación ✓ → Pago ● → Confirmación) usando el componente del ítem 70.

**292. Sistema de cupones de descuento**
- *Contexto:* no existe — útil para lanzamiento ("CACHIMBO2026: primera comisión gratis").
- *Solución:* input de cupón en el checkout; backend: entidad cupón (código, tipo, vigencia, usos) que ajuste la preferencia de MP — feature de marketing completa.

**293. Métodos de pago comunicados**
- *Contexto:* MP acepta Yape, tarjetas y PagoEfectivo, pero el usuario no lo sabe hasta llegar a MP.
- *Solución:* fila de logos de métodos aceptados en el checkout y en el detalle de propiedad ("Paga con Yape") — Yape es EL método del público objetivo.

**294. Recordatorio de cuota próxima (G2)**
- *Contexto:* las cuotas mensuales vencen sin aviso proactivo.
- *Solución:* notificación interna + WhatsApp 3 días antes del vencimiento (job programado en backend sobre las cuotas) con link de pago directo.

**295. Preview del contrato antes de firmar**
- *Contexto:* firmar (ítem 237) sin leer es mala práctica; abrir el PDF fuera rompe el flujo.
- *Solución:* `react-pdf` para renderizar el contrato dentro del dialog de firma con scroll obligatorio hasta el final antes de habilitar "Firmar".

**296. Estado de firma de ambas partes**
- *Contexto:* el contrato lo firman estudiante y arrendador; nadie ve quién falta.
- *Solución:* doble indicador ("Tú: firmado ✓ · Arrendador: pendiente") en el detalle de la reserva, con recordatorio enviable.

**297. Guía post-pago "¿Qué sigue?"**
- *Contexto:* tras pagar, la página de éxito solo enlaza a reservas — momento ideal para orientar.
- *Solución:* checklist en la página de éxito: contactar al arrendador (link al chat), coordinar mudanza, descargar contrato — convierte un final en un comienzo.

**298. Encuesta NPS post-transacción**
- *Contexto:* no se mide satisfacción en el momento de mayor señal.
- *Solución:* widget de 1 pregunta (0-10 + comentario opcional) al cerrar la página de éxito, guardado en backend simple; dashboard admin lo agrega después.

**299. Errores de MercadoPago traducidos**
- *Contexto:* los rechazos de MP llegan con códigos crípticos (`cc_rejected_insufficient_amount`).
- *Solución:* mapa de códigos → mensajes accionables ("Tu tarjeta no tiene fondos suficientes — intenta con otra o con Yape") en `pago/fallo`.

**300. Accesibilidad de las páginas de pago**
- *Contexto:* los resultados de pago cambian estado dinámicamente (polling) sin anunciarlo.
- *Solución:* `role="status"` + `aria-live="polite"` en el mensaje principal, foco al heading al aterrizar, y textos que no dependan solo del color del icono.

---

## Sección 10 · Panel del arrendador (301–350)

**301. Unificar el tema del perfil del arrendador**
- *Contexto:* `landlord/profile/page.tsx` está entero en tema oscuro slate (`bg-slate-800`, `text-white`) — la ÚNICA página así en un panel claro; parece de otra app.
- *Solución:* migrarla a tokens (`bg-card`, `text-foreground`) para que respete light/dark como el resto del panel.

**302. Quitar el gradiente violeta de los botones de validación**
- *Contexto:* los botones "Validar DNI/RUC" del perfil usan `from-primary to-violet-600` — un gradiente que no existe en ninguna otra parte.
- *Solución:* botón primario estándar; si se quiere énfasis, la variante con icono de verificación basta.

**303. Sidebar del arrendador con tokens**
- *Contexto:* `landlord-sidebar.tsx` usa fondo hex `#0b1222`; globals.css ya define tokens de sidebar sin usar aquí.
- *Solución:* migrar a `bg-sidebar`/`text-sidebar-foreground` — un solo lugar para cambiar el look de todas las sidebars.

**304. Erradicar `#8f0304` de los charts**
- *Contexto:* el hex de marca está copiado a mano en `IngresosChart.tsx`, `VistasChart.tsx`, `finances/monthly`, `dashboard` y `analytics` — cambiar la marca implicaría tocar 6 archivos.
- *Solución:* paleta de charts centralizada `lib/chart-colors.ts` que lea las CSS vars (`getComputedStyle` o valores espejo), consumida por todos los Recharts.

**305. Badge "Socio Verificado" real**
- *Contexto:* el subtítulo del sidebar dice "Socio Verificado" fijo, esté verificado o no.
- *Solución:* derivarlo del estado real de verificación (RUC + documentos) con 3 variantes: Sin verificar / En revisión / Verificado ✓.

**306. Eliminar los fallbacks "Socio AlquilaYa" / "CA"**
- *Contexto:* si el perfil tarda en cargar, el sidebar muestra nombre e iniciales inventados.
- *Solución:* skeleton mientras carga y luego datos reales del auth-store; nunca placeholder con apariencia de dato.

**307. "Tip del día" dinámico**
- *Contexto:* el dashboard muestra un tip fijo ("40% más de reservas") hardcodeado — se nota a la segunda visita.
- *Solución:* pool de tips rotativos servidos desde el catálogo BANNER, o mejor: tips derivados de la analítica real ("Tus fotos tienen 3× menos vistas que el promedio de tu zona").

**308. Búsqueda, filtros y orden en "Mis propiedades"**
- *Contexto:* `properties/active` renderiza todas las tarjetas sin búsqueda, filtro por estado, orden ni paginación.
- *Solución:* barra con búsqueda por título, chips de estado (Pendiente/Aprobada/Rechazada/Activa) y orden (recientes, más vistas, mejor precio); paginar si >12.

**309. Quitar estilos inline de Editar/Eliminar**
- *Contexto:* los botones usan `style={{ background: '#1e3a5f' }}` y `#dc2626` inline — invisibles al sistema de temas.
- *Solución:* variantes shadcn (`outline` y `destructive`) — de paso avanza la migración del ítem 41.

**310. Eliminar la ruta placeholder `properties/edit`**
- *Contexto:* es un `WIPPage` ("Estamos trabajando en esto") no enlazado; la edición real vive en `EditPropertyModal`.
- *Solución:* borrar la ruta muerta — o mejor, usarla de verdad (ítem 311).

**311. Edición como página en vez de mega-modal**
- *Contexto:* `EditPropertyModal` tiene 3 tabs, RoomManager, temporadas y galería — demasiado para un modal (scroll interno, sin URL, sin deep-link).
- *Solución:* mover la edición a `/landlord/properties/[id]/edit` reutilizando las secciones del form de `add` (ya están modularizadas en archivos separados); el modal queda para ediciones rápidas de precio/disponibilidad.

**312. Resolver las rutas huérfanas `details/rules` y `details/services`**
- *Contexto:* funcionan pero NADIE las enlaza (solo `details/gallery` es alcanzable desde el modal) — duplican los tabs del modal de edición.
- *Solución:* eliminarlas y consolidar en la página de edición del ítem 311; menos superficies que mantener.

**313. Catálogos dinámicos en reglas y servicios**
- *Contexto:* `details/rules|services` usan `REGLAS_CATALOGO`/`SERVICIOS_CATALOGO` hardcodeados de `types/propiedad` mientras el form de `add` ya consume el catálogo del backend.
- *Solución:* una sola fuente: el catálogo del backend con fallback — así los ítems que el admin agregue aparecen en todas partes.

**314. Conectar los contratos al backend real**
- *Contexto:* `reservations/contracts` deriva contratos client-side de reservas PAGADA/FINALIZADA con estado INVENTADO (`firmado`/`expirado`), y el front cree que "no hay endpoint" — pero el backend SÍ tiene `GET /reservas/{id}/contrato` (PDF) y `POST /contrato/firmar`.
- *Solución:* añadir ambos al `reservation-service`, mostrar el estado real de firma y habilitar la descarga del PDF — la nota legal hardcodeada por fin será cierta.

**315. Implementar el botón "Ver detalle" muerto**
- *Contexto:* en `contracts` (línea ~163) y en el tab Contratos de `history`, "Ver detalle" no tiene `onClick`.
- *Solución:* abrir un panel con datos de la reserva + contrato PDF embebido (ítem 295) + estado de firmas; nunca dejar botones sin acción.

**316. Eliminar la duplicación contratos/history**
- *Contexto:* `reservations/history` incluye un tab "Contratos" idéntico a la página `contracts` — dos rutas para lo mismo, con el mismo botón muerto.
- *Solución:* una sola pantalla de contratos (la página) y quitar el tab duplicado del historial.

**317. Estado de firma real del contrato**
- *Contexto:* consecuencia de 314: el estado `firmado/expirado` se inventa en el cliente.
- *Solución:* leer del backend quién firmó y cuándo; badge con doble indicador (ítem 296 espejo del lado estudiante).

**318. `fechaPago` real en finanzas**
- *Contexto:* `finances/monthly` reconoce en comentario que agrupa por `fechaInicio` como aproximación porque el DTO no trae la fecha del pago.
- *Solución:* backend: exponer `fechaPago` en el DTO de reserva/pago; front: agrupar por la fecha real — los números mensuales dejarán de mentir.

**319. Exportar finanzas a CSV/Excel**
- *Contexto:* los arrendadores llevan su contabilidad fuera; hoy solo pueden transcribir la tabla.
- *Solución:* botón "Exportar" (CSV generado client-side, o `xlsx` para formato) con las columnas de la tabla + resumen del período.

**320. Filtros de fechas y propiedad en finanzas**
- *Contexto:* `monthly` y `per-room` muestran todo el histórico sin acotar.
- *Solución:* `DateRangePicker` con presets (Este mes / Trimestre / Año) + select de propiedad; los charts y tablas obedecen ambos.

**321. Gráfico de ocupación**
- *Contexto:* el endpoint del dashboard ya devuelve `tasaOcupacion` pero no hay visualización histórica.
- *Solución:* área chart de ocupación mensual (%) junto a ingresos — la correlación precio/ocupación es LA decisión del arrendador.

**322. Deltas de tendencia en las StatCards**
- *Contexto:* el endpoint devuelve ingresos del mes actual Y anterior, pero las cards no muestran comparación.
- *Solución:* delta "+12% vs. mes pasado" con flecha y color semáforo en las 4 StatCards (el `StatCard` unificado del ítem 44 ya trae `delta`).

**323. Onboarding del arrendador nuevo**
- *Contexto:* un arrendador recién registrado aterriza en un dashboard vacío sin guía.
- *Solución:* checklist tipo el del estudiante: Verificar RUC → Completar perfil → Publicar primera propiedad → Configurar disponibilidad, con barra de progreso y links directos.

**324. Countdown de reservas aprobadas sin pagar**
- *Contexto:* el arrendador aprueba y espera; no ve cuánto falta para que la reserva expire (horas configurables por el admin).
- *Solución:* countdown en la `ReservationCard` de aprobadas ("El estudiante tiene 22h para pagar") — espejo del ítem 238.

**325. Calendario de ocupación por propiedad**
- *Contexto:* las reservas se listan como cards; no hay vista de calendario para planear.
- *Solución:* vista mensual (`react-day-picker` multi-mes o FullCalendar) con las reservas pintadas por estado y tooltips — pestaña "Calendario" en reservas.

**326. Pantalla "Mis desembolsos" (G1)**
- *Contexto:* el backend expone `GET /pagos/arrendador/desembolsos` (self-service) pero NO hay UI — el arrendador no sabe cuándo cobra.
- *Solución:* página en finanzas: tabla de desembolsos (pendiente/procesado/fallido, monto, fecha) + explicación del proceso admin-mediado v1.

**327. Visibilidad de depósitos de garantía (G3)**
- *Contexto:* `GET /pagos/admin/depositos/arrendador/{id}` existe pero es admin-only; el arrendador no ve las garantías de sus inquilinos.
- *Solución:* backend: permitir la consulta self-service; front: estado del depósito por reserva con acciones de solicitud (retener parcial con evidencia).

**328. Badge de publicación programada en activas**
- *Contexto:* la programación existe en drafts, pero una vez programada, la propiedad no comunica su fecha en ningún otro lado.
- *Solución:* badge "Se publica el {fecha}" en la card + acción de cancelar programación sin ir a borradores.

**329. Sparklines de vistas en las cards de propiedades**
- *Contexto:* para ver el rendimiento de cada propiedad hay que entrar una por una a su analítica.
- *Solución:* mini-sparkline (vistas 7d) en cada card de `properties/active` con Recharts `LineChart` minimal (60×20px) — panorama en un vistazo.

**330. Ranking comparativo de propiedades**
- *Contexto:* un arrendador con varias propiedades no puede compararlas.
- *Solución:* tabla en analítica: propiedad × (vistas, favoritos, contactos, reservas, conversión) ordenable — identifica qué anuncio necesita ayuda.

**331. Precio sugerido también al editar**
- *Contexto:* `obtenerPrecioSugerido` solo se consulta al crear; el mercado cambia.
- *Solución:* mostrar el rango sugerido junto al campo precio en edición, con aviso si el precio actual se sale ("Estás 25% sobre la zona").

**332. Convertir el form de publicar en wizard multi-paso**
- *Contexto:* `properties/add` es una página única larguísima (5 secciones + sidebar) — intimidante en móvil.
- *Solución:* las secciones ya están modularizadas: envolverlas en el Stepper (ítem 70) con validación por paso y el autosave existente (`useDraft`) — en desktop puede mantenerse el layout actual con scroll-spy.

**333. Elevar el límite de fotos**
- *Contexto:* máximo 6 fotos; los anuncios buenos necesitan 10–15 (Airbnb sugiere mínimo 8).
- *Solución:* subir a 12 (constante compartida front/back), manteniendo la validación de 10MB y resolución mínima que ya existe.

**334. Fotos por habitación en RoomManager**
- *Contexto:* con gestión por habitación, cada cuarto se describe solo con texto — el estudiante reserva a ciegas (ítem 167 espejo).
- *Solución:* mini-galería por habitación en el RoomManager (backend: imágenes asociadas a habitación).

**335. Tematizar el chat del arrendador**
- *Contexto:* `messages/students` clona WhatsApp con colores hardcodeados (`bg-[#d9fdd3]`, `bg-[#efeae2]`) — en dark mode debe verse mal.
- *Solución:* mapear a tokens (burbuja propia = `primary/10`, fondo = `muted`) conservando la familiaridad sin el hardcode.

**336. Resumen de categorías desde el backend**
- *Contexto:* `messages/reviews` calcula las medias por categoría client-side cuando el backend ya expone `GET /resenas/propiedad/{id}/resumen`.
- *Solución:* consumir el endpoint (consistencia con lo que ve el estudiante) y eliminar el cálculo duplicado.

**337. Notificación de nueva reseña con CTA**
- *Contexto:* el arrendador se entera de reseñas nuevas solo si entra a la sección.
- *Solución:* el evento Kafka de reseñas ya existe → notificación "Nueva reseña de 4★ en {propiedad}" con link directo al form de respuesta (responder rápido sube la percepción pública, ítem 148).

**338. Zod en el perfil del arrendador**
- *Contexto:* el perfil valida a mano (DNI, RUC, teléfono) — sin schema como los del estudiante.
- *Solución:* `landlord-profile-schema.ts` con RUC de 11 dígitos empezando en 10/15/16/17/20, DNI 8, teléfono `+51 9…` — reutilizando refinamientos del auth-schema.

**339. Guard de cambios sin guardar en el perfil**
- *Contexto:* `EditPropertyModal` ya protege con `beforeunload`, pero el perfil no — se pierden ediciones al navegar.
- *Solución:* hook `useUnsavedChanges(isDirty)` compartido (usa el `isDirty` de RHF tras el ítem 338) aplicado a perfil y formularios largos.

**340. Página de estado de verificación**
- *Contexto:* existe la carpeta vacía `landlord/verification/` (solo `.gitkeep`) — la intención estaba, la página no.
- *Solución:* implementarla: estado de DNI (RENIEC), RUC (SUNAT) y documentos con el Timeline del ítem 69, o eliminar la carpeta.

**341. Una sola copia del mapper de iconos**
- *Contexto:* `FA_TO_MATERIAL` está TRIPLICADO: `edit-property-modal.tsx`, `CatalogosTable.tsx` y `room-manager.tsx` (más la del dashboard estudiante).
- *Solución:* consolidar en `lib/icons.ts` ya (aunque el ítem 19 lo vaya a eliminar después) — cuatro copias divergirán sí o sí.

**342. Virtualizar conversaciones largas**
- *Contexto:* el chat renderiza todos los mensajes cargados; con historiales largos el DOM crece sin límite.
- *Solución:* `@tanstack/react-virtual` en la lista de mensajes (compatible con el scroll infinito del ítem 253).

**343. Notificaciones del arrendador con paridad**
- *Contexto:* `messages/notifications` es simple; le faltan la agrupación por día y paginación que se proponen para el estudiante.
- *Solución:* compartir el MISMO componente de lista de notificaciones entre ambos paneles (hoy hay dos implementaciones).

**344. Selector global de propiedad activa**
- *Contexto:* un arrendador multi-propiedad filtra mentalmente todo (mensajes, reservas, finanzas) por propiedad.
- *Solución:* select de propiedad en el header del panel que actúe como filtro global persistente (query param compartido) — patrón "workspace switcher".

**345. Vista previa del anuncio publicado**
- *Contexto:* el arrendador nunca ve su anuncio como lo ve el estudiante (además el proxy le bloquea las rutas públicas — ítem 102).
- *Solución:* botón "Ver como estudiante" en la card que abra `/property/{id}` (permitido tras el ítem 102) o un preview modal con el layout público real.

**346. Score de calidad del anuncio**
- *Contexto:* nada motiva a completar video, más fotos o mejor descripción.
- *Solución:* checklist puntuado (fotos ≥8: 20pts, descripción ≥200 chars: 15pts, video: 15pts, servicios: 10pts…) con barra y "Los anuncios completos reciben 3× más contactos" — gamificación con datos del ítem 330.

**347. Duplicar propiedad**
- *Contexto:* publicar la segunda habitación de la misma casa implica rellenar TODO de nuevo.
- *Solución:* acción "Duplicar" en la card que cree un borrador con todos los campos copiados (menos fotos) listo para ajustar.

**348. Motivo de rechazo visible y reenvío**
- *Contexto:* una propiedad RECHAZADA muestra el badge pero no por qué ni cómo corregir.
- *Solución:* mostrar el motivo del admin en la card (viene del flujo de rechazo) + CTA "Corregir y reenviar" que abra la edición y re-someta a revisión.

**349. Panel del arrendador responsive**
- *Contexto:* la sidebar fija está pensada para desktop; el arrendador también gestiona desde el celular.
- *Solución:* colapsar a drawer (Sheet) bajo `lg`, con bottom-nav de 4 accesos (Dashboard/Propiedades/Mensajes/Reservas) como ya tiene el estudiante.

**350. Exportar reservas a CSV**
- *Contexto:* el historial de reservas (con filtros y paginación client-side) no se puede extraer.
- *Solución:* botón exportar respetando los filtros activos — mismas utilidades del ítem 319.

---

## Sección 11 · Panel del admin (351–390)

**351. Implementar "Alertas del sistema" (placeholder EN el menú)**
- *Contexto:* `alerts/page.tsx` es un "Módulo en desarrollo" pero es el ÚNICO placeholder enlazado en el nav del admin — click garantizado a una pantalla vacía.
- *Solución:* implementarla con datos que YA existen: propiedades pendientes >48h, denuncias PENDIENTE, documentos KYC sin revisar, pagos fallidos y eventos `user-security-events` de Kafka — o sacarla del nav hasta entonces.

**352. Cablear los 3 dashboards huérfanos**
- *Contexto:* `NetworkMetricsDashboard.tsx`, `PropertyHeatmap.tsx` y `SystemHealthDashboard.tsx` están CONSTRUIDOS en `components/admin/` pero las páginas `metrics/network|heatmap|system` son placeholders — trabajo terminado sin conectar.
- *Solución:* importarlos en sus páginas, conectarlos a datos reales (o marcarlos demo) y devolver las rutas al nav — victoria rápida de alto impacto visual.

**353. Dashboard de métricas real**
- *Contexto:* `metrics/page.tsx` es placeholder, pero los datos existen dispersos: `/pagos/admin/resumen`, conteos de usuarios, propiedades pendientes.
- *Solución:* componer el dashboard con lo disponible (Recharts ya domina el proyecto): usuarios por rol, reservas del mes, ingresos/comisiones, embudo global.

**354. Endpoint agregado de métricas admin**
- *Contexto:* el dashboard del ítem 353 requeriría 5+ llamadas desde el cliente.
- *Solución:* backend `GET /admin/metricas` que agregue (usuarios por rol/estado, propiedades por estado, reservas del mes, GMV) con cache de 5 min — una llamada, un dashboard.

**355. Eliminar `validations/page.tsx` legacy (PELIGROSO)**
- *Contexto:* duplica la revisión de documentos con `fetch()` crudo SIN el cliente `api` (sin cookies/refresh), `prompt()` para motivos, `alert()` para errores y una paleta propia (`#281721`, `#bda5a8`) — código muerto que aún funciona a medias.
- *Solución:* borrar el archivo; `validations/providers` ya cubre todo con 3 tabs bien hechas.

**356. Stats mock mostradas como reales en revisión (18/5)**
- *Contexto:* `properties/to-review` muestra "Aprobadas hoy: 18" y "Rechazadas semana: 5" hardcodeados con comentario "Mock value for visual context" — un admin toma decisiones viendo datos falsos.
- *Solución:* contadores reales (backend: registrar decisiones de moderación, ítem 366) o eliminar esas cards; NUNCA números inventados en un panel de administración.

**357. Media de reseñas falsa (4.8) y mal calculada**
- *Contexto:* `reviews/page.tsx` hace fallback a "4.8" mock sin datos y calcula la media SOLO con la página actual de resultados.
- *Solución:* traer el agregado global del backend (avg + total) en la respuesta paginada de `/resenas/admin/propiedad` y quitar el fallback.

**358. Links directos a la propiedad desde reseñas**
- *Contexto:* "Inmueble #{targetId}" enlaza al listado genérico de revisión, no a la propiedad concreta.
- *Solución:* enlazar a `/property/{id}` (vista pública) o al drawer de revisión con el id — el contexto es esencial para moderar.

**359. Pedir motivo al rechazar propiedades**
- *Contexto:* el rechazo en `to-review` NO pide motivo, mientras validaciones y moderación sí lo hacen — y el arrendador necesita saber qué corregir (ítem 348).
- *Solución:* modal con motivos del catálogo `MOTIVO_RECHAZO` + texto libre, persistido y visible para el arrendador.

**360. Quitar el `console.log` de debug en producción**
- *Contexto:* `UserDirectoryTable.tsx` línea 25 imprime `📊 [DEBUG ADMIN]...` con datos de usuarios en la consola.
- *Solución:* eliminarlo + regla ESLint `no-console` (allow `warn`/`error`) para que no vuelva.

**361. Reemplazar `alert()`/`confirm()` en el directorio de usuarios**
- *Contexto:* `UserDirectoryTable` usa `alert()` para errores y `window.confirm` para acciones destructivas (banear/eliminar); `system/roles` también tiene un `alert()`.
- *Solución:* `notify.error` + el `useConfirm()` del ítem 63 — bloqueante nativo fuera de un panel serio.

**362. Paginación, filtros y orden en el directorio**
- *Contexto:* `UserDirectoryTable` (students/providers/staff) solo busca por nombre/correo — sin paginar, filtrar por estado ni ordenar (con cientos de usuarios será inusable; el backend tampoco pagina, ítem 487).
- *Solución:* migrarla al `DataTable` de TanStack (ítem 47): paginación server-side, filtro por estado (activo/baneado/pendiente), orden por fecha de registro.

**363. Unificar las dos UIs de arrendadores**
- *Contexto:* `clients/providers` (directorio solo-lectura con banner que redirige) y `validations/providers` (gestión completa) se pisan — dos lugares para lo mismo.
- *Solución:* una sola pantalla de arrendadores con tabs (Directorio / Documentos / Historial) fusionando ambas; redirect 301 de la vieja.

**364. Historial de validaciones persistente**
- *Contexto:* el tab "Historial" de `validations/providers` es un estado de React en memoria — se borra al recargar la página.
- *Solución:* persistirlo en backend (el audit log ya existe para deletes de usuarios — extenderlo a decisiones de documentos) y consumirlo paginado.

**365. Conectar la auditoría real**
- *Contexto:* `system/audit` es placeholder, pero el backend YA audita (borrado de usuarios con audit log).
- *Solución:* backend: endpoint paginado del audit log con filtros (actor, acción, fecha); front: tabla con diff de cambios — trazabilidad de acciones admin, indispensable con RBAC.

**366. Historial de decisiones sobre propiedades**
- *Contexto:* `properties/history` es placeholder; las decisiones de aprobar/rechazar no quedan consultables.
- *Solución:* registrar cada decisión (quién, cuándo, motivo) al aprobar/rechazar y listarla aquí — alimenta también los contadores reales del ítem 356.

**367. Decidir el destino de reports/pending y active-bans**
- *Contexto:* dos placeholders no enlazados ("Módulo en desarrollo") que siguen alcanzables por URL.
- *Solución:* implementar "Baneos activos" (listado de usuarios BANNED con motivo y acción de reactivar — los datos existen) y eliminar `pending` si `listings` ya lo cubre.

**368. Conectar payouts al backend que YA existe**
- *Contexto:* `finance/payouts` es placeholder y el reporte del front dice "backend tampoco lo soporta" — FALSO: `DesembolsoController` expone pendientes, generar, marcar procesado/fallido; falta solo agregarlo a `pago-service.ts`.
- *Solución:* implementar la pantalla: tabla de desembolsos pendientes por arrendador → generar → marcar procesado/fallido con evidencia — cierra el ciclo del dinero.

**369. Panel de depósitos de garantía (G3)**
- *Contexto:* `DepositoController` está completo (crear, capturar, devolver, retener parcial, perder) y NINGUNA UI lo consume.
- *Solución:* pantalla en finanzas admin: depósitos por reserva con acciones y confirmación de montos — mientras no exista, la feature entera es letra muerta.

**370. Botón de reconciliación de pagos**
- *Contexto:* `POST /pagos/admin/reconciliar/{reservaId}` (G5, contra MercadoPago) existe sin UI — se usaría por curl en un incidente.
- *Solución:* acción "Reconciliar con MP" en el detalle de pagos problemáticos, mostrando el resultado (estado MP vs. local) en un panel de diff.

**371. Generador de cronogramas de cuotas (G2)**
- *Contexto:* `POST /reservas/{reservaId}/cuotas/generar` es ADMIN-only y sin UI.
- *Solución:* en el detalle de reserva admin: botón "Generar cronograma" con preview de las cuotas (meses, montos) antes de confirmar.

**372. Unificar la paleta del admin**
- *Contexto:* el admin usa un rojo propio `#c14b4c` hardcodeado por todas partes + clases `admin-*` (`bg-admin-surface`) — una TERCERA paleta junto a la de marca y la legacy.
- *Solución:* decidir: si el admin debe verse distinto (razonable), definir tokens `--admin-*` en globals.css y migrar los hex; si no, usar los tokens estándar.

**373. Sidebar del admin con tokens**
- *Contexto:* `AdminSidebar.tsx` usa fondo `#0b0f19` hex, hermano del problema del ítem 303.
- *Solución:* mismos tokens de sidebar — ambas sidebars comparten sistema, cada una puede tener su acento.

**374. Quitar "Jhon"/"JD"/"God View" hardcodeados**
- *Contexto:* el sidebar del admin tiene el nombre del desarrollador como fallback y una etiqueta fija "God View".
- *Solución:* datos reales del admin logueado + etiqueta según rol RBAC real ("Super Admin" / rol custom); los easter eggs personales fuera del código.

**375. Estados reales en la cola de revisión del dashboard**
- *Contexto:* la tabla del dashboard admin pinta `StatusBadge` con estado fijo "PENDIENTE" para todas las filas.
- *Solución:* mapear el estado real de cada propiedad al badge (el dato ya viene en la respuesta).

**376. Datos reales en las stats de denuncias**
- *Contexto:* `reports/listings` muestra "Urgencia: Alta" hardcodeado y "Por Revisar: —" salvo en un filtro.
- *Solución:* backend: conteos por estado en la respuesta paginada; front: severidad real calculada (denuncias repetidas sobre la misma propiedad = alta).

**377. Búsqueda global del admin (Ctrl+K)**
- *Contexto:* encontrar UN usuario o propiedad implica navegar a la sección + buscar en la tabla.
- *Solución:* el command palette (ítem 49) en modo admin: busca usuarios (nombre/DNI/correo) y propiedades (título/id) con navegación directa al detalle.

**378. Campana de notificaciones del admin**
- *Contexto:* el admin no recibe avisos de eventos que requieren acción (denuncia nueva, documento subido, propiedad pendiente).
- *Solución:* reutilizar el sistema de notificaciones existente (servicio-mensajeria ya consume los topics de Kafka) creando notificaciones para rol ADMIN en los eventos accionables.

**379. "Ver como usuario" (impersonación auditada)**
- *Contexto:* para diagnosticar el problema de un usuario, el admin no tiene forma de ver lo que él ve.
- *Solución:* impersonación de solo-lectura con banner rojo permanente "Viendo como {usuario}" + registro en el audit log; backend emite un token de impersonación de corta vida.

**380. Exportar CSV en todas las tablas admin**
- *Contexto:* usuarios, denuncias, reseñas y finanzas no se pueden extraer para reportes.
- *Solución:* el `DataTable` genérico (ítem 47) incluye exportación CSV de la vista filtrada — se hereda gratis en todas las tablas migradas.

**381. Campañas de notificación a estudiantes**
- *Contexto:* `marketing/notifications/students` es placeholder; el canal WhatsApp ya existe (servicio-notificaciones).
- *Solución:* form de campaña (segmento: rol/carrera/estado + mensaje + programación) → backend: endpoint de broadcast que encole por lotes al servicio de notificaciones, con vista previa y conteo estimado.

**382. Decidir "Premium" o eliminarlo**
- *Contexto:* `marketing/premium` es placeholder sin modelo de negocio detrás (destacados de pago no existen en backend).
- *Solución:* si el roadmap lo incluye: campo `destacadaHasta` en propiedad + orden preferente en búsqueda + cobro vía MP; si no, borrar la ruta — un panel serio no tiene puertas a la nada.

**383. Consolidar tarifas de zona**
- *Contexto:* `catalog/zones/prices` es placeholder, pero el editor de zonas (`zones/edit/[id]`) YA edita tarifas de comisión por zona.
- *Solución:* eliminar `prices` y añadir una columna "Comisión" en la tabla de universidades/zonas como vista resumen — la edición vive donde ya funciona.

**384. Búsqueda por contenido en moderación de mensajes**
- *Contexto:* `moderation` filtra por estado/participante pero no por texto ("busca quién compartió números de cuenta").
- *Solución:* backend: filtro `q` con ILIKE sobre el contenido paginado; front: input de búsqueda en el panel — herramienta antifraude básica.

**385. Acciones sobre cuentas duplicadas**
- *Contexto:* `clients/duplicates` detecta duplicados (backend #8) pero solo permite banear/activar — no hay "marcar como revisado" ni fusión.
- *Solución:* fase 1: estado "revisado — no es duplicado" persistido para limpiar la lista; fase 2: fusión de cuentas (migrar favoritos/reservas y desactivar la vieja) — backend nuevo.

**386. Gráfica de crecimiento de usuarios**
- *Contexto:* no hay serie temporal de registros — imposible ver tracción (clave para la sustentación del proyecto).
- *Solución:* backend: `GET /admin/metricas/registros?desde=&hasta=` agrupado por semana; front: área chart con anotaciones de hitos (lanzamiento, campañas).

**387. Confirmaciones tipadas para acciones críticas de RBAC**
- *Contexto:* `system/roles` permite quitar permisos con un toggle instantáneo — quitarse a sí mismo `ADMIN_PANEL` puede dejarte fuera.
- *Solución:* AlertDialog al desactivar permisos críticos + guard en backend que impida remover el último admin; el texto marketing hardcodeado ("se sincronizan instantáneamente…") se reemplaza por la descripción real del permiso.

**388. Preview de documentos KYC con zoom y PDF**
- *Contexto:* la revisión de documentos muestra imágenes planas; los PDF (permitidos al subir) no tienen preview.
- *Solución:* visor con zoom/rotación para imágenes (`react-medium-image-zoom` o lightbox del ítem 143) y `react-pdf` para PDFs, lado a lado con los datos declarados para comparar.

**389. Mapa de propiedades para el admin**
- *Contexto:* `PropertiesMap` existe en shared pero el admin no tiene vista geográfica del inventario (útil para detectar zonas saturadas o propiedades con coordenadas absurdas).
- *Solución:* pestaña "Mapa" en propiedades admin con pins coloreados por estado (pendiente/aprobada/rechazada) y click → drawer de revisión.

**390. Eliminar los mocks huérfanos**
- *Contexto:* `mocks/admin.ts` (con el typo "Nuevaaaa reserva") y `mocks/landlord.ts` (`LANDLORD_CONTRACTS`, `LANDLORD_REVIEWS`) ya no los importa ninguna página real.
- *Solución:* borrarlos (quedan en git si hacen falta); si se quiere conservar el modo demo, moverlos tras el flag `NEXT_PUBLIC_USE_MOCKS` como los de propiedades.

---

## Sección 12 · Accesibilidad (391–415)

**391. Auditoría automatizada con axe-core**
- *Contexto:* no hay verificación de accesibilidad en el flujo de desarrollo; los gaps encontrados (labels, aria) se repetirán.
- *Solución:* `@axe-core/react` en desarrollo (loguea violaciones en consola) + chequeos axe en los tests E2E de Playwright (ítem 475) para las páginas clave.

**392. Labels en TODOS los inputs**
- *Contexto:* reset-password (contraseña y confirmación) y verify-email (correo y código) usan solo placeholder.
- *Solución:* barrido con el patrón `FormField` (ítem 71); regla: ningún input sin `<Label htmlFor>` asociado, ni siquiera con placeholder "obvio".

**393. `aria-current` en la navegación**
- *Contexto:* las sidebars (student/landlord/admin) y la bottom-nav resaltan la ruta activa solo con color.
- *Solución:* `aria-current="page"` en el link activo de cada nav — gratis y esencial para lectores de pantalla.

**394. Link "Saltar al contenido"**
- *Contexto:* usuarios de teclado deben tabular toda la navbar/sidebar antes de llegar al contenido.
- *Solución:* skip-link oculto que aparece con foco (`sr-only focus:not-sr-only`) al inicio del layout, apuntando a `<main id="contenido">`.

**395. Foco visible en todos los interactivos**
- *Contexto:* refuerzo del ítem 12 como criterio de accesibilidad: varios botones custom y cards clickeables no muestran foco.
- *Solución:* verificación página por página tabulando; las cards-link necesitan `focus-visible:ring` en el contenedor.

**396. Focus trap correcto en overlays**
- *Contexto:* `ui/modal.tsx` custom no atrapa el foco (Radix sí) — hasta completar el ítem 42, hay modales escapables por Tab.
- *Solución:* completar la migración a Radix; verificar también el drawer de revisión del admin y el sheet de filtros.

**397. `alt` descriptivo en fotos de propiedades**
- *Contexto:* auditar los alt de `PropertyCard`/galería — un alt genérico ("propiedad") no sirve.
- *Solución:* patrón `alt={\`${titulo} — ${tipoPropiedad} en ${zona}\`}` para la principal y `Foto {n} de {titulo}` en la galería.

**398. Validar contraste AA del dark mode**
- *Contexto:* los tokens dark tienen notas de contraste "WCAG AA" en globals.css pero sin verificación tooling.
- *Solución:* pasar los pares fondo/texto reales por un checker (script con `wcag-contrast` npm en CI) — especialmente muted-foreground sobre muted y primary sobre card.

**399. `aria-live` para actualizaciones dinámicas**
- *Contexto:* contadores de no-leídos, resultados de búsqueda y estados de pago cambian sin anuncio.
- *Solución:* región `aria-live="polite"` para el contador de resultados de búsqueda y estados async; sonner ya maneja sus toasts.

**400. Alternativa accesible al mapa**
- *Contexto:* formalización del ítem 136: Leaflet es inaccesible por teclado en la práctica.
- *Solución:* garantizar paridad de información en la lista + `aria-hidden` en el canvas del mapa + atajo "Saltar a resultados".

**401. Respetar `prefers-reduced-motion` globalmente**
- *Contexto:* formalización del ítem 38 como requisito: animaciones actuales y futuras (motion, ken burns, confeti).
- *Solución:* helper único `useReducedMotion` + variantes `motion-reduce:` — criterio de aceptación en cada PR con animación.

**402. Objetivos táctiles de 44×44px**
- *Contexto:* chips de filtro, botones de icono en cards y controles del chat pueden quedar bajo el mínimo en móvil.
- *Solución:* auditar con DevTools (mobile) y garantizar `min-h-11 min-w-11` (44px) o padding equivalente en todo interactivo táctil.

**403. Jerarquía de encabezados correcta**
- *Contexto:* páginas con múltiples `h2`/`h3` sin `h1`, o saltos de nivel (h1→h4) — común al componer con cards.
- *Solución:* un `h1` por página (aunque sea `sr-only`), niveles consecutivos; auditar con la extensión HeadingsMap o axe.

**404. Verificar `lang` y textos mixtos**
- *Contexto:* confirmar `<html lang="es">` y marcar términos en inglés si los hubiera en la UI.
- *Solución:* revisión puntual del layout root; el copy es 100% español así que basta el atributo global.

**405. Landmarks semánticos**
- *Contexto:* los layouts usan divs; los lectores navegan por landmarks (`main`, `nav`, `aside`, `footer`).
- *Solución:* `<nav aria-label="Principal">` en sidebars, `<main>` único por página (ya existe en root — verificar los paneles), `<aside>` para el sidebar del detalle.

**406. Errores de formulario anunciados**
- *Contexto:* los mensajes de error bajo los inputs no siempre están vinculados al campo.
- *Solución:* el `FormMessage` de shadcn ya pone `aria-describedby` — garantizarlo migrando los formularios manuales (landlord/admin) al patrón (ítems 71, 338).

**407. Barrido de `aria-label` en botones icon-only**
- *Contexto:* complemento del ítem 61: compartir, favorito, cerrar, flechas de carrusel, acciones de tabla.
- *Solución:* grep de `<Button` + `size="icon"` sin `aria-label` y completar; regla de revisión de código.

**408. Anuncio de cambio de ruta**
- *Contexto:* Next incluye route announcer, pero conviene verificar que los `document.title` cambien por página para que el anuncio sea útil.
- *Solución:* asegurar `metadata.title` único por ruta (ítem 446) — el announcer lee el título nuevo.

**409. Skeletons con semántica de carga**
- *Contexto:* los skeletons son puramente visuales; el lector de pantalla no sabe que algo carga.
- *Solución:* contenedor con `aria-busy="true"` + `<span class="sr-only">Cargando resultados…</span>` en los estados de carga principales.

**410. Selects accesibles en móvil**
- *Contexto:* los Select de Radix funcionan, pero en formularios largos móviles el select nativo a veces es mejor.
- *Solución:* auditar cada uso: mantener Radix (accesible) pero verificar tamaño de opciones y scroll en pantallas chicas; el combobox (ítem 48) para listas largas.

**411. Zoom 200% sin pérdida**
- *Contexto:* WCAG exige usabilidad al 200% de zoom; layouts con alturas fijas (chat, mapas) suelen romperse.
- *Solución:* prueba manual al 200%: el chat, el sheet de filtros y las tablas admin deben seguir operables (min-height con `dvh`, scroll interno).

**412. Copy uniforme (fuera el voseo)**
- *Contexto:* `global-error.tsx` dice "Recargá la página" (voseo argentino) mientras todo el producto tutea en peruano.
- *Solución:* corregir a "Recarga la página" y hacer una pasada de consistencia de tono (tú, cercano, sin tecnicismos) — idealmente centralizando strings en `es.json` (ítem 470).

**413. Utilidad `VisuallyHidden`**
- *Contexto:* varios contextos necesitan texto solo-para-lectores (iconos de estado, valores de stats decorativas como la estrella de reputación).
- *Solución:* componente `<VisuallyHidden>` (o clase `sr-only` sistemática) documentado en el design system.

**414. Explicar los estados deshabilitados**
- *Contexto:* botones disabled (pagar sin aprobar, reservar sin sesión) no dicen POR QUÉ.
- *Solución:* tooltip en hover/focus del contenedor ("Disponible cuando el arrendador apruebe") — patrón: nunca disabled sin explicación accesible.

**415. Checklist de lector de pantalla documentada**
- *Contexto:* sin proceso, la accesibilidad se degrada con cada feature.
- *Solución:* `docs/A11Y.md` con checklist por PR (labels, foco, contraste, teclado) + prueba NVDA de los 3 flujos críticos (buscar→reservar, registrarse, chatear) una vez por release.

---

## Sección 13 · Rendimiento frontend (416–440)

**416. Eliminar la fuente icónica render-blocking**
- *Contexto:* Material Symbols entra por `<link>` bloqueante en el layout (ítem 21); cada página paga ese costo.
- *Solución:* resolver con la migración a lucide (ítem 19); mientras tanto `display=block→swap` y `preconnect` reducen el daño.

**417. `preconnect` a Cloudinary**
- *Contexto:* casi todas las imágenes vienen de `res.cloudinary.com` sin preconnect — handshake TLS repetido en el critical path.
- *Solución:* `<link rel="preconnect" href="https://res.cloudinary.com">` en el head del layout.

**418. Auditar `sizes` en todas las `next/image`**
- *Contexto:* sin `sizes` correcto, el navegador descarga imágenes al ancho de viewport aunque la card mida 300px.
- *Solución:* pasada por PropertyCard/galería/hero fijando `sizes` por breakpoint real del grid; verificar en Network que bajen los pesos.

**419. Blur placeholders en imágenes de propiedades**
- *Contexto:* las cards muestran huecos vacíos mientras cargan las fotos.
- *Solución:* `blurDataURL` generado por Cloudinary (`e_blur:1000,q_1,w_50`) construido por el URL-builder del ítem 420 — percepción de carga instantánea.

**420. URL-builder de Cloudinary centralizado**
- *Contexto:* las URLs de Cloudinary se usan tal cual llegan, sin transformaciones (`f_auto,q_auto,w_`) — se sirven originales pesados.
- *Solución:* `lib/cloudinary.ts` con `imgUrl(publicId, {w, h, blur})` que inyecte `f_auto,q_auto,c_fill,w_{w}` — hasta 80% menos peso de imagen.

**421. Cargar Leaflet solo al interactuar**
- *Contexto:* los mapas ya son `dynamic ssr:false`, pero se montan al renderizar la sección aunque el usuario no llegue a ella.
- *Solución:* montar el mapa al entrar en viewport (IntersectionObserver) con facade estática antes (imagen del mapa o placeholder clickeable "Ver mapa").

**422. Bundle analyzer y presupuesto**
- *Contexto:* nadie sabe cuánto pesa el bundle ni qué lo engorda (emoji-picker ~300KB, leaflet, recharts).
- *Solución:* `@next/bundle-analyzer` + presupuesto en CI (First Load JS < 250KB en rutas públicas); dynamic-import de todo lo que no sea above-the-fold.

**423. TanStack Query para el data-fetching**
- *Contexto:* todo se hace con `useEffect` + `useState` manual: sin cache entre navegaciones, refetch total en cada mount, sin deduplicación de requests.
- *Solución:* `@tanstack/react-query` con provider global: cache por clave (`['propiedad', id]`), `staleTime` por tipo de dato, invalidación tras mutaciones — menos spinners, menos código, datos frescos.

**424. Streaming SSR para el detalle**
- *Contexto:* el detalle (683 líneas, `'use client'`) carga TODO client-side — malo para LCP y SEO.
- *Solución:* convertir el shell a RSC con fetch server-side de la propiedad (ya hay fetch server en el layout OG) + `Suspense` para reseñas/similares; interactividad (favorito, reserva) como islas cliente.

**425. Trocear las páginas-gigante en islas**
- *Contexto:* páginas enteras marcadas `'use client'` (home, detalle, dashboards) descartan los beneficios del App Router.
- *Solución:* patrón sistemático: page.tsx = server component (layout, datos iniciales, metadata); los bloques interactivos importan `'use client'` individualmente.

**426. Virtualización de listas largas**
- *Contexto:* resultados de búsqueda (infinite scroll acumulativo), tablas admin y chat crecen sin liberar DOM.
- *Solución:* `@tanstack/react-virtual` en la lista de resultados (>50 items) y mensajes (ítem 342); las tablas paginadas del ítem 47 no lo necesitan.

**427. Debounce y deduplicación en búsqueda**
- *Contexto:* `use-debounce` existe — auditar que TODOS los inputs que disparan requests lo usen (WhereSearch, filtros de precio con slider).
- *Solución:* debounce 300ms en texto, 500ms en sliders + cancelación del ítem 127; TanStack Query deduplica el resto.

**428. Prefetch estratégico de rutas**
- *Contexto:* Next prefetchea links visibles, pero las navegaciones programáticas (router.push tras acciones) no.
- *Solución:* `router.prefetch` de la ruta destino en los flujos calientes: card→detalle (ítem 128), aprobar→reservas, login→panel del rol.

**429. Memoizar las cards de los grids**
- *Contexto:* cada actualización del estado de búsqueda re-renderiza TODAS las PropertyCard (favorito de una re-pinta cincuenta).
- *Solución:* `React.memo(PropertyCard)` con props estables + selectores granulares de Zustand (`useFavoritesStore(s => s.has(id))` por card).

**430. Cálculos geo memoizados**
- *Contexto:* haversine y resolución de zona (`lib/geo.ts`) pueden ejecutarse por card en cada render.
- *Solución:* calcular distancias una vez por resultado (al llegar los datos, no en render) — o mejor, usar la distancia del servidor (ítem 107).

**431. Reportar Web Vitals**
- *Contexto:* no hay medición de LCP/CLS/INP reales de usuarios.
- *Solución:* `useReportWebVitals` de Next enviando a la analítica del ítem 455 — sin datos no hay optimización dirigida.

**432. Lighthouse CI**
- *Contexto:* el rendimiento se degrada silenciosamente con cada feature.
- *Solución:* `@lhci/cli` en GitHub Actions contra home/búsqueda/detalle con umbrales (performance >85, a11y >95) que fallen el PR.

**433. Selectores granulares de Zustand**
- *Contexto:* componentes que hacen `useAuthStore()` completo se re-renderizan con CUALQUIER cambio del store.
- *Solución:* barrido: siempre `useStore(s => s.campo)` (+ `useShallow` para objetos) — especialmente en navbar, sidebars y cards.

**434. Cache HTTP para catálogos**
- *Contexto:* tipos, servicios, reglas y zonas cambian rara vez pero se piden en cada sesión (zonas-cache ayuda solo en memoria).
- *Solución:* `Cache-Control: public, max-age=300, stale-while-revalidate=3600` en los endpoints de catálogo (gateway) + `staleTime: Infinity` en TanStack Query con invalidación manual.

**435. Partial Prerendering en el home**
- *Contexto:* el home es `'use client'` completo; su shell (hero, secciones estáticas) podría servirse estático instantáneo.
- *Solución:* con la migración del ítem 425: shell prerendereado + `Suspense` para destacados — TTFB de estático con datos frescos.

**436. Verificar Turbopack en desarrollo**
- *Contexto:* Next 16 usa Turbopack por defecto — confirmar que no haya flags legacy que lo desactiven y que el build de prod use la config óptima.
- *Solución:* revisar `next.config.ts` y scripts; medir cold start de dev antes/después.

**437. Lazy load del emoji picker**
- *Contexto:* `emoji-picker-react` pesa ~300KB y entra en el bundle del chat completo.
- *Solución:* `next/dynamic` al abrir el picker por primera vez, con spinner mínimo en el popover (relacionado con el ítem 259).

**438. Imports de lucide tree-shakeables**
- *Contexto:* verificar que los iconos se importen `import { X } from 'lucide-react'` (tree-shakeable en v1) y no dinámicamente sin control.
- *Solución:* auditar con el bundle analyzer que lucide no entre completo; para iconos dinámicos del catálogo usar `dynamicIconImports` con un subset.

**439. No hidratar el comparador vacío**
- *Contexto:* `ClientChrome` monta `PropertyCompareBar` (dynamic ssr:false) en TODAS las páginas públicas aunque no haya nada que comparar.
- *Solución:* montar el componente solo cuando `compare-store` tenga items (leer el store en el wrapper, no dentro del dynamic).

**440. Compresión y cache en el edge**
- *Contexto:* el nginx de producción debe servir brotli y cachear estáticos correctamente (`_next/static` es immutable).
- *Solución:* `brotli on` + `Cache-Control: immutable` para `_next/static/*` y TTL corto para HTML — verificar con curl los headers reales.

---

## Sección 14 · SEO, PWA y metadatos (441–460)

**441. `metadataBase` y canónicas**
- *Contexto:* sin `metadataBase`, las URLs relativas de OG se rompen; sin canónicas, los filtros de búsqueda generan contenido duplicado.
- *Solución:* `metadataBase: new URL('https://alquilaya.pe')` en el root + `alternates.canonical` por página pública.

**442. Sitemap dinámico**
- *Contexto:* no existe sitemap; Google descubre las propiedades por suerte.
- *Solución:* `app/sitemap.ts` que genere entradas de páginas estáticas + todas las propiedades activas (`lastModified` = `ultimaActualizacion` del DTO) + zonas del ítem 134.

**443. `robots.ts` explícito**
- *Contexto:* sin robots, los paneles privados podrían indexarse si algo se filtra.
- *Solución:* `app/robots.ts`: allow público, disallow `/student`, `/landlord`, `/admin-master`, `/api`; referencia al sitemap.

**444. `noindex` en rutas privadas**
- *Contexto:* defensa en profundidad del ítem 443 — robots.txt no impide indexación de URLs enlazadas.
- *Solución:* `metadata.robots = { index: false }` en los layouts de student/landlord/admin-master.

**445. OG images generadas dinámicamente**
- *Contexto:* las previews al compartir son la publicidad gratuita del producto en los grupos de WhatsApp de la UPeU.
- *Solución:* `app/property/[id]/opengraph-image.tsx` con `ImageResponse`: foto + precio + "a X min de UPeU" + logo — cada propiedad compartida se vuelve un anuncio.

**446. Plantilla de títulos por página**
- *Contexto:* auditar que cada ruta tenga título único; el root debe definir plantilla.
- *Solución:* `title: { template: '%s · AlquilaYa', default: 'AlquilaYa — Cuartos para estudiantes UPeU' }` + títulos descriptivos por página (también alimenta el ítem 408).

**447. Manifest PWA completo**
- *Contexto:* hay service worker registrado pero el manifest necesita estar completo para ser instalable.
- *Solución:* `app/manifest.ts` con name, short_name, `theme_color` (borgoña), `background_color`, iconos 192/512 + maskable, `display: standalone`, shortcuts (Buscar, Mensajes).

**448. Página offline del service worker**
- *Contexto:* sin conexión, la PWA muestra el dinosaurio de Chrome.
- *Solución:* precache de una `/offline` amable ("Sin conexión — tus favoritos siguen aquí") + estrategia cache-first para estáticos en el SW.

**449. Push notifications web**
- *Contexto:* las notificaciones viven solo dentro de la app; un mensaje del arrendador no llega si la pestaña está cerrada.
- *Solución:* Web Push (VAPID): suscripción desde preferencias, backend guarda el endpoint y el servicio de notificaciones publica también por push — complementa WhatsApp.

**450. Prompt de instalación de la PWA**
- *Contexto:* nadie sabe que AlquilaYa es instalable.
- *Solución:* capturar `beforeinstallprompt` y ofrecer instalación tras una señal de compromiso (2ª visita o primer favorito), nunca al aterrizar; banner nativo en iOS con instrucciones.

**451. 404 útil**
- *Contexto:* `not-found.tsx` existe con EmptyState genérico.
- *Solución:* añadir buscador inline + 4 propiedades destacadas + links a secciones — convertir el error en navegación.

**452. Preparar hreflang (futuro multi-idioma)**
- *Contexto:* next-intl ya está configurado con un solo locale; si algún día hay inglés (estudiantes de intercambio), el SEO debe estar listo.
- *Solución:* decisión documentada: por ahora un solo locale (sin hreflang), pero centralizar strings (ítem 470) deja la puerta abierta sin costo.

**453. URLs con slug legible**
- *Contexto:* `/property/uuid-largo` no comunica nada ni ayuda al SEO.
- *Solución:* `/property/{slug}-{id}` (slug del título, id al final para resolver) con redirect 301 desde la URL vieja; el slug se genera al publicar.

**454. Search Console y verificación**
- *Contexto:* sin Search Console no hay visibilidad de indexación, errores ni queries.
- *Solución:* dar de alta la propiedad, verificar con meta tag (`metadata.verification.google`) y enviar el sitemap del ítem 442.

**455. Analítica de producto respetuosa**
- *Contexto:* no hay analítica: no se sabe qué páginas se usan, dónde abandona el embudo de reserva.
- *Solución:* **Umami** o **Plausible** self-hosted (docker-compose ya existe en el proyecto) — eventos clave: búsqueda, vista de detalle, inicio de reserva, pago; sin cookies, sin banner de consentimiento.

**456. UTM en los flujos de compartir**
- *Contexto:* al compartir propiedades no se puede medir qué canal trae visitas.
- *Solución:* añadir `?utm_source=share&utm_medium=whatsapp` en el botón compartir — la analítica del ítem 455 los reporta.

**457. Meta descriptions por página pública**
- *Contexto:* sin description, Google inventa el snippet.
- *Solución:* descriptions únicas: home (propuesta de valor), búsqueda por zona (N cuartos desde S/X), detalle (primeras líneas de la descripción + precio + distancia).

**458. Datos estructurados del sitio completos**
- *Contexto:* consolidación de los ítems 104/168/460 como tarea verificable.
- *Solución:* validar todo el JSON-LD con el Rich Results Test de Google; objetivo: rich snippets con estrellas y precio en los resultados de propiedades.

**459. OG de la búsqueda con datos vivos**
- *Contexto:* compartir "cuartos en Ñaña" muestra un preview genérico.
- *Solución:* OG image por zona (plantilla con nombre de zona + conteo + precio mínimo) usando el generador del ítem 445 en las landings del ítem 134.

**460. `BreadcrumbList` en JSON-LD**
- *Contexto:* los breadcrumbs visuales (ítem 50) deben existir también para Google.
- *Solución:* emitir el JSON-LD desde el mismo componente Breadcrumb (una sola fuente) — aparece la ruta en el snippet de Google.

---

## Sección 15 · Calidad de código frontend y DX (461–480)

**461. Eliminar `js-cookie` y sus types**
- *Contexto:* `js-cookie` + `@types/js-cookie` tienen CERO usos en `src/` — legado del modelo viejo de tokens.
- *Solución:* `npm uninstall js-cookie @types/js-cookie` — dependencias muertas confunden y engordan el lockfile.

**462. Resolver el doble decodificador de JWT**
- *Contexto:* `lib/jwt.ts` (`decodeJWT`, `isTokenExpired`) no lo importa NADIE; `proxy.ts` reimplementa el decode por su cuenta.
- *Solución:* que `proxy.ts` use `lib/jwt.ts` (funciona en edge runtime con `atob`) o borrar el archivo muerto — pero no ambos.

**463. Documentar la arquitectura de la doble cookie**
- *Contexto:* `proxy.ts` lee una cookie `auth-token` legible mientras `api.ts` describe tokens httpOnly — parece contradicción (¿es una cookie espejo no-httpOnly solo para el proxy?).
- *Solución:* documentar el diseño real en `docs/AUTH.md` (qué cookie existe, quién la pone, qué contiene) y, si la legible duplica el JWT completo, evaluar reducirla a un hint mínimo (rol + exp) sin datos sensibles.

**464. Naming uniforme de services**
- *Contexto:* conviven `servicioAuth`, `servicioPropiedades`, `propiedadService`, `usuarioMasterService`, `adminService` — español/inglés mezclado y nombres que no dicen su dominio.
- *Solución:* convención única (`authService`, `propertyService`, `landlordPropertyService`…) aplicada con rename global del IDE; alias temporales de re-export para migrar sin big-bang.

**465. Fusionar los servicios de reseñas**
- *Contexto:* `resena-service.ts` y `reviews-service.ts` llaman al MISMO endpoint con DOS tipos `Resena` distintos (uno inline, otro en `types/review.ts`); `admin-resena-service` aparte.
- *Solución:* un solo `review-service.ts` con el tipo de `types/review.ts` como canónico; el de admin puede quedarse separado pero compartiendo tipos.

**466. Fusionar los servicios de catálogos**
- *Contexto:* `catalog-service.ts` y `catalogos-service.ts` definen AMBOS `ItemCatalogo` y `TipoItemCatalogo` con enums ligeramente distintos — bomba de tiempo de tipos.
- *Solución:* un `catalog-service.ts` único con los tipos exportados desde `types/`; los endpoints admin y públicos son métodos del mismo servicio.

**467. Fusionar permisos/RBAC**
- *Contexto:* `admin-permission-service.ts` (`permisoService`) y `rbac-service.ts` modelan permisos por separado.
- *Solución:* un `rbac-service.ts` único alineado con los controllers del backend (`/usuarios/permisos` + `/usuarios/rbac`) y tipos compartidos.

**468. Un solo camino para cambiar contraseña**
- *Contexto:* `profile-service` usa `POST /usuarios/{id}/cambiar-password` y `student-profile-service` usa `PATCH /usuarios/perfil/password` — dos endpoints para lo mismo según la pantalla.
- *Solución:* estandarizar en el endpoint self-service (`/perfil/password`) para el propio usuario; el otro queda solo para admin — reflejarlo en un único método de servicio.

**469. Fusionar los servicios de admin de usuarios**
- *Contexto:* `admin-user-service.ts` y `adminService.ts` solapan responsabilidades sobre `/usuarios`.
- *Solución:* `admin-user-service.ts` único (directorio, aprobar/rechazar, banear) — y de paso resolver la doble UI del ítem 363.

**470. Adoptar i18n de verdad (o simplificar)**
- *Contexto:* next-intl está configurado, `es.json` tiene 100 líneas… y solo 3 páginas de error usan `useTranslations`; TODO lo demás hardcodea español.
- *Solución:* decisión explícita: (a) migrar strings a `es.json` progresivamente (habilita el ítem 452 y centraliza el copy), o (b) quitar next-intl y ahorrarse el provider. Recomendado (a) empezando por los textos compartidos (botones, estados, errores).

**471. Borrar el `tailwind.config.mjs` vestigial**
- *Contexto:* Tailwind v4 se configura en CSS (`@theme`); el `.mjs` casi vacío confunde sobre dónde vive la config.
- *Solución:* eliminarlo (verificando que nada lo lea) — `components.json` ya apunta a config vacía, coherente con v4.

**472. Schemas Zod para TODOS los formularios**
- *Contexto:* solo auth/student tienen schemas; publicar propiedad, reservas, reseñas, denuncias, catálogos admin, zonas y convivencia validan a mano (o nada).
- *Solución:* crear `property-schema.ts`, `reserva-schema.ts`, `review-schema.ts`, `report-schema.ts`, `catalog-schema.ts`, `zona-schema.ts`, `convivencia-schema.ts` — cada uno espejo de las validaciones del backend, conectados vía `zodResolver`.

**473. Tipos generados desde OpenAPI**
- *Contexto:* cada service define sus interfaces a mano (ya hay 2 `Resena`, 2 `ItemCatalogo` divergentes); el backend expone `/v3/api-docs` en cada servicio.
- *Solución:* `openapi-typescript` en un script npm que genere `types/api/*.d.ts` desde los specs — los tipos del front no pueden divergir del backend nunca más.

**474. Tests unitarios de la lógica crítica**
- *Contexto:* cero tests en el frontend; la lógica de `search-url.ts` (serialización idempotente), `politica-cancelacion.ts`, `reservation-status.ts` y `geo.ts` es exactamente la que se rompe silenciosamente.
- *Solución:* **Vitest** + Testing Library: empezar por esas 4 libs puras (fáciles, alto valor) y los hooks `use-properties-search`/`use-reservations` con MSW.

**475. E2E de los flujos de dinero**
- *Contexto:* nadie verifica automáticamente que registro → búsqueda → reserva → pago simulado siga funcionando tras cada cambio.
- *Solución:* **Playwright** con 4 specs: registro+OTP (backend en modo NINGUNO), búsqueda con filtros, reserva completa con `simular-exito`, y chat — corriendo contra docker-compose en CI.

**476. Monitoreo de errores con Sentry**
- *Contexto:* los errores de producción solo existen si un usuario los reporta; hay múltiples `.catch` silenciosos.
- *Solución:* `@sentry/nextjs` (o GlitchTip self-hosted, gratis) con sourcemaps, release tracking y captura en los catches silenciosos (ítem 165).

**477. Hooks de pre-commit**
- *Contexto:* el lint existe pero nada lo fuerza antes de commitear; el `console.log` del admin (ítem 360) llegó a main.
- *Solución:* `husky` + `lint-staged`: eslint --fix + prettier + `tsc --noEmit` en staged files — barato y corta el 80% de los descuidos.

**478. CI de calidad en cada PR**
- *Contexto:* no hay pipeline que valide el frontend (typecheck, lint, build, tests).
- *Solución:* GitHub Actions: `npm ci && tsc --noEmit && next lint && next build && vitest run` + Lighthouse CI (ítem 432) — badge en el README.

**479. Reglas ESLint anti-regresión**
- *Contexto:* las migraciones (legacy kit, colores, console) se revierten solas si nada las vigila.
- *Solución:* `no-restricted-imports` (legacy-*, ui/modal), `no-console` (allow warn/error), y regla custom o comentario-convención contra clases de color crudas en nuevos archivos.

**480. Actualizar la documentación del frontend**
- *Contexto:* el `AGENTS.md` del frontend solo advierte sobre Next 16; no documenta arquitectura, convenciones ni decisiones (stores, services, tokens).
- *Solución:* `AlquilaYa-Fronted/ARCHITECTURE.md`: mapa de carpetas, flujo de auth (con el diseño de cookies del ítem 463), convención de services/stores/schemas, y cómo añadir una página nueva "a la manera del proyecto".

---

## Sección 16 · Backend — detectado durante el análisis (481–500)

**481. Activar las validaciones que ya existen (`@Valid` faltante)**
- *Contexto:* `DepositoController` y `DesembolsoController` tienen DTOs con `@NotNull/@Positive/@NotBlank` pero los `@RequestBody` NO llevan `@Valid` — montos negativos y motivos vacíos pasan; igual `RoommateController.actualizar`.
- *Solución:* añadir `@Valid` a esos endpoints (cambio de una palabra por método) + test que confirme el 400.

**482. Cerrar el mass-assignment en reservas**
- *Contexto:* `PUT /reservas/{id}` acepta la entidad `Reserva` cruda sin `@Valid` — un cliente malicioso podría enviar campos internos (estado, montos); `POST /usuarios/permisos` recibe `Permiso` crudo.
- *Solución:* DTO de actualización con SOLO los campos editables (fechas, notas) + mapper explícito; nunca entidades JPA como request body.

**483. DTOs y paginación en el listado admin de propiedades**
- *Contexto:* `GET /propiedades` (admin) devuelve TODAS las entidades JPA completas — fuga potencial de campos internos y problema de escala; `PUT`/`POST` también responden la entidad cruda.
- *Solución:* respuesta `Page<PropiedadAdminDTO>` con los campos que el panel necesita; entidades JPA jamás cruzan la frontera HTTP.

**484. Paginar las reservas**
- *Contexto:* `/reservas/mis`, `/arrendador` y `/arrendador/estado/{estado}` devuelven listas completas — crecen sin límite con el tiempo.
- *Solución:* `Pageable` en los tres + front adaptado (ítem 234); ordenar por fecha descendente por defecto.

**485. Paginar las reseñas públicas**
- *Contexto:* las reseñas por propiedad/arrendador/estudiante devuelven todo (solo el admin pagina).
- *Solución:* `Pageable` con default `size=10` + agregados (media, total, distribución del ítem 151) en una respuesta envolvente para pintar la cabecera sin traer todo.

**486. Paginar el listado de conversaciones**
- *Contexto:* `GET /mensajeria/conversaciones` devuelve todas las del usuario.
- *Solución:* paginar ordenando por último mensaje + proyección ligera (últimoMensaje, noLeidos) para la lista (ítems 264–266).

**487. Paginar los listados de usuarios**
- *Contexto:* `GET /usuarios`, `/rol/{rol}` y `/admin/arrendadores` devuelven listas completas — el directorio admin lo sufrirá primero (ítem 362).
- *Solución:* `Pageable` + filtros server-side (estado, búsqueda por nombre/dni/correo) para alimentar el DataTable.

**488. Tipar los bodies `Map<String,String>`**
- *Contexto:* respuesta del arrendador a reseñas, motivos de rechazo/cancelación y cambios de política llegan como Map sin validación de longitud (la reseña limita 2000 chars; la respuesta del arrendador NO).
- *Solución:* records DTO (`RespuestaResenaRequest(@NotBlank @Size(max=1000) String texto)`) por endpoint — tipado, documentado en Swagger y validado.

**489. Métrica real de tiempo de respuesta del arrendador**
- *Contexto:* `tiempoRespuestaArrendador` está hardcodeado a `null` con TODO explícito en `UsuarioController` (líneas 257-260) — el dato se muestra "—" en el detalle.
- *Solución:* job programado en servicio-mensajeria que calcule la mediana de (primer mensaje → primera respuesta) por arrendador en 30 días y la publique (Kafka o endpoint interno) hacia usuarios.

**490. Endpoint público de estadísticas de plataforma**
- *Contexto:* el home quiere mostrar escala ("+120 cuartos, +300 estudiantes", ítem 86) y no hay endpoint.
- *Solución:* `GET /api/v1/propiedades/stats/publico` (conteo de activas, zonas, y de usuarios vía Feign o evento) cacheado 1h — sin datos sensibles.

**491. Búsqueda full-text de propiedades**
- *Contexto:* la búsqueda es solo por filtros estructurados; no se puede buscar "baño propio amoblado" (ítem 126).
- *Solución:* columna `tsvector` generada (título + descripción, config 'spanish') con índice GIN + parámetro `q` en `/buscar/paginado` — PostgreSQL puro, sin Elasticsearch.

**492. Búsquedas guardadas con alertas**
- *Contexto:* la retención depende de que el estudiante vuelva a buscar a mano (ítems 99/112).
- *Solución:* entidad `BusquedaGuardada` (usuario + filtros serializados) + listener del evento de aprobación de propiedad que matchee contra las búsquedas y notifique (la infraestructura Kafka→notificaciones ya existe).

**493. Historial de pagos por usuario**
- *Contexto:* servicio-pagos solo expone estado por reserva y resumen admin — no hay "mis pagos" (ítem 279).
- *Solución:* `GET /pagos/mis` paginado (fecha, concepto, monto, estado, referencia MP) filtrando por el usuario del JWT.

**494. Comprobante de pago PDF**
- *Contexto:* tras pagar no se genera ningún documento (ítem 280); el contrato PDF ya demuestra que hay generación de PDFs en el stack.
- *Solución:* endpoint `GET /pagos/{id}/comprobante` que genere el PDF (openhtmltopdf, mismo enfoque del contrato) con datos de la operación MP.

**495. Mensajes con imágenes en mensajería**
- *Contexto:* el chat es solo texto (ítem 254).
- *Solución:* campos `tipo` (TEXTO/IMAGEN) y `adjuntoUrl` en Mensaje + endpoint de upload (reutilizar la integración Cloudinary de propiedades) con validación de tipo/peso y URL firmada.

**496. Actualizar CLAUDE.md: pendientes ya resueltos**
- *Contexto:* CLAUDE.md lista "Validar firma X-Signature en webhook de MercadoPago" como pendiente, pero `PagoController` YA la valida — la doc desactualizada causa trabajo duplicado.
- *Solución:* revisar la lista de "Pendientes para producción" contra el código actual y marcar lo hecho (x-signature ✓, trazabilidad ✓) — la doc es parte del producto.

**497. Enum tipado para el parámetro `tipo` de reseñas**
- *Contexto:* `GET/PATCH/DELETE` de reseñas reciben `@RequestParam String tipo` arbitrario que se parsea tarde en el service (400 tardío y opaco).
- *Solución:* `@RequestParam TipoResena tipo` (enum) — Spring valida y documenta en Swagger automáticamente.

**498. Rate-limit del embudo de contacto**
- *Contexto:* `POST /propiedades/{id}/contacto` acepta eventos anónimos (perfilId null) sin límite — un script puede inflar las métricas del embudo.
- *Solución:* rate-limit por IP (bucket4j, ya hay Redis) + dedupe por sesión/día — las métricas de analítica del arrendador deben ser confiables.

**499. Notificaciones por correo además de WhatsApp**
- *Contexto:* todo el flujo transaccional depende de WhatsApp (whatsapp-web.js, frágil: QR expirado = cero avisos); no hay canal de respaldo.
- *Solución:* email SMTP (Resend/Brevo gratis, o Jakarta Mail) para los hitos críticos (verificación, reserva aprobada, pago confirmado) — el consumidor Kafka existente despacha a ambos canales.

**500. Completar la Fase 2 multi-universidad**
- *Contexto:* el catálogo ya modela N universidades con zonas (Fase 1 ✓), la búsqueda acepta `universidadId`/`zonaId`… pero el frontend sigue anclado a la "principal" (`/principal`, academic-tab hardcodeada, ancla de campus única).
- *Solución:* conectar el dominio: selector de universidad en registro (ítem 226) y búsqueda (ítem 109), ancla de campus por universidad elegida en `CampusHydrator`, y datos por universidad en los dashboards — el proyecto pasa de "app para UPeU" a "plataforma multi-campus", el salto de alcance más visible de todos.

---

## Cómo priorizar (sugerencia de ejecución)

**Semana 1 — Credibilidad inmediata (bugs y datos falsos):** 201, 218, 355, 356, 357, 360, 361, 375, 77–78, 315, 222.
**Semanas 2–3 — Sistema de diseño:** 1–4, 14–18, 41–45, 301–304, 372–373 (un solo lenguaje visual).
**Semanas 4–6 — Conectar lo que ya existe:** 106–107, 147–148, 236–237, 314, 326, 352, 368–371 (backend construido sin UI: máximo valor por hora).
**Continuo:** estados loading/empty/error (207–219), accesibilidad (391+), y las features de producto grandes (Bricks 276, multi-universidad 500, búsquedas guardadas 492) por sprint.

> Total: **500 mejoras** — 480 de frontend/producto y 20 de backend, todas ancladas a archivos y endpoints reales del proyecto.
