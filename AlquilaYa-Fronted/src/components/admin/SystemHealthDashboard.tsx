import React, { useEffect, useState } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { adminService, SystemHealth } from '@/services/adminService';

const dataResources = [
  { time: '10:00', cpu: 12, ram: 45 }, { time: '10:05', cpu: 15, ram: 48 },
  { time: '10:10', cpu: 25, ram: 52 }, { time: '10:15', cpu: 20, ram: 50 },
  { time: '10:20', cpu: 45, ram: 65 }, { time: '10:25', cpu: 30, ram: 58 },
  { time: '10:30', cpu: 22, ram: 55 }, { time: '10:35', cpu: 18, ram: 50 },
];

const LOGS = [
  { time: '10:34:21', level: 'INFO', service: 'Gateway', msg: 'Petición /api/v1/auth/login procesada en 45ms' },
  { time: '10:34:25', level: 'WARN', service: 'Pagos', msg: 'Timeout parcial en conexión con pasarela externa' },
  { time: '10:35:01', level: 'ERROR', service: 'Redis', msg: 'Connection reset by peer. Reintentando en 5s...' },
  { time: '10:35:05', level: 'INFO', service: 'Usuarios', msg: 'Usuario @jhons logueado exitosamente' },
  { time: '10:35:10', level: 'INFO', service: 'Propiedades', msg: 'Nueva propiedad ID#4598 registrada' },
];

export default function SystemHealthDashboard() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [rawLogs, setRawLogs] = useState<string>('');

  useEffect(() => {
    const fetchHealth = async () => {
      const data = await adminService.getSystemHealth();
      setHealth(data);
      setLoading(false);
    };

    const fetchLogs = async () => {
      const logsText = await adminService.getSystemLogs();
      setRawLogs(logsText);
    };

    fetchHealth();
    fetchLogs();
    
    const intervalHealth = setInterval(fetchHealth, 10000);
    const intervalLogs = setInterval(fetchLogs, 5000); // Polling de logs más frecuente (5s)
    
    return () => {
      clearInterval(intervalHealth);
      clearInterval(intervalLogs);
    };
  }, []);

  // Función para parsear logs de Spring Boot y darles estilo
  const renderParsedLogs = () => {
    if (!rawLogs) return <div className="text-slate-500 italic opacity-50">Sincronizando flujo de datos técnicos...</div>;

    return rawLogs.split('\n').map((line, i) => {
      if (!line.trim()) return null;

      // Intento de detección de nivel y tiempo simple
      const isError = line.includes('ERROR');
      const isWarn = line.includes('WARN');
      const isInfo = line.includes('INFO');
      
      // Extraer tiempo si existe (formato HH:mm:ss)
      const timeMatch = line.match(/\d{2}:\d{2}:\d{2}/);
      const time = timeMatch ? timeMatch[0] : '--:--:--';

      // Limpiar texto (quitar paquetes largos de Java para legibilidad)
      const cleanLine = line.replace(/com\.alquilaya\.\S+/g, '..');

      return (
        <div key={i} className="flex gap-4 group border-l border-white/5 pl-2 hover:bg-white/5 transition-colors">
          <span className="text-slate-600 shrink-0 font-mono text-[10px]">[{time}]</span>
          <span className={`font-bold shrink-0 w-12 ${
            isError ? 'text-red-400' : isWarn ? 'text-amber-400' : 'text-emerald-400'
          }`}>
            {isError ? 'ERROR' : isWarn ? 'WARN' : isInfo ? 'INFO' : 'LOG'}
          </span>
          <span className="text-slate-300 break-all font-mono leading-relaxed">{cleanLine}</span>
        </div>
      );
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UP': return '#10b981';
      case 'WARN': return '#f59e0b';
      case 'DOWN': return '#ef4444';
      default: return '#94a3b8';
    }
  };

  return (
    <div className="space-y-6">
      {/* Services Status Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Estado de Microservicios (Realtime)</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Salud monitorizada vía Actuators</p>
          </div>
          <div className="flex items-center gap-3">
             {loading && <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>}
             <button className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-100 transition-colors">
               Auditar Infraestructura
             </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-100">
                <th className="px-8 py-4">Servicio</th>
                <th className="px-8 py-4">Estado</th>
                <th className="px-8 py-4">Uptime / Detalles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {health?.services.map((s, i) => (
                <tr key={i} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-8 py-5 text-xs font-black text-slate-700">{s.name}</td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getStatusColor(s.status) }}></div>
                      <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: getStatusColor(s.status) }}>{s.status}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-[11px] font-bold text-slate-400 uppercase">
                    {s.status === 'UP' ? 'Operativo' : 'Requiere Atención'}
                  </td>
                </tr>
              )) || (
                <tr>
                  <td colSpan={3} className="px-8 py-10 text-center text-xs text-slate-400 font-bold uppercase tracking-widest">
                    {loading ? 'Obteniendo telemetría...' : 'No se pudo conectar con el sistema de monitoreo'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resources Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 p-8 rounded-xl shadow-sm">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-8">Carga de CPU (%)</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dataResources}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" hide />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="stepAfter" dataKey="cpu" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white border border-slate-200 p-8 rounded-xl shadow-sm">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-8">Consumo RAM (GB)</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dataResources}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" hide />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="ram" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Live Logs Terminal */}
      <div className="bg-[#0f172a] rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/30"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/30"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/30"></div>
            </div>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em] ml-2">Console v1.1.0 (Live Proxy)</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest animate-pulse flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
              Streaming Live Logs
            </span>
          </div>
        </div>
        <div className="p-6 font-mono text-[11px] space-y-2 h-[350px] overflow-y-auto scrollbar-hide">
          {renderParsedLogs()}
          <div className="flex gap-4 animate-pulse pt-2">
            <span className="text-slate-600">[{new Date().toLocaleTimeString()}]</span>
            <span className="text-white">_</span>
          </div>
        </div>
      </div>
    </div>
  );
}
