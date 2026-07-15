import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type OnChangeFn,
  type PaginationState,
  type Row,
  type Updater,
  type VisibilityState,
} from '@tanstack/react-table'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/features/auth/model/AuthContext'
import { cn } from '@/shared/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'
import { DataTablePagination } from './DataTablePagination'
import { DataTableViewOptions } from './DataTableViewOptions'
import { multiValueFilterFn } from './utils'

type DataTableProps<TData> = {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  /** Stable id used to persist column visibility in browser + user settings. */
  tableId?: string
  pageSize?: number
  emptyMessage?: string
  toolbar?: React.ReactNode
  /** Replace the default toolbar row (search + columns). Receives the columns menu. */
  renderToolbar?: (nodes: { viewOptions: React.ReactNode }) => React.ReactNode
  /** Render the toolbar row into this element (e.g. above the card) instead of inline. */
  toolbarContainer?: HTMLElement | null
  className?: string
  paginationClassName?: string
  onRowClick?: (row: Row<TData>) => void
  getRowClassName?: (row: Row<TData>) => string | undefined
}

function resolveUpdater<T>(updater: Updater<T>, previous: T): T {
  return typeof updater === 'function' ? (updater as (old: T) => T)(previous) : updater
}

export function DataTable<TData>({
  columns,
  data,
  tableId,
  pageSize = 10,
  emptyMessage,
  toolbar,
  renderToolbar,
  toolbarContainer,
  className,
  paginationClassName,
  onRowClick,
  getRowClassName,
}: DataTableProps<TData>) {
  const { t } = useTranslation('common')
  const { isAuthenticated, getTableColumnVisibility, setTableColumnVisibility } = useAuth()
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() =>
    tableId && isAuthenticated ? getTableColumnVisibility(tableId) : {},
  )
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  })

  useEffect(() => {
    if (!tableId || !isAuthenticated) return
    setColumnVisibility(getTableColumnVisibility(tableId))
  }, [tableId, isAuthenticated, getTableColumnVisibility])

  const handleColumnFiltersChange: OnChangeFn<ColumnFiltersState> = (updater) => {
    setColumnFilters(updater)
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }

  const handleColumnVisibilityChange: OnChangeFn<VisibilityState> = (updater) => {
    setColumnVisibility((prev) => {
      const next = resolveUpdater(updater, prev)
      if (tableId && isAuthenticated) {
        setTableColumnVisibility(tableId, next)
      }
      return next
    })
  }

  const table = useReactTable({
    data,
    columns,
    state: {
      columnFilters,
      columnVisibility,
      pagination,
    },
    onColumnFiltersChange: handleColumnFiltersChange,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    defaultColumn: {
      filterFn: multiValueFilterFn,
      enableColumnFilter: true,
    },
  })

  const viewOptions = <DataTableViewOptions table={table} />

  const toolbarContent = renderToolbar ? (
    renderToolbar({ viewOptions })
  ) : (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0 flex-1 sm:max-w-xs">{toolbar}</div>
      {viewOptions}
    </div>
  )

  return (
    <div className={cn('space-y-4', className)}>
      {toolbarContainer ? createPortal(toolbarContent, toolbarContainer) : toolbarContent}

      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className={getRowClassName?.(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                {emptyMessage ?? t('table.empty')}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className={paginationClassName}>
        <DataTablePagination table={table} />
      </div>
    </div>
  )
}
