import type { Table } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { cn } from '@/shared/lib/utils'

type DataTablePaginationProps<TData> = {
  table: Table<TData>
  pageSizeOptions?: number[]
}

function buildPageItems(pageIndex: number, pageCount: number): Array<number | 'ellipsis'> {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, i) => i)
  }

  const current = pageIndex
  const items: Array<number | 'ellipsis'> = [0]

  if (current > 2) {
    items.push('ellipsis')
  }

  const start = Math.max(1, current - 1)
  const end = Math.min(pageCount - 2, current + 1)

  for (let page = start; page <= end; page += 1) {
    items.push(page)
  }

  if (current < pageCount - 3) {
    items.push('ellipsis')
  }

  items.push(pageCount - 1)
  return items
}

export function DataTablePagination<TData>({
  table,
  pageSizeOptions = [10, 20, 50, 100],
}: DataTablePaginationProps<TData>) {
  const { t } = useTranslation('common')
  const pageCount = Math.max(1, table.getPageCount())
  const pageIndex = table.getState().pagination.pageIndex
  const pageSize = table.getState().pagination.pageSize
  const totalRows = table.getFilteredRowModel().rows.length
  const pageItems = buildPageItems(pageIndex, pageCount)

  return (
    <div className="flex items-center gap-3 border-t pt-3">
      <p className="flex-1 text-xs text-muted-foreground whitespace-nowrap">
        {t('table.totalRows', { count: totalRows })}
      </p>

      <div className="flex flex-1 items-center justify-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="size-7 p-0"
          disabled={!table.getCanPreviousPage()}
          onClick={() => table.previousPage()}
          aria-label={t('table.prevPage')}
        >
          ←
        </Button>

        {pageItems.map((item, index) =>
          item === 'ellipsis' ? (
            <span
              key={`ellipsis-${index}`}
              className="flex size-7 items-center justify-center text-sm text-muted-foreground"
            >
              …
            </span>
          ) : (
            <Button
              key={item}
              type="button"
              variant={item === pageIndex ? 'default' : 'outline'}
              size="xs"
              className={cn('size-7 p-0 font-medium tabular-nums')}
              onClick={() => table.setPageIndex(item)}
            >
              {item + 1}
            </Button>
          ),
        )}

        <Button
          type="button"
          variant="outline"
          size="xs"
          className="size-7 p-0"
          disabled={!table.getCanNextPage()}
          onClick={() => table.nextPage()}
          aria-label={t('table.nextPage')}
        >
          →
        </Button>
      </div>

      <div className="flex flex-1 items-center justify-end gap-2">
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {t('table.rowsPerPage')}
        </span>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => {
            table.setPageSize(Number(value))
          }}
        >
          <SelectTrigger
            size="sm"
            className="h-7 w-16 gap-1 px-2 text-xs [&_svg]:size-3.5"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
