import history from '@/generated/change-history.json'

export type ChangeHistoryEntry = {
  id: string
  title: string
  date: string
}

export const changeHistory = history as {
  count: number
  entries: ChangeHistoryEntry[]
}
