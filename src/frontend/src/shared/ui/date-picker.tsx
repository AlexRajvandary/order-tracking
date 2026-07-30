import { format, isSameDay, startOfDay } from 'date-fns'
import { enUS, ru } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { useEffect, useId, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Calendar } from '@/shared/ui/calendar'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/shared/ui/carousel'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'

function useDateFnsLocale() {
  const { i18n } = useTranslation()
  return i18n.language?.startsWith('en') ? enUS : ru
}

export function formatYmd(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseYmdLocal(value: string | undefined | null): Date | undefined {
  if (!value) return undefined
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!match) return undefined
  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  const date = new Date(year, month, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return undefined
  }
  return date
}

type DatePickerProps = {
  value?: string
  onChange: (value: string | undefined) => void
  placeholder?: string
  disabled?: boolean
  id?: string
  className?: string
  align?: 'start' | 'center' | 'end'
}

export function DatePicker({
  value,
  onChange,
  placeholder,
  disabled,
  id,
  className,
  align = 'start',
}: DatePickerProps) {
  const { t } = useTranslation('common')
  const locale = useDateFnsLocale()
  const selected = parseYmdLocal(value)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          data-empty={!selected}
          className={cn(
            'w-full justify-start gap-2 text-left font-normal data-[empty=true]:text-muted-foreground',
            className,
          )}
        >
          <CalendarIcon className="size-4 shrink-0 opacity-70" />
          <span className="truncate">
            {selected
              ? format(selected, 'd MMM yyyy', { locale })
              : (placeholder ?? t('table.pickDate'))}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => onChange(date ? formatYmd(date) : undefined)}
          locale={locale}
        />
        {selected ? (
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              disabled={disabled}
              onClick={() => onChange(undefined)}
            >
              {t('table.clearDate')}
            </Button>
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

type DateTimePickerProps = {
  value?: string | null
  onChange: (iso: string | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  align?: 'start' | 'center' | 'end'
  /** Relative day shortcuts. Empty disables them. */
  dayPresets?: readonly number[]
  /** Highlights the order creation day in the calendar (selection is not limited by it). */
  orderCreatedAt?: string | null
}

const DEFAULT_DAY_PRESETS = [1, 3, 7, 14, 30] as const

/** Presets for status publish/history date (past and future). */
export const STATUS_HISTORY_DAY_PRESETS = [-7, -3, -1, 0, 1, 3, 7] as const

function toTimeParts(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    hours: pad(date.getHours()),
    minutes: pad(date.getMinutes()),
  }
}

function parseInstant(value: string | null | undefined): Date | undefined {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

export function DateTimePicker({
  value,
  onChange,
  placeholder,
  disabled,
  className,
  align = 'end',
  dayPresets = DEFAULT_DAY_PRESETS,
  orderCreatedAt,
}: DateTimePickerProps) {
  const { t } = useTranslation('common')
  const locale = useDateFnsLocale()
  const hoursId = useId()
  const minutesId = useId()
  const selected = parseInstant(value)
  const valid = selected
  const time = valid ? toTimeParts(valid) : toTimeParts(new Date())
  const [month, setMonth] = useState<Date>(valid ?? new Date())

  const orderCreatedDay = useMemo(() => {
    const created = parseInstant(orderCreatedAt)
    return created ? startOfDay(created) : undefined
  }, [orderCreatedAt])

  useEffect(() => {
    if (valid) setMonth(valid)
  }, [value])

  function commit(date: Date, hours: string, minutes: string) {
    const next = new Date(date)
    next.setHours(Number(hours) || 0, Number(minutes) || 0, 0, 0)
    onChange(next.toISOString())
  }

  function applyInDays(days: number) {
    const base = new Date()
    base.setDate(base.getDate() + days)
    setMonth(base)
    commit(base, time.hours, time.minutes)
  }

  function presetLabel(days: number) {
    if (days === 0) return t('table.now')
    if (days < 0) return t('table.daysAgo', { count: Math.abs(days) })
    return t('table.inDays', { count: days })
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          data-empty={!valid}
          className={cn(
            'h-8 min-w-0 flex-1 justify-end gap-2 text-right font-normal data-[empty=true]:text-muted-foreground',
            className,
          )}
        >
          <span className="min-w-0 flex-1 truncate">
            {valid
              ? format(valid, 'd MMM yyyy, HH:mm', { locale })
              : (placeholder ?? t('table.pickDateTime'))}
          </span>
          <CalendarIcon className="size-4 shrink-0 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[17.5rem] p-3" align={align}>
        {dayPresets.length > 0 ? (
          <Carousel
            opts={{ align: 'start', dragFree: true }}
            className="relative mb-3 w-full px-7"
          >
            <CarouselContent className="-ml-1">
              {dayPresets.map((days) => (
                <CarouselItem key={days} className="basis-auto pl-1">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-7 shrink-0 px-2 text-xs whitespace-nowrap"
                    disabled={disabled}
                    onClick={() => applyInDays(days)}
                  >
                    {presetLabel(days)}
                  </Button>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious
              type="button"
              className="left-0 size-6 border bg-background shadow-sm disabled:hidden"
            />
            <CarouselNext
              type="button"
              className="right-0 size-6 border bg-background shadow-sm disabled:hidden"
            />
          </Carousel>
        ) : null}

        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={valid}
          month={month}
          onMonthChange={setMonth}
          modifiers={{
            orderCreated: orderCreatedDay
              ? (date) => isSameDay(date, orderCreatedDay)
              : [],
          }}
          modifiersClassNames={{
            orderCreated:
              'bg-sky-100 text-sky-950 ring-1 ring-inset ring-sky-400/80 dark:bg-sky-950 dark:text-sky-50 dark:ring-sky-500/70',
            today:
              'bg-amber-100 text-amber-950 ring-1 ring-inset ring-amber-400/80 dark:bg-amber-950 dark:text-amber-50 dark:ring-amber-500/70',
          }}
          onSelect={(date) => {
            if (!date) {
              onChange(null)
              return
            }
            setMonth(date)
            commit(date, time.hours, time.minutes)
          }}
          locale={locale}
        />

        {orderCreatedDay ? (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-sm bg-amber-100 ring-1 ring-amber-400/80 dark:bg-amber-950 dark:ring-amber-500/70"
                aria-hidden
              />
              {t('table.calendarToday')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-sm bg-sky-100 ring-1 ring-sky-400/80 dark:bg-sky-950 dark:ring-sky-500/70"
                aria-hidden
              />
              {t('table.calendarOrderCreated')}
            </span>
          </div>
        ) : null}

        <div className="mt-3 flex items-end gap-2 border-t pt-3">
          <div className="space-y-1.5">
            <Label htmlFor={hoursId}>{t('table.hours')}</Label>
            <Input
              id={hoursId}
              type="number"
              min={0}
              max={23}
              className="h-8 w-16"
              value={time.hours}
              disabled={disabled || !valid}
              onChange={(e) => {
                if (!valid) return
                const hours = e.target.value.padStart(2, '0').slice(-2)
                commit(valid, hours, time.minutes)
              }}
            />
          </div>
          <span className="pb-1.5 text-muted-foreground">:</span>
          <div className="space-y-1.5">
            <Label htmlFor={minutesId}>{t('table.minutes')}</Label>
            <Input
              id={minutesId}
              type="number"
              min={0}
              max={59}
              className="h-8 w-16"
              value={time.minutes}
              disabled={disabled || !valid}
              onChange={(e) => {
                if (!valid) return
                const minutes = e.target.value.padStart(2, '0').slice(-2)
                commit(valid, time.hours, minutes)
              }}
            />
          </div>
          {valid ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="ml-auto"
              disabled={disabled}
              onClick={() => onChange(null)}
            >
              {t('table.clearDate')}
            </Button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  )
}
