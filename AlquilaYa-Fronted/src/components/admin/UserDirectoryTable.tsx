'use client';

import React, { useState, useEffect } from 'react';
import { usuarioMasterService, UsuarioMaster } from '@/services/admin-user-service';
import { Badge } from '@/components/ui/legacy-badge';
import { Button } from '@/components/ui/legacy-button';
import { Card } from '@/components/ui/legacy-card';
import { Input } from '@/components/ui/legacy-input';

interface UserDirectoryTableProps {
  rol: 'ESTUDIANTE' | 'ARRENDADOR' | 'ADMIN';
  title: string;
  description: string;
}

export const UserDirectoryTable: React.FC<UserDirectoryTableProps> = ({ rol, title, description }) => {
  const [users, setUsers] = useState<UsuarioMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await usuarioMasterService.obtenerPorRol(rol);
      console.log(`📊 [DEBUG ADMIN] Usuarios cargados para ${rol}:`, data);
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [rol]);

  const handleBan = async (id: number) => {
    if (window.confirm('¿Estás seguro de que deseas banear a este usuario?')) {
      try {
        await usuarioMasterService.banearUsuario(id);
        await loadUsers();
      } catch (error) {
        alert('Error al banear usuario');
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿ELIMINAR PERMANENTEMENTE? Esta acción no se puede deshacer.')) {
      try {
        await usuarioMasterService.eliminarUsuario(id);
        await loadUsers();
      } catch (error) {
        alert('Error al eliminar usuario');
      }
    }
  };

  const filteredUsers = (users || []).filter(u => 
    u.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.correo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'ACTIVE': return <Badge variant="success">Activo</Badge>;
      case 'PENDING': return <Badge variant="warning">Pendiente</Badge>;
      case 'BANNED': return <Badge variant="error">Baneado</Badge>;
      default: return <Badge variant="outline">{estado}</Badge>;
    }
  };

  return (
    <Card padding="none" className="border border-slate-200 bg-white shadow-none rounded-xl overflow-hidden mb-6">
      {/* Header Section */}
      <div className="px-8 py-6 border-b border-slate-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h2>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] mt-1">
              {description} • {users.length} Registros
            </p>
          </div>
          <div className="w-full md:w-80">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-xl">search</span>
              <Input 
                placeholder="Buscar registros..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white border-slate-200 border rounded-lg pl-12 h-10 text-xs focus:ring-0 focus:border-primary transition-colors font-medium"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-slate-400 uppercase text-[9px] font-black tracking-widest bg-slate-50/50">
              <th className="py-4 px-8 border-b border-slate-100">Usuario</th>
              <th className="py-4 px-8 border-b border-slate-100">Identidad</th>
              <th className="py-4 px-8 border-b border-slate-100">Estado</th>
              <th className="py-4 px-8 border-b border-slate-100">WhatsApp</th>
              <th className="py-4 px-8 border-b border-slate-100 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="py-20 text-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Cargando base de datos...</span>
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-20 text-center">
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Sin resultados</span>
                </td>
              </tr>
            ) : filteredUsers.map(user => (
              <tr key={user.id} className="hover:bg-slate-50/30 transition-colors">
                <td className="py-4 px-8">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800 text-sm">{user.nombre} {user.apellido}</span>
                    <span className="text-[10px] font-medium text-slate-400">{user.correo}</span>
                  </div>
                </td>
                <td className="py-4 px-8">
                  <span className="text-[10px] font-bold text-slate-500 border border-slate-200 px-2 py-0.5 rounded-md">
                    DNI {user.dni || '---'}
                  </span>
                </td>
                <td className="py-4 px-8">
                  {getStatusBadge(user.estado)}
                </td>
                <td className="py-4 px-8">
                  <div className="flex items-center gap-2">
                     <span className={`w-1.5 h-1.5 rounded-full ${user.telefonoVerificado ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-tight">
                       {user.telefonoVerificado ? 'Verificado' : 'Pendiente'}
                     </span>
                  </div>
                </td>
                <td className="py-4 px-8 text-right">
                  <div className="flex items-center justify-end gap-1">
                     {user.estado === 'BANNED' ? (
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         onClick={() => {
                           if (window.confirm('¿Deseas restaurar el acceso?')) {
                             usuarioMasterService.activarUsuario(user.id).then(loadUsers);
                           }
                         }}
                         className="text-slate-300 hover:text-green-600 p-2 h-auto rounded-md"
                         title="Activar"
                       >
                         <span className="material-symbols-outlined text-lg">check_circle</span>
                       </Button>
                     ) : (
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         onClick={() => handleBan(user.id)}
                         className="text-slate-300 hover:text-red-500 p-2 h-auto rounded-md"
                         title="Banear"
                       >
                         <span className="material-symbols-outlined text-lg">block</span>
                       </Button>
                     )}
                     
                     <Button 
                       variant="ghost" 
                       size="sm" 
                       onClick={() => handleDelete(user.id)}
                       className="text-slate-300 hover:text-red-600 p-2 h-auto rounded-md"
                       title="Eliminar"
                     >
                       <span className="material-symbols-outlined text-lg">delete</span>
                     </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};
