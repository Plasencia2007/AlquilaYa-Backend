import { Progress } from './progress';

export default {
  title: 'ui / Progress',
};

export const Niveles = () => (
  <div className="max-w-sm space-y-6">
    <Progress value={20} label="20% completo" />
    <Progress value={60} label="60% completo" />
    <Progress value={100} label="100% completo" />
  </div>
);
