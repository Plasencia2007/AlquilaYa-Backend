'use client';

import { useEffect, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle2, MoreHorizontal, ShieldOff, Trash2 } from 'lucide-react';

import { usuarioMasterService, type UsuarioMaster } from '@/services/admin-user-service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { notify } from '@/lib/notify';

interface UserDirectoryTableProps {
  rol: 'ESTUDIANTE' | 'ARRENDADOR' | 'ADMIN';
  title: string;
  description: string;
}

const ESTADO_BADGE: Record<UsuarioMaster['estado'], { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  ACTIVE: { label: 'Activo', variant: 'default', className: 'bg-success text-success-foreground hover:bg-success/90' },
  PENDING: { label: 'Pendiente', variant: 'default', className: 'bg-warning text-warning-foreground hover:bg-warning/90' },
  BANNED: { label: 'Baneado', variant: 'destructive' },
  SUSPENDED: { label: 'Suspendido', variant: 'default', className: 'bg-warning text-warning-foreground hover:bg-warning/90' },
  REJECTED: { label: 'Rechazado', variant: 'destructive' },
};

export function UserDirectoryTable({ rol, title, description }: UserDirectoryTableProps) {
  const [users, setUsers] = useState<UsuarioMaster[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await usuarioMasterService.obtenerPorRol(rol);
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      notify.error(err, 'No pudimos cargar los usuarios');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rol]);

  const handleActivar = async (id: number) => {
    if (!window.confirm('¿Deseas restaurar el acceso de este usuario?')) return;
    try {
      await usuarioMasterService.activarUsuario(id);
      notify.success('Usuario activado');
      await loadUsers();
    } catch (err) {
      notify.error(err, 'No se pudo activar al usuario');
    }
  };

  const handleBan = async (id: number) => {
    if (!window.confirm('¿Estás seguro de que deseas banear a este usuario?')) return;
    try {
      await usuarioMasterService.banearUsuario(id);
      notify.success('Usuario baneado');
      await loadUsers();
    } catch (err) {
      notify.error(err, 'No se pudo banear al usuario');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿ELIMINAR PERMANENTEMENTE? Esta acción no se puede deshacer.')) return;
    try {
      await usuarioMasterService.eliminarUsuario(id);
      notify.success('Usuario eliminado');
      await loadUsers();
    } catch (err) {
      notify.error(err, 'No se pudo eliminar al usuario');
    }
  };

  const columns: ColumnDef<UsuarioMaster>[] = [
    {
      id: 'nombre',
      accessorFn: (u) => `${u.nombre} ${u.apellido}`,
      header: 'Usuario',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="text-sm font-bold text-foreground">
            {row.original.nombre} {row.original.apellido}
          </span>
          <span className="text-[11px] text-muted-foreground">{row.original.correo}</span>
        </div>
      ),
    },
    {
      id: 'dni',
      accessorKey: 'dni',
      header: 'Identidad',
      cell: ({ row }) => (
        <span className="rounded-md border border-border px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
          DNI {row.original.dni || '---'}
        </span>
      ),
    },
    {
      id: 'estado',
      accessorKey: 'estado',
      header: 'Estado',
      cell: ({ row }) => {
        const meta = ESTADO_BADGE[row.original.estado];
        return (
          <Badge variant={meta.variant} className={meta.className}>
            {meta.label}
          </Badge>
        );
      },
    },
    {
      id: 'whatsapp',
      accessorKey: 'telefonoVerificado',
      header: 'WhatsApp',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span
            className={`size-1.5 rounded-full ${row.original.telefonoVerificado ? 'bg-success' : 'bg-muted-foreground/40'}`}
            aria-hidden
          />
          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {row.original.telefonoVerificado ? 'Verificado' : 'Pendiente'}
          </span>
        </div>
      ),
    },
    {
      id: 'acciones',
      header: () => <span className="sr-only">Acciones</span>,
      enableHiding: false,
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Más acciones">
                  <MoreHorizontal className="size-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {user.estado === 'BANNED' ? (
                  <DropdownMenuItem onClick={() => handleActivar(user.id)}>
                    <CheckCircle2 className="text-success" aria-hidden />
                    Activar
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => handleBan(user.id)}>
                    <ShieldOff aria-hidden />
                    Banear
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => handleDelete(user.id)} className="text-destructive focus:text-destructive">
                  <Trash2 aria-hidden />
                  Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  return (
    <Card className="mb-6 overflow-hidden">
      <CardHeader className="border-b border-border">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="text-xl font-black tracking-tight text-foreground">{title}</h2>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {description} · {users.length} registros
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <DataTable
          columns={columns}
          data={users}
          loading={loading}
          searchPlaceholder="Buscar por nombre o correo…"
          searchColumnId="nombre"
          emptyMessage="Sin resultados."
        />
      </CardContent>
    </Card>
  );
}
