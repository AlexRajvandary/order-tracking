import type { Row, RowData } from '@tanstack/react-table'

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    label?: string
    filterVariant?: 'multiSelect' | 'text' | 'numberRange' | 'dateRange'
  }
}

export const EMPTY_FILTER_VALUE = '__empty__'

export type DateRangeFilterValue = {
  from?: string
  to?: string
}

export type NumberRangeFilterValue = {
  min?: number
  max?: number
}

export function normalizeFilterValue(value: unknown): string {
  if (value == null) return EMPTY_FILTER_VALUE
  const text = String(value).trim()
  return text.length === 0 ? EMPTY_FILTER_VALUE : text
}

export function multiValueFilterFn<TData>(
  row: Row<TData>,
  columnId: string,
  filterValue: unknown,
): boolean {
  if (!Array.isArray(filterValue) || filterValue.length === 0) {
    return true
  }
  const selected = filterValue as string[]
  return selected.includes(normalizeFilterValue(row.getValue(columnId)))
}

export function textSearchFilterFn<TData>(row: Row<TData>, columnId: string, filterValue: unknown): boolean {
  const search = String(filterValue ?? '').trim().toLocaleLowerCase()
  if (!search) return true
  return String(row.getValue(columnId) ?? '').toLocaleLowerCase().includes(search)
}

export function numberRangeFilterFn<TData>(row: Row<TData>, columnId: string, filterValue: unknown): boolean {
  const range = filterValue as NumberRangeFilterValue | undefined
  if (range == null || (range.min == null && range.max == null)) return true
  const value = Number(row.getValue(columnId))
  if (!Number.isFinite(value)) return false
  if (range.min != null && value < range.min) return false
  if (range.max != null && value > range.max) return false
  return true
}

export function collectUniqueColumnValues<TData>(
  rows: Array<Row<TData>>,
  columnId: string,
): string[] {
  const values = new Set<string>()
  for (const row of rows) {
    values.add(normalizeFilterValue(row.getValue(columnId)))
  }
  return Array.from(values).sort((a, b) => {
    if (a === EMPTY_FILTER_VALUE) return 1
    if (b === EMPTY_FILTER_VALUE) return -1
    return a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true })
  })
}

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function parseDateValue(value: unknown): Date | null {
  if (value == null || value === '') return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  const parsed = new Date(String(value))
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function parseYmd(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  const date = new Date(year, month, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null
  }
  return date.getTime()
}

export function isDateRangeFilterActive(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const range = value as DateRangeFilterValue
  return Boolean(range.from || range.to)
}

export function dateRangeFilterFn<TData>(
  row: Row<TData>,
  columnId: string,
  filterValue: unknown,
): boolean {
  if (!isDateRangeFilterActive(filterValue)) {
    return true
  }

  const range = filterValue as DateRangeFilterValue
  const rowDate = parseDateValue(row.getValue(columnId))
  if (!rowDate) return false

  const rowDay = startOfLocalDay(rowDate)

  if (range.from) {
    const from = parseYmd(range.from)
    if (from == null || rowDay < from) return false
  }

  if (range.to) {
    const to = parseYmd(range.to)
    if (to == null || rowDay > to) return false
  }

  return true
}
