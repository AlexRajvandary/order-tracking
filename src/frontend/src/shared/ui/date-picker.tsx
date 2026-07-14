import { format } from 'date-fns'
import { enUS, ru } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { Calendar } from '@/shared/ui/calendar'
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
}

function toTimeParts(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    hours: pad(date.getHours()),
    minutes: pad(date.getMinutes()),
  }
}

export function DateTimePicker({
  value,
  onChange,
  placeholder,
  disabled,
  className,
  align = 'end',
}: DateTimePickerProps) {
  const { t } = useTranslation('common')
  const locale = useDateFnsLocale()
  const selected = value ? new Date(value) : undefined
  const valid = selected && !Number.isNaN(selected.getTime()) ? selected : undefined
  const time = valid ? toTimeParts(valid) : { hours: '12', minutes: '00' }

  function commit(date: Date, hours: string, minutes: string) {
    const next = new Date(date)
    next.setHours(Number(hours) || 0, Number(minutes) || 0, 0, 0)
    onChange(next.toISOString())
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
      <PopoverContent className="w-auto p-3" align={align}>
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={valid}
          defaultMonth={valid}
          onSelect={(date) => {
            if (!date) {
              onChange(null)
              return
            }
            commit(date, time.hours, time.minutes)
          }}
          locale={locale}
        />
        <div className="mt-3 flex items-end gap-2 border-t pt-3">
          <div className="space-y-1.5">
            <Label htmlFor="datetime-hours">{t('table.hours')}</Label>
            <Input
              id="datetime-hours"
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
            <Label htmlFor="datetime-minutes">{t('table.minutes')}</Label>
            <Input
              id="datetime-minutes"
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
