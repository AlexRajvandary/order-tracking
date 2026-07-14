import { ImagePlus, RefreshCw, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import * as statusesApi from '@/features/statuses/api/statusesApi'
import type { StatusHistoryAttachment } from '@/features/statuses/types'
import { attachmentUrl } from '@/features/tracking/api/trackingApi'
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTrigger,
} from '@/shared/ui/attachment'
import { Button } from '@/shared/ui/button'
import { Progress } from '@/shared/ui/progress'
import { cn } from '@/shared/lib/utils'
import { compressImagesToWebp } from '@/shared/lib/compressImageToWebp'

type PendingPhotoUpload = {
  localId: string
  file: File
  previewUrl: string
  progress: number
  state: 'uploading' | 'error'
}

type StatusHistoryAttachmentsProps = {
  orderId: string
  historyId: string
  attachments: StatusHistoryAttachment[]
  onPhotosUploaded: () => void
}

const photoAttachmentClassName =
  'w-24 gap-0 overflow-hidden p-0 has-data-[slot=attachment-media]:p-0'

const photoMediaClassName =
  'aspect-square w-full rounded-none opacity-100 group-data-[size=sm]/attachment:w-full'

export function StatusHistoryAttachments({
  orderId,
  historyId,
  attachments,
  onPhotosUploaded,
}: StatusHistoryAttachmentsProps) {
  const { t: ts } = useTranslation('statuses')
  const [pending, setPending] = useState<PendingPhotoUpload[]>([])
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())
  const pendingRef = useRef(pending)
  pendingRef.current = pending

  useEffect(() => {
    return () => {
      pendingRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl))
    }
  }, [])

  async function uploadSelected(files: File[]) {
    if (!files.length) return

    const compressed = await compressImagesToWebp(files)

    const nextPending: PendingPhotoUpload[] = compressed.map((file) => ({
      localId: `${historyId}-${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
      file,
      previewUrl: URL.createObjectURL(file),
      progress: 0,
      state: 'uploading',
    }))

    setPending((prev) => [...prev, ...nextPending])

    for (const item of nextPending) {
      try {
        await statusesApi.addStatusHistoryPhoto(orderId, historyId, item.file, (percent) => {
          setPending((prev) =>
            prev.map((row) =>
              row.localId === item.localId ? { ...row, progress: percent } : row,
            ),
          )
        })

        setPending((prev) => {
          URL.revokeObjectURL(item.previewUrl)
          return prev.filter((row) => row.localId !== item.localId)
        })
        onPhotosUploaded()
      } catch {
        setPending((prev) =>
          prev.map((row) =>
            row.localId === item.localId ? { ...row, state: 'error', progress: 0 } : row,
          ),
        )
      }
    }
  }

  function removePending(localId: string) {
    setPending((prev) => {
      const target = prev.find((row) => row.localId === localId)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((row) => row.localId !== localId)
    })
  }

  async function retryPending(localId: string) {
    const item = pending.find((row) => row.localId === localId)
    if (!item) return

    setPending((prev) =>
      prev.map((row) =>
        row.localId === localId ? { ...row, state: 'uploading', progress: 0 } : row,
      ),
    )

    try {
      await statusesApi.addStatusHistoryPhoto(orderId, historyId, item.file, (percent) => {
        setPending((prev) =>
          prev.map((row) =>
            row.localId === localId ? { ...row, progress: percent } : row,
          ),
        )
      })
      removePending(localId)
      onPhotosUploaded()
    } catch {
      setPending((prev) =>
        prev.map((row) =>
          row.localId === localId ? { ...row, state: 'error', progress: 0 } : row,
        ),
      )
    }
  }

  async function deletePhoto(attachmentId: string) {
    if (!window.confirm(ts('update.deletePhotoConfirm'))) return

    setDeletingIds((prev) => new Set(prev).add(attachmentId))
    try {
      await statusesApi.deleteStatusHistoryPhoto(orderId, historyId, attachmentId)
      onPhotosUploaded()
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev)
        next.delete(attachmentId)
        return next
      })
    }
  }

  const uploading = pending.some((p) => p.state === 'uploading')

  return (
    <div className="space-y-2">
      {(attachments.length > 0 || pending.length > 0) && (
        <AttachmentGroup>
          {attachments.map((photo) => (
            <Attachment
              key={photo.id}
              state="done"
              orientation="vertical"
              size="sm"
              className={photoAttachmentClassName}
            >
              <AttachmentMedia variant="image" className={photoMediaClassName}>
                <img
                  src={attachmentUrl(photo.url)}
                  alt=""
                  className="size-full object-cover"
                />
              </AttachmentMedia>
              <AttachmentTrigger asChild>
                <a
                  href={attachmentUrl(photo.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={ts('update.openPhoto')}
                />
              </AttachmentTrigger>
              <AttachmentActions>
                <AttachmentAction
                  type="button"
                  variant="secondary"
                  size="icon-xs"
                  className="bg-background/80 shadow-sm backdrop-blur-sm"
                  disabled={deletingIds.has(photo.id)}
                  aria-label={ts('update.removePhoto')}
                  onClick={() => void deletePhoto(photo.id)}
                >
                  <X />
                </AttachmentAction>
              </AttachmentActions>
            </Attachment>
          ))}

          {pending.map((item) => (
            <Attachment
              key={item.localId}
              state={item.state === 'error' ? 'error' : 'uploading'}
              orientation="vertical"
              size="sm"
              className={cn(photoAttachmentClassName, 'relative')}
            >
              <AttachmentMedia variant="image" className={photoMediaClassName}>
                <img src={item.previewUrl} alt="" className="size-full object-cover" />
              </AttachmentMedia>
              {item.state === 'uploading' ? (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-background/80 px-1.5 py-1 backdrop-blur-sm">
                  <Progress value={item.progress} />
                </div>
              ) : null}
              <AttachmentActions>
                {item.state === 'error' ? (
                  <AttachmentAction
                    type="button"
                    variant="secondary"
                    size="icon-xs"
                    className="bg-background/80 shadow-sm backdrop-blur-sm"
                    aria-label={ts('update.addPhotos')}
                    onClick={() => void retryPending(item.localId)}
                  >
                    <RefreshCw />
                  </AttachmentAction>
                ) : null}
                <AttachmentAction
                  type="button"
                  variant="secondary"
                  size="icon-xs"
                  className="bg-background/80 shadow-sm backdrop-blur-sm"
                  aria-label={ts('update.removePhoto')}
                  onClick={() => removePending(item.localId)}
                >
                  <X />
                </AttachmentAction>
              </AttachmentActions>
            </Attachment>
          ))}
        </AttachmentGroup>
      )}

      <label className="inline-flex cursor-pointer">
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []).slice(0, 5)
            e.target.value = ''
            void uploadSelected(files)
          }}
        />
        <Button type="button" variant="outline" size="icon-sm" asChild disabled={uploading}>
          <span title={ts('update.addPhotos')} aria-label={ts('update.addPhotos')}>
            <ImagePlus />
          </span>
        </Button>
      </label>
    </div>
  )
}
