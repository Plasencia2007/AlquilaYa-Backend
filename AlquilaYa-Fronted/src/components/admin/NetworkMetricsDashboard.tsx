'use client';

import React from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';

const dataLatencia = [
  { time: '10:00', ms: 45 }, { time: '10:01', ms: 52 }, { time: '10:02', ms: 48 },
  { time: '10:03', ms: 61 }, { time: '10:04', ms: 55 }, { time: '10:05', ms: 42 },
  { time: '10:06', ms: 50 }, { time: '10:07', ms: 47 }, { time: '10:08', ms: 49 },
  { time: '10:09', ms: 53 }, { time: '10:10', ms: 45 }, { time: '10:11', ms: 42 },
];

const dataTrafico = [
  { time: '10:00', req: 120 }, { time: '10:01', req: 150 }, { time: '10:02', req: 200 },
  { time: '10:03', req: 180 }, { time: '10:04', req: 220 }, { time: '10:05', req: 300 },
  { time: '10:06', req: 250 }, { time: '10:07', req: 280 }, { time: '10:08', req: 320 },
  { time: '10:09', req: 290 }, { time: '10:10', req: 310 }, { time: '10:11', req: 350 },
];

const dataEstados = [
  { name: 'Éxito (2xx)', value: 95, color: '#10b981' },
  { name: 'Errores (5xx)', value: 3, color: '#ef4444' },
  { name: 'Otros', value: 2, color: '#94a3b8' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 p-3 shadow-none rounded-lg">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-sm font-black text-primary">
          {payload[0].value} {payload[0].name === 'ms' ? 'ms' : 'req/s'}
        </p>
      </div>
    );
  }
  return null;
};

export default function NetworkMetricsDashboard() {
  return (
    <div className="space-y-6">
      {/* Top Cards Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Latencia Media', value: '48ms', sub: '-2ms hoy', trend: 'up' },
          { label: 'Uptime Sistema', value: '99.98%', sub: 'Microservicios OK', trend: 'up' },
          { label: 'Errores 500', value: '0.02%', sub: 'Bajo control', trend: 'down' },
          { label: 'Peticiones/Seg', value: '342', sub: '+12% vs ayer', trend: 'up' },
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-slate-200 p-6 rounded-xl">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{stat.label}</p>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-black text-slate-900 tracking-tighter">{stat.value}</span>
              <span className={`text-[10px] font-bold ${stat.trend === 'up' && stat.label.includes('Errores') ? 'text-red-500' : 'text-green-500'}`}>
                {stat.sub}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latency Chart */}
        <div className="bg-white border border-slate-200 p-8 rounded-xl h-[400px] flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Latencia de Red (Realtime)</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Tiempo de respuesta del API Gateway</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">Live</span>
            </div>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dataLatencia}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="time" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                  dx={-10}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  name="ms"
                  type="monotone" 
                  dataKey="ms" 
                  stroke="#ef4444" 
                  strokeWidth={3} 
                  dot={false}
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#ef4444' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Traffic Chart */}
        <div className="bg-white border border-slate-200 p-8 rounded-xl h-[400px] flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Tráfico de Peticiones</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Carga transaccional global</p>
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Últimos 15 min</span>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dataTrafico}>
                <defs>
                  <linearGradient id="colorReq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="time" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                  dx={-10}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  name="req"
                  type="monotone" 
                  dataKey="req" 
                  stroke="#3b82f6" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorReq)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* HTTP Status Distribution */}
      <div className="bg-white border border-slate-200 p-8 rounded-xl">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-8">Distribución de Estados HTTP</h3>
        <div className="flex flex-col md:flex-row items-center gap-12">
          <div className="w-full md:w-1/3 h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataEstados}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {dataEstados.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
            {dataEstados.map((estado, i) => (
              <div key={i} className="flex flex-col border-l-2 border-slate-100 pl-6 py-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{estado.name}</span>
                <span className="text-2xl font-black text-slate-900">{estado.value}%</span>
                <div className={`mt-3 h-1 w-12 rounded-full`} style={{ backgroundColor: estado.color }}></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
