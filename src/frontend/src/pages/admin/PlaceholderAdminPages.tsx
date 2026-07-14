import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

/** Kept for future placeholder screens if needed. */
export function PlaceholderPage({ title }: { title: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">Coming in the next implementation phase.</p>
      </CardContent>
    </Card>
  )
}
