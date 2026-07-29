'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ColumnDef } from '@tanstack/react-table';
import { CheckCircle2, Eye, MoreHorizontal, ShieldOff, Trash2 } from 'lucide-react';

import { usuarioMasterService, type UsuarioMaster } from '@/services/admin-user-service';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusDot } from '@/components/ui/status-dot';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { notify } from '@/lib/notify';
import { useConfirm } from '@/hooks/use-confirm';

const TODOS_LOS_ESTADOS = 'TODOS';

/** Motivos frecuentes de baneo, para no forzar siempre texto libre en el confirm. */
const MOTIVOS_BANEO = [
  { nombre: 'Incumplimiento de los Términos y condiciones' },
  { nombre: 'Comportamiento fraudulento o suplantación' },
  { nombre: 'Reportes reiterados de otros usuarios' },
  { nombre: 'Contenido o mensajes inapropiados' },
];

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

const RUTA_INICIO_POR_ROL: Record<'ESTUDIANTE' | 'ARRENDADOR', string> = {
  ESTUDIANTE: '/student',
  ARRENDADOR: '/landlord/dashboard',
};

export function UserDirectoryTable({ rol, title, description }: UserDirectoryTableProps) {
  const [users, setUsers] = useState<UsuarioMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [estadoFiltro, setEstadoFiltro] = useState<string>(TODOS_LOS_ESTADOS);
  const { confirm, ConfirmDialog } = useConfirm();
  const { iniciarImpersonacion } = useAuth();
  const router = useRouter();

  // Ítem 379: nunca se puede impersonar a un ADMIN (el backend lo rechaza igual, esto solo
  // evita mostrar una acción que sabemos que va a fallar).
  const handleVerComo = async (usuarioId: number) => {
    try {
      await iniciarImpersonacion(usuarioId);
      router.push(RUTA_INICIO_POR_ROL[rol as 'ESTUDIANTE' | 'ARRENDADOR']);
    } catch (err) {
      notify.error(err, 'No se pudo iniciar la vista como este usuario');
    }
  };

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

  const handleActivar = (id: number) => {
    confirm({
      title: '¿Restaurar el acceso de este usuario?',
      description: 'El usuario podrá volver a iniciar sesión y usar la plataforma con normalidad.',
      confirmLabel: 'Activar',
      tone: 'success',
      onConfirm: async () => {
        try {
          await usuarioMasterService.activarUsuario(id);
          notify.success('Usuario activado');
          await loadUsers();
        } catch (err) {
          notify.error(err, 'No se pudo activar al usuario');
        }
      },
    });
  };

  const handleBan = (id: number) => {
    confirm({
      title: '¿Banear a este usuario?',
      description: 'Perderá acceso inmediato a la plataforma hasta que lo reactives manualmente.',
      confirmLabel: 'Banear',
      tone: 'danger',
      requireReason: true,
      predefinedReasons: MOTIVOS_BANEO,
      reasonPlaceholder: 'Describe el motivo del baneo…',
      onConfirm: async (motivo) => {
        try {
          await usuarioMasterService.banearUsuario(id, motivo ?? '');
          notify.success('Usuario baneado');
          await loadUsers();
        } catch (err) {
          notify.error(err, 'No se pudo banear al usuario');
        }
      },
    });
  };

  const handleDelete = (id: number) => {
    confirm({
      title: 'Eliminar usuario permanentemente',
      description: 'Esta acción no se puede deshacer. Se perderán todos los datos asociados a esta cuenta.',
      confirmLabel: 'Eliminar',
      tone: 'danger',
      onConfirm: async () => {
        try {
          await usuarioMasterService.eliminarUsuario(id);
          notify.success('Usuario eliminado');
          await loadUsers();
        } catch (err) {
          notify.error(err, 'No se pudo eliminar al usuario');
        }
      },
    });
  };

  const filteredUsers = useMemo(
    () =>
      estadoFiltro === TODOS_LOS_ESTADOS
        ? users
        : users.filter((u) => u.estado === estadoFiltro),
    [users, estadoFiltro],
  );

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
        <StatusDot
          status={row.original.telefonoVerificado ? 'success' : 'neutral'}
          label={row.original.telefonoVerificado ? 'Verificado' : 'Pendiente'}
        />
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
                {rol !== 'ADMIN' && (
                  <DropdownMenuItem onClick={() => handleVerComo(user.id)}>
                    <Eye aria-hidden />
                    Ver como este usuario
                  </DropdownMenuItem>
                )}
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
              {description} · {filteredUsers.length} registros
            </p>
          </div>
          <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
            <SelectTrigger className="w-full md:w-48">
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS_LOS_ESTADOS}>Todos los estados</SelectItem>
              {(Object.keys(ESTADO_BADGE) as UsuarioMaster['estado'][]).map((estado) => (
                <SelectItem key={estado} value={estado}>
                  {ESTADO_BADGE[estado].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <DataTable
          columns={columns}
          data={filteredUsers}
          loading={loading}
          searchPlaceholder="Buscar por nombre o correo…"
          searchColumnId="nombre"
          emptyMessage="Sin resultados."
          exportFilename={`usuarios-${rol.toLowerCase()}.csv`}
          exportHeaders={['Nombre', 'Apellido', 'Correo', 'DNI', 'Estado', 'WhatsApp verificado']}
          exportRow={(u) => [
            u.nombre,
            u.apellido,
            u.correo,
            u.dni || '',
            ESTADO_BADGE[u.estado].label,
            u.telefonoVerificado ? 'Sí' : 'No',
          ]}
        />
      </CardContent>
      {ConfirmDialog}
    </Card>
  );
}
