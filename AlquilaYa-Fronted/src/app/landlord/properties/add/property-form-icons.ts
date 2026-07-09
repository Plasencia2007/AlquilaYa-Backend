// =============================================================================
// Font Awesome → Material Symbols mapper
// El backend almacena íconos como "fa-wifi", "fa-paw", etc.
// Material Symbols (Google) usa nombres distintos como "wifi", "pets", etc.
// =============================================================================

const FA_TO_MATERIAL: Record<string, string> = {
  // Períodos
  'fa-calendar-alt': 'calendar_month',
  'fa-calendar':     'calendar_today',
  'fa-calendar-day': 'today',
  'fa-repeat':       'event_repeat',
  'fa-clock':        'schedule',
  // Servicios comunes
  'fa-wifi':             'wifi',
  'fa-tint':             'water_drop',
  'fa-bolt':             'bolt',
  'fa-lightbulb':        'lightbulb',
  'fa-female':           'lightbulb',
  'fa-tshirt':           'checkroom',
  'fa-shirt':            'checkroom',
  'fa-utensils':         'restaurant',
  'fa-key':              'key',
  'fa-shower':           'shower',
  'fa-bath':             'bathtub',
  'fa-tv':               'tv',
  'fa-snowflake':        'ac_unit',
  'fa-temperature-high': 'thermostat',
  'fa-parking':          'local_parking',
  'fa-bus':              'directions_bus',
  'fa-lock':             'lock',
  'fa-couch':            'weekend',
  'fa-bed':              'bed',
  'fa-dumbbell':         'fitness_center',
  'fa-water':            'water',
  'fa-gas-pump':         'local_gas_station',
  'fa-fire':             'local_fire_department',
  'fa-broom':            'cleaning_services',
  'fa-shield-alt':       'security',
  'fa-dog':              'pets',
  // Reglas comunes
  'fa-paw':             'pets',
  'fa-smoking-ban':     'smoke_free',
  'fa-smoking':         'smoking_rooms',
  'fa-graduation-cap':  'school',
  'fa-music':           'music_note',
  'fa-glass-martini':   'local_bar',
  'fa-cocktail':        'local_bar',
  'fa-beer':            'sports_bar',
  'fa-volume-up':       'volume_up',
  'fa-user-friends':    'group',
  'fa-users':           'group',
  'fa-child':           'child_care',
  'fa-ban':             'block',
  'fa-check':           'check_circle',
  'fa-times':           'cancel',
  // Tipos de propiedad
  'fa-home':       'home',
  'fa-building':   'apartment',
  'fa-hotel':      'hotel',
  'fa-door-open':  'door_front',
  'fa-house':      'house',
};

export function resolveIcon(icon: string | undefined): string | undefined {
  if (!icon) return undefined;
  const key = icon.toLowerCase().trim();
  if (key.startsWith('fa-')) return FA_TO_MATERIAL[key] ?? 'label';
  return icon;
}
