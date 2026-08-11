import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImagePlus, Loader2, Sparkles, X } from 'lucide-react'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import { ApiError } from '@/shared/api/client'
import * as ordersApi from '@/features/orders/api/ordersApi'
import type { AiOrderDraft } from '@/features/orders/types'

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
const MAX_BYTES = 10 * 1024 * 1024

type Props = {
  disabled?: boolean
  onParsed: (draft: AiOrderDraft) => void
}

export function AiOrderAssistPanel({ disabled, onParsed }: Props) {
  const { t } = useTranslation('orders')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)
  const [text, setText] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!image) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(image)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [image])

  const setImageSafe = useCallback(
    (file: File | null) => {
      setError(null)
      if (!file) {
        setImage(null)
        return
      }

      const type = file.type || ''
      if (!ACCEPTED_TYPES.includes(type)) {
        setError(t('form.ai.unsupportedImage'))
        return
      }
      if (file.size > MAX_BYTES) {
        setError(t('form.ai.imageTooLarge'))
        return
      }
      setImage(file)
    },
    [t],
  )

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      if (disabled || busy) return
      const items = event.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            event.preventDefault()
            setImageSafe(file)
            return
          }
        }
      }
    }

    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [busy, disabled, setImageSafe])

  const onParse = async () => {
    setError(null)
    if (!text.trim() && !image) {
      setError(t('form.ai.needInput'))
      return
    }

    setBusy(true)
    try {
      const draft = await ordersApi.parseOrderWithAi({
        text: text.trim() || undefined,
        image: image ?? undefined,
      })
      onParsed(draft)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('error', { ns: 'common' }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-dashed p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-primary" />
        <h2 className="font-semibold">{t('form.ai.title')}</h2>
      </div>
      <p className="text-sm text-muted-foreground">{t('form.ai.hint')}</p>

      <div className="space-y-1.5">
        <Label htmlFor="ai-order-text">{t('form.ai.textLabel')}</Label>
        <Textarea
          id="ai-order-text"
          rows={5}
          value={text}
          disabled={disabled || busy}
          placeholder={t('form.ai.textPlaceholder')}
          onChange={(e) => setText(e.target.value)}
        />
      </div>

      <div
        ref={dropRef}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            fileInputRef.current?.click()
          }
        }}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const file = e.dataTransfer.files?.[0]
          if (file) setImageSafe(file)
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center text-sm transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/30'
        }`}
      >
        <ImagePlus className="size-5 text-muted-foreground" />
        <span>{t('form.ai.dropHint')}</span>
        <span className="text-xs text-muted-foreground">{t('form.ai.pasteHint')}</span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          disabled={disabled || busy}
          onChange={(e) => setImageSafe(e.target.files?.[0] ?? null)}
        />
      </div>

      {previewUrl ? (
        <div className="relative inline-block">
          <img
            src={previewUrl}
            alt={t('form.ai.previewAlt')}
            className="max-h-48 rounded-lg border object-contain"
          />
          <Button
            type="button"
            size="icon-sm"
            variant="secondary"
            className="absolute top-2 right-2"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation()
              setImageSafe(null)
            }}
          >
            <X />
          </Button>
        </div>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Button
        type="button"
        className="w-full"
        disabled={disabled || busy || (!text.trim() && !image)}
        onClick={() => void onParse()}
      >
        {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}
        {busy ? t('form.ai.parsing') : t('form.ai.parse')}
      </Button>
    </div>
  )
}
