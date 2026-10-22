import { useQuery } from '@tanstack/react-query'
import { ImageOff, Pencil, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { OrderItem } from '../types'
import { getProcurements, getProcurementArchive } from '@/features/procurements/api/procurementsApi'
import { attachmentUrl } from '@/features/tracking/api/trackingApi'
import { formatMoney, isFiniteMoney } from '@/shared/lib/currency'
import { Button } from '@/shared/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

export function OrderItemsTable({ items, onAdd, onEdit, onDelete, deleting }: {
  items: OrderItem[]
  onAdd: () => void
  onEdit: (item: OrderItem) => void
  onDelete: (item: OrderItem) => void
  deleting: boolean
}) {
  const { t, i18n } = useTranslation('orders')
  const { t: tp } = useTranslation('procurements')
  const procurements = useQuery({
    queryKey: ['procurements', 'all'],
    queryFn: async ({ signal }) => {
      const [active, archive] = await Promise.all([
        getProcurements(signal),
        getProcurementArchive(signal),
      ])
      return [...active, ...archive]
    },
    enabled: items.length > 0,
  })
  const procurementByItem = new Map(procurements.data?.map((row) => [row.orderItemId, row]))

  return (
    <Table className="table-fixed border-0 bg-transparent max-lg:min-w-[1061px] lg:min-w-0 [&_tr>*:not(:last-child)]:border-r [&_tr>*:not(:last-child)]:border-border/60">
      <TableHeader>
        <TableRow className="bg-transparent hover:bg-transparent">
          <TableHead className="w-[168px] pl-0 text-xs text-muted-foreground">{t('details.itemsTable.photo')}</TableHead>
          <TableHead className="w-28 whitespace-normal wrap-anywhere text-xs text-muted-foreground lg:max-xl:w-[72px]">{t('details.itemsTable.name')}</TableHead>
          <TableHead className="w-28 whitespace-normal wrap-anywhere text-xs text-muted-foreground lg:max-xl:w-[72px]">{t('details.itemsTable.link')}</TableHead>
          <TableHead className="w-[200px] text-xs text-muted-foreground">{t('details.itemsTable.description')}</TableHead>
          <TableHead className="w-16 whitespace-normal text-right text-xs leading-tight text-muted-foreground">{t('details.itemsTable.quantity')}</TableHead>
          <TableHead className="w-[100px] text-right text-xs text-muted-foreground">{t('details.itemsTable.price')}</TableHead>
          <TableHead className="w-[100px] text-right text-xs text-muted-foreground">{t('details.itemsTable.total')}</TableHead>
          <TableHead className="w-[120px] text-xs text-muted-foreground">{t('details.itemsTable.status')}</TableHead>
          <TableHead className="w-[85px] text-xs text-muted-foreground">{t('details.itemsTable.actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {!items.length ? (
          <TableRow className="bg-transparent hover:bg-transparent">
            <TableCell colSpan={9} className="py-6 pl-0 text-muted-foreground">{t('details.noItems')}</TableCell>
          </TableRow>
        ) : items.map((item) => {
          const procurement = procurementByItem.get(item.id)
          return (
            <TableRow key={item.id} className="bg-transparent hover:bg-transparent">
              <TableCell className="py-1.5 pr-2 pl-0">
                <div className="relative flex h-14 w-16 items-center justify-center overflow-hidden rounded-md bg-muted/50 text-muted-foreground">
                  <ImageOff className="size-5" />
                  {item.imageUrl ? (
                    <img
                      key={item.imageUrl}
                      src={/^https?:\/\//i.test(item.imageUrl) ? item.imageUrl : attachmentUrl(item.imageUrl)}
                      alt={item.name}
                      loading="lazy"
                      className="absolute inset-0 size-full bg-white object-contain"
                      onError={(event) => { event.currentTarget.style.display = 'none' }}
                    />
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="whitespace-normal wrap-anywhere">
                <p className="font-medium">{item.name}</p>
                {item.productSource === 'Rakuten' ? <p className="mt-1 text-xs text-muted-foreground">Rakuten{item.shopName ? ' · ' + item.shopName : ''}</p> : null}
              </TableCell>
              <TableCell>
                {item.sourceUrl ? (
                  <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" title={item.sourceUrl} className="block truncate text-primary hover:underline">
                    {item.sourceUrl}
                  </a>
                ) : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="whitespace-normal wrap-anywhere text-muted-foreground">
                {item.description?.trim() || '—'}
              </TableCell>
              <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
              <TableCell className="text-right tabular-nums">
                {isFiniteMoney(item.unitPrice)
                  ? formatMoney(item.unitPrice, item.currencyCode ?? 'RUB', i18n.language.startsWith('ru') ? 'ru-RU' : 'en-US')
                  : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {isFiniteMoney(item.unitPrice)
                  ? formatMoney(item.unitPrice * item.quantity, item.currencyCode ?? 'RUB', i18n.language.startsWith('ru') ? 'ru-RU' : 'en-US')
                  : <span className="text-muted-foreground">—</span>}
              </TableCell>
              <TableCell className="whitespace-normal text-xs text-muted-foreground">
                {procurement ? procurement.status === 'SentToTransit'
                  ? t('details.itemsTable.sentToTransit')
                  : tp(`statuses.lifecycle.${procurement.status}`)
                  : procurements.isError ? t('details.itemsTable.statusError')
                    : procurements.isPending ? t('loading', { ns: 'common' })
                      : t('details.itemsTable.notInProcurement')}
              </TableCell>
              <TableCell className="px-1">
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon-sm" title={t('details.editItem')} aria-label={t('details.editItem')} onClick={() => onEdit(item)}><Pencil /></Button>
                  <Button variant="ghost" size="icon-sm" title={t('details.deleteItem')} aria-label={t('details.deleteItem')} disabled={deleting} onClick={() => onDelete(item)}><Trash2 className="text-destructive" /></Button>
                </div>
              </TableCell>
            </TableRow>
          )
        })}
        <TableRow className="border-0 bg-transparent hover:bg-transparent">
          <TableCell colSpan={9} className="py-2 pl-0">
            <Button
              type="button"
              variant="ghost"
              className="h-8 border-0 px-1.5 text-sm text-foreground shadow-none hover:bg-transparent hover:text-primary"
              onClick={onAdd}
            >
              <Plus className="size-4" />
              {t('details.addProduct')}
            </Button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  )
}
