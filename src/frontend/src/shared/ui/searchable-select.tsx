import { Check, ChevronsUpDown } from 'lucide-react'
import { useId, useMemo, useState } from 'react'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover'

type SearchableSelectGroup<T> = {
  label: string
  items: readonly T[]
}

type SearchableSelectProps<T> = {
  items: readonly T[]
  groups?: readonly SearchableSelectGroup<T>[]
  value: string
  onValueChange: (value: string) => void
  placeholder: string
  searchPlaceholder: string
  emptyText?: string
  getLabel: (item: T) => string
  getValue: (item: T) => string
  getSearchText?: (item: T) => string
  onSearchChange?: (value: string) => void
  isLoading?: boolean
  loadingText?: string
  disabled?: boolean
  className?: string
}

export function SearchableSelect<T>({
  items,
  groups,
  value,
  onValueChange,
  placeholder,
  searchPlaceholder,
  emptyText = 'No results found.',
  getLabel,
  getValue,
  getSearchText,
  onSearchChange,
  isLoading = false,
  loadingText = 'Loading...',
  disabled = false,
  className,
}: SearchableSelectProps<T>) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const listId = useId()
  const selectedItem = useMemo(
    () => items.find((item) => getValue(item) === value),
    [getValue, items, value],
  )
  const displayedGroups = groups ?? [{ label: '', items }]

  return (
    <Popover
      modal={false}
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) {
          setSearch('')
          onSearchChange?.('')
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-label={selectedItem ? getLabel(selectedItem) : placeholder}
          disabled={disabled}
          className={cn(
            'h-8 w-full justify-between bg-background px-2.5 font-normal',
            !selectedItem && 'text-muted-foreground',
            className,
          )}
        >
          <span className="truncate">
            {selectedItem ? getLabel(selectedItem) : placeholder}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="z-[60] w-[var(--radix-popover-trigger-width)] gap-0 overflow-hidden p-0"
        onWheel={(event) => event.stopPropagation()}
      >
        <Command shouldFilter={!onSearchChange} className="max-h-80">
          <CommandInput
            value={search}
            onValueChange={(nextSearch) => {
              setSearch(nextSearch)
              onSearchChange?.(nextSearch)
            }}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
          <CommandList
            id={listId}
            className="max-h-64 overscroll-contain"
            onWheel={(event) => event.stopPropagation()}
          >
            <CommandEmpty>{isLoading ? loadingText : emptyText}</CommandEmpty>
            {displayedGroups.map((group, groupIndex) => (
              <CommandGroup
                key={`${group.label}-${groupIndex}`}
                heading={group.label || undefined}
                className="overflow-visible"
              >
                {group.items.map((item, itemIndex) => {
                  const itemValue = getValue(item)
                  const label = getLabel(item)
                  const searchText = getSearchText?.(item) ?? label

                  return (
                    <CommandItem
                      key={`${groupIndex}-${itemValue}-${itemIndex}`}
                      value={`${groupIndex} ${searchText} ${itemValue}`}
                      onSelect={() => {
                        onValueChange(itemValue)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          'size-4 shrink-0',
                          value === itemValue ? 'opacity-100' : 'opacity-0',
                        )}
                        aria-hidden="true"
                      />
                      <span className="truncate">{label}</span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export type { SearchableSelectGroup, SearchableSelectProps }
