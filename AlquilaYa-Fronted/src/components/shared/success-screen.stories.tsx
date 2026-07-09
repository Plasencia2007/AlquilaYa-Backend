import { SuccessScreen } from './success-screen';

export default {
  title: 'shared / SuccessScreen',
};

export const ContrasenaRestablecida = () => (
  <SuccessScreen
    title="¡Contraseña restablecida!"
    description="Tu contraseña ha sido actualizada exitosamente. Ya puedes iniciar sesión con tus nuevas credenciales."
    actionLabel="Iniciar sesión"
    onAction={() => {}}
  />
);

export const CorreoVerificado = () => (
  <SuccessScreen
    title="¡Correo verificado!"
    description="Tu correo quedó confirmado. Ya puedes iniciar sesión."
    actionLabel="Iniciar sesión"
    onAction={() => {}}
  />
);
