import { CenteredSpinner } from './centered-spinner';
import { FullScreenLoader } from './full-screen-loader';

export default {
  title: 'shared / Loaders',
};

export const Centrado = () => <CenteredSpinner />;

/** FullScreenLoader es `position: fixed` a propósito (guards de ruta) — cada
 * story de Ladle vive en su propio iframe, así que aquí cubre solo el canvas. */
export const PantallaCompleta = () => <FullScreenLoader />;
