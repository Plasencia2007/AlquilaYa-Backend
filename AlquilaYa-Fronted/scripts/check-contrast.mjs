#!/usr/bin/env node
/**
 * Verifica el contraste WCAG AA de los pares de colores fondo/texto reales
 * definidos en `src/app/globals.css` (ítem 398 de MEJORAS.md), para los temas
 * light y dark.
 *
 * Lee los valores directo del CSS (no los hardcodea acá) — si alguien cambia
 * un color en `globals.css`, este script lo detecta en la próxima corrida sin
 * tocar código. Solo cubre los tokens que hoy están definidos como hex
 * LITERAL en `:root` / `[data-theme="dark"]` (no resuelve cadenas de `var()`
 * — no hace falta: los tokens semánticos de color siempre son hex directo en
 * este proyecto, ver `globals.css`).
 *
 * Uso:
 *   node scripts/check-contrast.mjs
 *
 * Sale con código 1 si algún par no llega al mínimo WCAG AA (4.5:1 para texto
 * normal, 3:1 para texto grande — ≥18pt o ≥14pt bold). No está conectado a CI
 * todavía: es una verificación manual antes de cambiar la paleta.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { hex as contrastHex } from 'wcag-contrast';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSS_PATH = path.join(__dirname, '..', 'src', 'app', 'globals.css');

const AA_NORMAL = 4.5;
const AA_LARGE = 3.0;

/** Pares a verificar: [etiqueta, variable de texto, variable de fondo, tamaño]. */
const PAIRS = [
  ['foreground / background (texto normal de página)', 'foreground', 'background', 'normal'],
  ['muted-foreground / muted (texto secundario)', 'muted-foreground', 'muted', 'normal'],
  ['primary / card (texto o ícono de acento sobre card)', 'primary', 'card', 'normal'],
  ['primary-foreground / primary (texto de botón primario)', 'primary-foreground', 'primary', 'normal'],
  ['secondary-foreground / secondary (texto de botón secundario)', 'secondary-foreground', 'secondary', 'normal'],
  ['destructive-foreground / destructive (texto de botón destructivo)', 'destructive-foreground', 'destructive', 'normal'],
  ['accent-foreground / accent (texto sobre superficie de acento)', 'accent-foreground', 'accent', 'normal'],
  ['card-foreground / card (texto de cuerpo dentro de una card)', 'card-foreground', 'card', 'normal'],
  ['popover-foreground / popover (texto de popover/tooltip)', 'popover-foreground', 'popover', 'normal'],
];

function findBlocks(css, selector) {
  // Devuelve el contenido interior de TODOS los bloques `selector { ... }`
  // (puede haber más de uno, ej. dos `:root { }` en este archivo: uno con la
  // escala de color cruda y otro con los tokens semánticos).
  const blocks = [];
  const re = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{`, 'g');
  let m;
  while ((m = re.exec(css))) {
    const start = re.lastIndex - 1; // posición del `{`
    let depth = 0;
    let end = start;
    for (let i = start; i < css.length; i++) {
      if (css[i] === '{') depth++;
      if (css[i] === '}') {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    blocks.push(css.slice(start + 1, end));
  }
  return blocks;
}

function parseVars(block) {
  const vars = {};
  const re = /--([a-z0-9-]+):\s*([^;]+);/gi;
  let m;
  while ((m = re.exec(block))) {
    vars[m[1]] = m[2].trim();
  }
  return vars;
}

function loadTheme(css, selector) {
  const blocks = findBlocks(css, selector);
  if (blocks.length === 0) {
    throw new Error(`No se encontró ningún bloque "${selector} { ... }" en ${CSS_PATH}`);
  }
  return blocks.reduce((acc, block) => Object.assign(acc, parseVars(block)), {});
}

function isHex(value) {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
}

function checkTheme(themeName, vars) {
  const rows = [];
  for (const [label, fgVar, bgVar, size] of PAIRS) {
    const fg = vars[fgVar];
    const bg = vars[bgVar];
    if (!fg || !bg) {
      rows.push({ theme: themeName, label, status: 'SKIP', detail: `falta --${fgVar} o --${bgVar}` });
      continue;
    }
    if (!isHex(fg) || !isHex(bg)) {
      rows.push({
        theme: themeName,
        label,
        status: 'SKIP',
        detail: `valor no-hex (--${fgVar}: ${fg}, --${bgVar}: ${bg}) — el script solo resuelve hex literal`,
      });
      continue;
    }
    const ratio = contrastHex(fg, bg);
    const min = size === 'large' ? AA_LARGE : AA_NORMAL;
    const pass = ratio >= min;
    rows.push({
      theme: themeName,
      label,
      status: pass ? 'PASS' : 'FAIL',
      detail: `${ratio.toFixed(2)}:1 (mínimo AA ${size === 'large' ? '3:1' : '4.5:1'}) · ${fg} sobre ${bg}`,
    });
  }
  return rows;
}

function main() {
  const css = readFileSync(CSS_PATH, 'utf8');
  const lightVars = loadTheme(css, ':root');
  const darkVars = loadTheme(css, '[data-theme="dark"]');

  const allRows = [...checkTheme('light', lightVars), ...checkTheme('dark', darkVars)];

  const width = Math.max(...allRows.map((r) => r.label.length));
  console.log(`\nContraste WCAG AA — ${path.relative(process.cwd(), CSS_PATH)}\n`);

  let hasFail = false;
  for (const theme of ['light', 'dark']) {
    console.log(`── tema ${theme} ${'─'.repeat(60 - theme.length)}`);
    for (const row of allRows.filter((r) => r.theme === theme)) {
      const icon = row.status === 'PASS' ? '✓' : row.status === 'FAIL' ? '✗' : '·';
      console.log(`  ${icon} ${row.label.padEnd(width)}  ${row.detail}`);
      if (row.status === 'FAIL') hasFail = true;
    }
    console.log('');
  }

  if (hasFail) {
    console.error('FALLÓ: uno o más pares de color no llegan al contraste mínimo WCAG AA.\n');
    process.exit(1);
  }

  console.log('OK: todos los pares verificados cumplen WCAG AA.\n');
}

main();
