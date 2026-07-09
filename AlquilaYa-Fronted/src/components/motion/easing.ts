/**
 * Espejo en JS de los tokens --ease-out-expo/--ease-spring de globals.css.
 * `motion` anima con arrays de bezier, no puede leer custom properties CSS.
 */
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
export const EASE_SPRING = [0.34, 1.56, 0.64, 1] as const;
