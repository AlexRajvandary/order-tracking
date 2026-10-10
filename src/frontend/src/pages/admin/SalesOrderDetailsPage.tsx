import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import * as salesOrdersApi from '@/features/orders/api/salesOrdersApi'
import { OrderDetailsPage } from '@/pages/admin/OrderDetailsPage'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'

export function SalesOrderDetailsPage() {
  const { t } = useTranslation()
  const { id = '' } = useParams()
  const query = useQuery({
    queryKey: ['sales-order', id],
    queryFn: ({ signal }) => salesOrdersApi.getSalesOrder(id, signal),
    enabled: Boolean(id),
  })

  if (query.isLoading) return <p className="text-sm text-muted-foreground">{t('loading')}</p>
  if (query.isError || !query.data) {
    return <div className="space-y-3"><Alert variant="destructive"><AlertDescription>{t('error')}</AlertDescription></Alert><Button variant="outline" onClick={() => void query.refetch()}>{t('retry')}</Button></div>
  }

  return <OrderDetailsPage key={query.data.id} requestId={query.data.workspaceRequestId} salesOrderId={id} displayTrackingCode={query.data.trackingCode} />
}
