/**
 * Mapa FontAwesome → Material Symbols. El catálogo (servicios, reglas, tipos,
 * banners) guarda nombres de ícono FontAwesome heredados del admin legacy;
 * esta es la única fuente de la conversión (antes vivía triplicada en
 * student/page.tsx, CatalogosTable.tsx y edit-property-modal.tsx).
 *
 * TODO backend: normalizar el catálogo para que guarde el nombre del símbolo
 * directamente (o un ícono lucide) y eliminar este mapa — ítem 19 de MEJORAS.md.
 */
export const FA_TO_MATERIAL: Record<string, string> = {
  // Calendario / tiempo
  'fa-calendar-alt': 'calendar_month',
  'fa-calendar-check': 'event_available',
  'fa-calendar': 'calendar_today',
  'fa-calendar-day': 'today',
  'fa-repeat': 'event_repeat',
  'fa-clock': 'schedule',
  // Servicios comunes
  'fa-wifi': 'wifi',
  'fa-tint': 'water_drop',
  'fa-bolt': 'bolt',
  'fa-lightbulb': 'lightbulb',
  'fa-tshirt': 'checkroom',
  'fa-shirt': 'checkroom',
  'fa-utensils': 'restaurant',
  'fa-key': 'key',
  'fa-shower': 'shower',
  'fa-bath': 'bathtub',
  'fa-tv': 'tv',
  'fa-snowflake': 'ac_unit',
  'fa-temperature-high': 'thermostat',
  'fa-parking': 'local_parking',
  'fa-bus': 'directions_bus',
  'fa-lock': 'lock',
  'fa-couch': 'weekend',
  'fa-bed': 'bed',
  'fa-dumbbell': 'fitness_center',
  'fa-water': 'water',
  'fa-gas-pump': 'local_gas_station',
  'fa-fire': 'local_fire_department',
  'fa-broom': 'cleaning_services',
  'fa-shield-alt': 'security',
  'fa-dog': 'pets',
  // Reglas comunes
  'fa-paw': 'pets',
  'fa-smoking-ban': 'smoke_free',
  'fa-smoking': 'smoking_rooms',
  'fa-graduation-cap': 'school',
  'fa-music': 'music_note',
  'fa-volume-mute': 'volume_off',
  'fa-volume-up': 'volume_up',
  'fa-glass-martini': 'local_bar',
  'fa-glass-cheers': 'celebration',
  'fa-cocktail': 'local_bar',
  'fa-beer': 'sports_bar',
  'fa-user-friends': 'group',
  'fa-users': 'group',
  'fa-child': 'child_care',
  'fa-ban': 'block',
  'fa-check': 'check_circle',
  'fa-times': 'cancel',
  // Tipos de propiedad
  'fa-home': 'home',
  'fa-building': 'apartment',
  'fa-hotel': 'hotel',
  'fa-door-open': 'door_front',
  'fa-house': 'house',
  // Otros motivos (cancelación, rechazo, moderación)
  'fa-plane-slash': 'flight_land',
  'fa-heartbeat': 'favorite',
  'fa-calendar-times': 'event_busy',
  'fa-exclamation-circle': 'warning',
  'fa-user-times': 'person_remove',
  'fa-wrench': 'build',
  'fa-comments-slash': 'speaker_notes_off',
};

/** Convierte un nombre de ícono del catálogo (FA o Material) al nombre de Material Symbols. */
export function resolveIcon(icon: string | undefined | null): string {
  if (!icon) return 'label';
  const key = icon.toLowerCase().trim();
  if (key.startsWith('fa-')) return FA_TO_MATERIAL[key] ?? 'label';
  return icon;
}
