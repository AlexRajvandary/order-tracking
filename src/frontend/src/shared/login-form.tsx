import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'
import { Alert, AlertDescription } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'

type LoginFormProps = Omit<React.ComponentProps<'form'>, 'onSubmit'> & {
  loginValue: string
  password: string
  error: string | null
  submitting: boolean
  telegramHint: string | null
  telegramSlot?: ReactNode
  onLoginChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: () => void
}

export function LoginForm({
  className,
  loginValue,
  password,
  error,
  submitting,
  telegramHint,
  telegramSlot,
  onLoginChange,
  onPasswordChange,
  onSubmit,
  ...props
}: LoginFormProps) {
  const { t } = useTranslation('auth')

  return (
    <form
      className={cn('flex flex-col gap-6', className)}
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      {...props}
    >
      <FieldGroup>
        <div className="flex flex-col items-center text-center">
          <h1 className="text-2xl font-bold">{t('login.title')}</h1>
        </div>

        <Field>
          <FieldLabel htmlFor="login">{t('login.loginLabel')}</FieldLabel>
          <Input
            id="login"
            type="text"
            value={loginValue}
            onChange={(e) => onLoginChange(e.target.value)}
            autoComplete="username"
            required
            className="bg-background"
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="password">{t('login.passwordLabel')}</FieldLabel>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            autoComplete="current-password"
            required
            className="bg-background"
          />
        </Field>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <Field>
          <Button type="submit" disabled={submitting}>
            {submitting ? t('login.submitting') : t('login.submit')}
          </Button>
        </Field>

        <FieldSeparator>{t('login.orContinueWith')}</FieldSeparator>

        <Field>
          <div className="flex flex-col items-center gap-2">
            {telegramSlot}
            {telegramHint ? (
              <FieldDescription className="text-center">{telegramHint}</FieldDescription>
            ) : null}
          </div>
        </Field>
      </FieldGroup>
    </form>
  )
}
