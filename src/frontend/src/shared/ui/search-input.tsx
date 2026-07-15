import { Search } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'
import { Input } from '@/shared/ui/input'

export function SearchInput({ className, ...props }: ComponentProps<typeof Input>) {
  return (
    <div className="relative w-full">
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        className={cn('bg-card pl-9', className)}
        autoComplete="off"
        {...props}
      />
    </div>
  )
}
