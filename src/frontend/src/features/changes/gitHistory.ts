import history from '@/generated/git-history.json'

export type GitCommit = {
  hash: string
  shortHash: string
  author: string
  date: string
  subject: string
}

export const gitHistory = history as {
  count: number
  commits: GitCommit[]
}
