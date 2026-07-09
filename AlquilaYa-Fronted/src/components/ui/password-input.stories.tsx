import { useState } from 'react';
import { PasswordInput } from './password-input';

export default {
  title: 'ui / PasswordInput',
};

export const Basic = () => {
  const [value, setValue] = useState('');
  return (
    <div className="max-w-sm">
      <PasswordInput
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Tu contraseña"
      />
    </div>
  );
};

export const ConIcono = () => {
  const [value, setValue] = useState('');
  return (
    <div className="max-w-sm">
      <PasswordInput
        showIcon
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Contraseña (login/reset-password)"
      />
    </div>
  );
};
