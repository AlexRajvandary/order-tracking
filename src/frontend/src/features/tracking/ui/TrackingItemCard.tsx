import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { PublicTrackingItem } from '@/features/tracking/api/trackingApi'
import { attachmentUrl } from '@/features/tracking/api/trackingApi'
import { groupTrackingItemsByStage, TRACKING_STAGES } from '@/features/tracking/lib/trackingProgress'
import { Card, CardContent } from '@/shared/ui/card'
import { Dialog, DialogContent, DialogTitle } from '@/shared/ui/dialog'
import { Check } from 'lucide-react'

function TrackingProgress({ progress }: { progress: number }) {
  const { t } = useTranslation('tracking')
  return (
    <div className="min-w-0 w-full pt-3" role="list" aria-label={t('progressLabel')}>
      <div className="flex items-start">
        {TRACKING_STAGES.map((stage, index) => {
          const complete = index < progress
          const active = index === progress
          return (
            <div key={stage} role="listitem" aria-current={active ? 'step' : undefined} className="relative flex min-w-0 flex-1 basis-0 flex-col items-center">
              {index < TRACKING_STAGES.length - 1 ? (
                <span aria-hidden="true" className={`absolute left-1/2 right-[-50%] top-[6px] h-px ${complete ? 'bg-slate-500' : 'bg-slate-200'}`} />
              ) : null}
              <span aria-hidden="true" className={`relative z-10 flex size-3 items-center justify-center rounded-full ${complete ? 'bg-slate-600 text-white' : active ? 'border-2 border-blue-500 bg-white' : 'border border-slate-300 bg-white'}`}>
                {complete ? <Check className="size-2" strokeWidth={3} /> : active ? <span className="size-1 rounded-full bg-blue-500" /> : null}
              </span>
              <span className={`mt-1 max-w-[56px] text-center text-[9px] leading-tight ${active ? 'font-medium text-blue-600' : complete ? 'text-slate-500' : 'text-slate-400'}`}>{t(`customerStages.${stage}`)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function TrackingItemContent({ item }: { item: PublicTrackingItem }) {
  const { t } = useTranslation('tracking')
  const [imageFailed, setImageFailed] = useState(false)
  const [imageOpen, setImageOpen] = useState(false)
  const imageUrl = item.imageUrl
    ? /^https?:\/\//i.test(item.imageUrl)
      ? item.imageUrl
      : attachmentUrl(item.imageUrl)
    : null

  return (
    <div className="flex min-w-0 items-start gap-3">
      {item.type === 'Product' && imageUrl && !imageFailed ? (
        <>
          <button
            type="button"
            className="shrink-0 cursor-zoom-in rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={t('expandPhoto')}
            onClick={() => setImageOpen(true)}
          >
            <img
              src={imageUrl}
              alt={item.name}
              className="size-[88px] rounded-lg border bg-white object-contain"
              loading="lazy"
              onError={() => setImageFailed(true)}
            />
          </button>
          <Dialog open={imageOpen} onOpenChange={setImageOpen}>
            <DialogContent showCloseButton className="max-w-[min(92vw,900px)] border-0 bg-transparent p-0 shadow-none ring-0">
              <DialogTitle className="sr-only">{item.name}</DialogTitle>
              <img src={imageUrl} alt={item.name} className="max-h-[85vh] w-full rounded-lg object-contain" />
            </DialogContent>
          </Dialog>
        </>
      ) : null}
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold">{item.name}</h3>
        {item.type === 'Product' ? (
          <p className="text-xs text-muted-foreground">
            {t('quantity')}: {item.quantity}
          </p>
        ) : null}
      </div>
    </div>
  )
}

export function TrackingItemCard({ item }: { item: PublicTrackingItem }) {
  return (
    <Card>
      <CardContent>
        <TrackingItemContent item={item} />
      </CardContent>
    </Card>
  )
}

export function TrackingItemsCard({ items }: { items: PublicTrackingItem[] }) {
  const { t } = useTranslation('tracking')
  const groups = groupTrackingItemsByStage(items)

  return (
    <Card>
      <CardContent className="space-y-3 p-3">
        {groups.map((group) => (
          <section key={group.key} className="min-w-0">
            <h3 className="text-sm font-semibold text-foreground">
              {group.stageIndex === null
                ? group.items[0]?.currentStatus || t('unknownStage')
                : t(`customerStages.${TRACKING_STAGES[group.stageIndex]}`)}
            </h3>
            {group.stageIndex !== null ? <TrackingProgress progress={group.progress} /> : null}
            <div className="mt-3 space-y-3">
              {group.items.map((item) => (
                <TrackingItemContent key={item.id} item={item} />
              ))}
            </div>
          </section>
        ))}
      </CardContent>
    </Card>
  )
}
