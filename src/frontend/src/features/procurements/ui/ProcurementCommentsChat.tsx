import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ContextMenu as ContextMenuPrimitive } from 'radix-ui'
import { ArrowLeft, ArrowUp, LoaderCircle, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import * as procurementsApi from '@/features/procurements/api/procurementsApi'
import { ApiError } from '@/shared/api/client'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'

type ProcurementCommentsChatProps = {
  procurementId: string
  variant: 'popover' | 'embedded'
  composerSize?: 'compact' | 'comfortable'
  open?: boolean
  onClose?: () => void
}

export function ProcurementCommentsChat({ procurementId, variant, composerSize = 'compact', open = true, onClose }: ProcurementCommentsChatProps) {
  const { t } = useTranslation('procurements')
  const queryClient = useQueryClient()
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const messagesRef = useRef<HTMLDivElement>(null)
  const isEmbedded = variant === 'embedded'
  const isComfortableComposer = composerSize === 'comfortable'

  const commentsQuery = useQuery({
    queryKey: ['procurement-errors', procurementId],
    queryFn: ({ signal }) => procurementsApi.getProcurementErrors(procurementId, signal),
    enabled: isEmbedded || open,
  })

  const refreshComments = () => {
    void queryClient.invalidateQueries({ queryKey: ['procurements'] })
    void queryClient.invalidateQueries({ queryKey: ['procurement-errors', procurementId] })
  }

  const createComment = useMutation({
    mutationFn: () => procurementsApi.createProcurementError(procurementId, text.trim()),
    onSuccess: () => {
      setText('')
      setError('')
      refreshComments()
    },
    onError: (mutationError) => setError(mutationError instanceof ApiError ? mutationError.message : t('board.errorCreateFailed')),
  })

  const deleteComment = useMutation({
    mutationFn: procurementsApi.deleteProcurementError,
    onSuccess: () => {
      setError('')
      refreshComments()
    },
    onError: (mutationError) => setError(mutationError instanceof ApiError ? mutationError.message : t('board.errorDeleteFailed')),
  })

  useEffect(() => {
    const input = inputRef.current
    if (!input) return
    input.style.height = isComfortableComposer ? '40px' : '28px'
    const maxHeight = 136
    input.style.height = `${Math.min(input.scrollHeight, maxHeight)}px`
    input.style.overflowY = input.scrollHeight > maxHeight ? 'auto' : 'hidden'
  }, [text, open, isComfortableComposer])

  useEffect(() => {
    if (!isEmbedded && open) inputRef.current?.focus()
  }, [isEmbedded, open])

  useEffect(() => {
    const messages = messagesRef.current
    if (messages && (isEmbedded || open)) messages.scrollTop = messages.scrollHeight
  }, [commentsQuery.data, commentsQuery.isLoading, isEmbedded, open])

  // Older notes were stored as blocking procurement errors. Render them as
  // messages too so the card count and the conversation stay in sync.
  const comments = commentsQuery.data ?? []
  const messageList = commentsQuery.isLoading
    ? <Skeleton className="ml-auto h-10 w-3/4 rounded-2xl" />
    : commentsQuery.isError
      ? <p role="alert" className="text-[10px] text-destructive">{t('board.errorsLoadFailed')}</p>
      : comments.length
        ? comments.map((comment) => <ContextMenuPrimitive.Root key={comment.id}>
          <ContextMenuPrimitive.Trigger asChild>
            <div className={`ml-auto flex max-w-[90%] cursor-context-menu flex-col rounded-2xl rounded-br-sm text-white ${isEmbedded ? 'bg-[#374151] px-3 py-2.5' : 'bg-[#111827] px-2.5 py-1.5'}`}>
              <p className={`whitespace-pre-wrap break-words ${isEmbedded ? 'text-xs leading-5' : 'text-[10px] leading-4'}`}>{comment.text}</p>
              <time className="mt-0.5 self-end text-[8px] text-slate-300" dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleString()}</time>
            </div>
          </ContextMenuPrimitive.Trigger>
          <ContextMenuPrimitive.Portal>
            <ContextMenuPrimitive.Content className="z-[100] min-w-36 rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-none">
              <ContextMenuPrimitive.Item disabled={deleteComment.isPending} onSelect={() => deleteComment.mutate(comment.id)} className="flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-xs text-destructive outline-none focus:bg-destructive/10 data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
                <Trash2 className="size-3.5" />{t('board.deleteComment')}
              </ContextMenuPrimitive.Item>
            </ContextMenuPrimitive.Content>
          </ContextMenuPrimitive.Portal>
        </ContextMenuPrimitive.Root>)
        : <p className="my-auto text-center text-[10px] text-[#9CA3AF]">{t('board.noComments')}</p>

  const composer = <div className="relative w-full overflow-hidden rounded-xl border border-[#E5E7EB] bg-white">
    <textarea
      ref={inputRef}
      value={text}
      onChange={(event) => { setText(event.target.value); setError('') }}
      maxLength={2000}
      rows={1}
      placeholder={t('board.commentPlaceholder')}
      aria-label={t('board.commentPlaceholder')}
      className={`procurement-comment-scrollbar block max-h-[136px] ${isComfortableComposer ? 'min-h-10 px-2 py-3 text-xs leading-4' : 'min-h-7 px-2 py-[7px] text-[10px] leading-3'} w-[calc(100%-28px)] resize-none rounded-l-xl border-0 bg-transparent pr-0 text-left outline-none focus-visible:ring-0 focus-visible:ring-offset-0`}
    />
    <Button type="button" size="icon" aria-label={t('board.saveComment')} title={t('board.saveComment')} className="pointer-events-auto absolute right-1 top-1/2 z-10 size-5 -translate-y-1/2 rounded-full bg-[#111827] p-0 text-white hover:bg-slate-700" disabled={!text.trim() || createComment.isPending} onClick={() => createComment.mutate()}>
      {createComment.isPending ? <LoaderCircle className="size-3 animate-spin motion-reduce:animate-none" /> : <ArrowUp className="size-3" />}
    </Button>
  </div>

  if (isEmbedded) {
    return <section aria-label={t('board.commentTitle')} className="flex h-full min-h-[420px] min-w-0 flex-col overflow-hidden rounded-2xl border border-[#E5E7EB] bg-[#F3F4F6]">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-black/5 px-4">
        <h2 className="text-sm font-semibold text-[#111827]">{t('board.commentTitle')}</h2>
        <span className="text-xs tabular-nums text-[#667085]">{comments.length}</span>
      </header>
      <div ref={messagesRef} aria-live="polite" className="procurement-comment-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 py-3">
        {messageList}
      </div>
      <div className="shrink-0 px-3 pb-3 pt-1">
        {error ? <p role="alert" className="mb-2 break-words text-xs text-destructive">{error}</p> : null}
        {composer}
      </div>
    </section>
  }

  return <section data-no-drag aria-label={t('board.commentTitle')} aria-hidden={!open} inert={!open} className={`absolute -inset-x-2 top-[-14px] z-20 bg-[#E5E7EB] transition-[transform,opacity] duration-300 ease-in-out motion-reduce:transition-none ${open ? 'bottom-[-14px] translate-x-0 pointer-events-auto opacity-100' : 'bottom-0 translate-x-[150%] pointer-events-none opacity-0'}`}>
    <button type="button" aria-label={t('board.backToCard')} title={t('board.backToCard')} className="absolute left-2 top-2 z-30 flex size-5 items-center justify-center rounded-full bg-white/95 text-[#667085] shadow-sm hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={onClose}><ArrowLeft className="size-3" /></button>
    {error ? <p role="alert" className="absolute bottom-[42px] left-2 right-2 z-30 break-words text-xs text-destructive">{error}</p> : null}
    <div ref={messagesRef} aria-live="polite" className="procurement-comment-scrollbar absolute inset-0 flex flex-col gap-2 overflow-y-auto px-2 pb-[152px]">
      {messageList}
    </div>
    <div className="absolute inset-x-2 bottom-[6px] z-20">
      {composer}
    </div>
  </section>
}
