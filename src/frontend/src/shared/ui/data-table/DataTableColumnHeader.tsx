import { CalendarDays, Filter } from 'lucide-react'
import type { Column, Table } from '@tanstack/react-table'
import type { DateRange } from 'react-day-picker'
import { useTranslation } from 'react-i18next'
import { enUS, ru } from 'date-fns/locale'
import { Button } from '@/shared/ui/button'
import { Calendar } from '@/shared/ui/calendar'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'
import { formatYmd, parseYmdLocal } from '@/shared/ui/date-picker'
import { cn } from '@/shared/lib/utils'
import {
  collectUniqueColumnValues,
  EMPTY_FILTER_VALUE,
  isDateRangeFilterActive,
  type DateRangeFilterValue,
} from './utils'

type DataTableColumnHeaderProps<TData, TValue> = {
  column: Column<TData, TValue>
  table: Table<TData>
  title: string
  className?: string
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  table,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  const { t, i18n } = useTranslation('common')
  const locale = i18n.language?.startsWith('en') ? enUS : ru

  if (!column.getCanFilter()) {
    return <div className={cn('font-medium', className)}>{title}</div>
  }

  const filterVariant = column.columnDef.meta?.filterVariant ?? 'multiSelect'

  if (filterVariant === 'dateRange') {
    const range = (column.getFilterValue() as DateRangeFilterValue | undefined) ?? {}
    const active = isDateRangeFilterActive(range)
    const selected: DateRange | undefined =
      range.from || range.to
        ? {
            from: parseYmdLocal(range.from),
            to: parseYmdLocal(range.to),
          }
        : undefined

    const applyRange = (nextRange: DateRange | undefined) => {
      if (!nextRange?.from && !nextRange?.to) {
        column.setFilterValue(undefined)
        return
      }
      column.setFilterValue({
        from: nextRange.from ? formatYmd(nextRange.from) : undefined,
        to: nextRange.to ? formatYmd(nextRange.to) : undefined,
      } satisfies DateRangeFilterValue)
    }

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              'h-8 w-full justify-between gap-2 px-1 font-medium data-[state=open]:bg-accent',
              active && 'text-primary',
              className,
            )}
          >
            <span className="truncate text-left">{title}</span>
            <CalendarDays
              className={cn('size-3.5 shrink-0 opacity-60', active && 'opacity-100')}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-auto p-3"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <p className="mb-2 text-sm font-medium">{t('table.dateFilter')}</p>
          <Calendar
            mode="range"
            captionLayout="dropdown"
            numberOfMonths={1}
            selected={selected}
            defaultMonth={selected?.from ?? selected?.to}
            onSelect={applyRange}
            locale={locale}
          />
          <p className="mt-2 text-xs text-muted-foreground">{t('table.dateHint')}</p>
          {active ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 w-full justify-start px-0"
              onClick={() => column.setFilterValue(undefined)}
            >
              {t('table.clearFilter')}
            </Button>
          ) : null}
        </PopoverContent>
      </Popover>
    )
  }

  const selected = (column.getFilterValue() as string[] | undefined) ?? []
  const options = collectUniqueColumnValues(table.getCoreRowModel().rows, column.id)
  const active = selected.length > 0

  const toggleValue = (value: string, checked: boolean) => {
    const next = new Set(selected)
    if (checked) next.add(value)
    else next.delete(value)
    const list = Array.from(next)
    column.setFilterValue(list.length ? list : undefined)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 w-full justify-between gap-2 px-1 font-medium data-[state=open]:bg-accent',
            active && 'text-primary',
            className,
          )}
        >
          <span className="truncate text-left">{title}</span>
          <Filter className={cn('size-3.5 shrink-0 opacity-60', active && 'opacity-100')} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-72 w-56 overflow-y-auto">
        <DropdownMenuLabel>{t('table.filter')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.length === 0 ? (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">{t('table.noFilterValues')}</p>
        ) : (
          options.map((value) => (
            <DropdownMenuCheckboxItem
              key={value}
              checked={selected.includes(value)}
              onCheckedChange={(checked) => toggleValue(value, Boolean(checked))}
              onSelect={(e) => e.preventDefault()}
            >
              <span className="truncate">
                {value === EMPTY_FILTER_VALUE ? t('table.emptyValue') : value}
              </span>
            </DropdownMenuCheckboxItem>
          ))
        )}
        {active ? (
          <>
            <DropdownMenuSeparator />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start"
              onClick={() => column.setFilterValue(undefined)}
            >
              {t('table.clearFilter')}
            </Button>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
