import type { QueryClient } from '@tanstack/react-query'

export type RealtimeTopic = 'orders' | 'customers' | 'admins' | 'statuses' | 'dashboard'

const TOPIC_QUERY_KEYS: Record<RealtimeTopic, string[][]> = {
  orders: [['orders'], ['order'], ['order-status-history']],
  customers: [['customers'], ['customer']],
  admins: [['admins']],
  statuses: [['statuses']],
  dashboard: [['dashboard-summary']],
}

export function invalidateTopics(queryClient: QueryClient, topics: readonly string[]) {
  const seen = new Set<string>()

  for (const topic of topics) {
    const keys = TOPIC_QUERY_KEYS[topic as RealtimeTopic]
    if (!keys) continue

    for (const key of keys) {
      const id = key.join('|')
      if (seen.has(id)) continue
      seen.add(id)
      void queryClient.invalidateQueries({ queryKey: key })
    }
  }
}
