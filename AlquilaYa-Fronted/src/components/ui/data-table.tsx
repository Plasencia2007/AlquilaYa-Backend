'use client';

import { useState } from 'react';
import {
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, Download } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { descargarCsv } from '@/lib/csv';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** Placeholder del buscador global; si se omite, no se muestra. */
  searchPlaceholder?: string;
  /** Columna sobre la que filtra el buscador global (por id). Default: la primera. */
  searchColumnId?: string;
  /** Estado vacío personalizado. */
  emptyMessage?: string;
  loading?: boolean;
  pageSize?: number;
  /**
   * Ítem 380: exportación CSV de la vista filtrada. `exportHeaders`/`exportRow` son explícitos
   * (en vez de leer `columns` en caliente) porque el header/celda de una `ColumnDef` puede ser
   * JSX — no hay forma genérica de bajarlo a texto plano.
   */
  exportFilename?: string;
  exportHeaders?: string[];
  exportRow?: (row: TData) => (string | number)[];
}

/**
 * Tabla genérica con orden, filtro y paginación (ítem 47 de MEJORAS.md) —
 * reemplaza las implementaciones a mano de UserDirectoryTable, CarrerasTable,
 * CatalogosTable, etc. Patrón oficial de shadcn sobre TanStack Table.
 */
export function DataTable<TData, TValue>({
  columns,
  data,
  searchPlaceholder,
  searchColumnId,
  emptyMessage = 'Sin resultados.',
  loading,
  pageSize = 10,
  exportFilename,
  exportHeaders,
  exportRow,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilterColumn, setGlobalFilterColumn] = useState('');

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    initialState: { pagination: { pageSize } },
    state: { sorting, columnVisibility },
  });

  const effectiveSearchColumnId = searchColumnId ?? columns[0]?.id;
  const searchColumn = effectiveSearchColumnId ? table.getColumn(effectiveSearchColumnId) : undefined;

  const canExport = !!(exportFilename && exportHeaders && exportRow);
  const handleExport = () => {
    if (!canExport) return;
    const filas = table.getFilteredRowModel().rows.map((r) => exportRow!(r.original));
    descargarCsv(exportFilename!, exportHeaders!, filas);
  };

  return (
    <div className="space-y-4">
      {(searchPlaceholder || columns.length > 3 || canExport) && (
        <div className="flex items-center justify-between gap-3">
          {searchPlaceholder && searchColumn && (
            <Input
              placeholder={searchPlaceholder}
              value={(searchColumn.getFilterValue() as string) ?? globalFilterColumn}
              onChange={(e) => {
                setGlobalFilterColumn(e.target.value);
                searchColumn.setFilterValue(e.target.value);
              }}
              className="h-10 max-w-sm"
            />
          )}
          <div className="ml-auto flex items-center gap-2">
            {canExport && (
              <Button type="button" variant="outline" className="gap-1" onClick={handleExport}>
                <Download className="size-4" aria-hidden /> Exportar
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-1">
                  Columnas <ChevronDown className="size-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sortable = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : sortable ? (
                        <button
                          type="button"
                          className="flex items-center gap-1 font-medium hover:text-foreground"
                          onClick={() => header.column.toggleSorting(sorted === 'asc')}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === 'asc' ? (
                            <ArrowUp className="size-3.5" aria-hidden />
                          ) : sorted === 'desc' ? (
                            <ArrowDown className="size-3.5" aria-hidden />
                          ) : (
                            <ArrowUpDown className="size-3.5 opacity-40" aria-hidden />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                  Cargando…
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()} ·{' '}
            {table.getFilteredRowModel().rows.length} registro(s)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
