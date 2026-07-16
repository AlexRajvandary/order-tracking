import type { QueryClient } from '@tanstack/react-query'

type WithId = { id: string; isOnline?: boolean }

function sameId(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase()
}

function patchEntity<T extends WithId>(entity: T, id: string, isOnline: boolean): T {
  return sameId(entity.id, id) ? { ...entity, isOnline } : entity
}

/**
 * Patches every cached query under `keyPrefix` that either holds an array of entities or a
 * paginated `{ items: [] }` shape or a single entity, flipping the online flag for `id`.
 * This gives an instant UI update without waiting for a refetch.
 */
export function patchPresence(
  queryClient: QueryClient,
  keyPrefix: string,
  id: string,
  isOnline: boolean,
) {
  queryClient.setQueriesData<unknown>({ queryKey: [keyPrefix] }, (old: unknown) => {
    if (!old || typeof old !== 'object') return old

    if (Array.isArray(old)) {
      return (old as WithId[]).map((e) => patchEntity(e, id, isOnline))
    }

    const record = old as { items?: unknown; id?: string }
    if (Array.isArray(record.items)) {
      return { ...record, items: (record.items as WithId[]).map((e) => patchEntity(e, id, isOnline)) }
    }

    if (typeof record.id === 'string') {
      return patchEntity(record as WithId, id, isOnline)
    }

    return old
  })
}
