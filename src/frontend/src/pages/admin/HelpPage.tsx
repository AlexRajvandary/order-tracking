import { useTranslation } from 'react-i18next'
import { Check, Info, Minus, ShieldCheck, UserCog, UserRound } from 'lucide-react'
import { Badge } from '@/shared/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/table'
import { cn } from '@/shared/lib/utils'

type RoleKey = 'Moderator' | 'Admin' | 'SuperAdmin'

const roleOrder: RoleKey[] = ['Moderator', 'Admin', 'SuperAdmin']

const roleIcons: Record<RoleKey, React.ReactNode> = {
  Moderator: <UserRound />,
  Admin: <UserCog />,
  SuperAdmin: <ShieldCheck />,
}

const roleBadgeStyles: Record<RoleKey, string> = {
  Moderator: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  Admin: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  SuperAdmin: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
}

const capabilities: Array<{
  key: string
  values: Record<RoleKey, boolean>
}> = [
  { key: 'manageOrders', values: { Moderator: true, Admin: true, SuperAdmin: true } },
  { key: 'manageCustomers', values: { Moderator: true, Admin: true, SuperAdmin: true } },
  { key: 'manageStatuses', values: { Moderator: true, Admin: true, SuperAdmin: true } },
  { key: 'viewAudit', values: { Moderator: true, Admin: true, SuperAdmin: true } },
  { key: 'accessAdmins', values: { Moderator: false, Admin: true, SuperAdmin: true } },
  { key: 'createModerator', values: { Moderator: false, Admin: true, SuperAdmin: true } },
  { key: 'createAdmin', values: { Moderator: false, Admin: false, SuperAdmin: true } },
  { key: 'manageModerators', values: { Moderator: false, Admin: true, SuperAdmin: true } },
  { key: 'manageAllAdmins', values: { Moderator: false, Admin: false, SuperAdmin: true } },
  { key: 'changeRoles', values: { Moderator: false, Admin: false, SuperAdmin: true } },
  { key: 'changeOwnPassword', values: { Moderator: true, Admin: true, SuperAdmin: true } },
]

function PermissionCell({ allowed, yesLabel, noLabel }: { allowed: boolean; yesLabel: string; noLabel: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full',
        allowed
          ? 'text-emerald-600 dark:text-emerald-400'
          : 'text-muted-foreground/50',
      )}
      title={allowed ? yesLabel : noLabel}
      aria-label={allowed ? yesLabel : noLabel}
    >
      {allowed ? <Check className="size-4" /> : <Minus className="size-4" />}
    </span>
  )
}

export function HelpPage() {
  const { t } = useTranslation('help')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('rolesTitle')}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {roleOrder.map((role) => (
            <Card key={role}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'flex size-9 items-center justify-center rounded-lg [&>svg]:size-4.5',
                      roleBadgeStyles[role],
                    )}
                  >
                    {roleIcons[role]}
                  </span>
                  <CardTitle>{t(`roles.${role}.name`)}</CardTitle>
                </div>
                <CardDescription className="pt-1">
                  {t(`roles.${role}.description`)}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{t('matrixTitle')}</h2>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Check className="size-4 text-emerald-600 dark:text-emerald-400" />
              {t('legend.yes')}
            </span>
            <span className="flex items-center gap-1">
              <Minus className="size-4 text-muted-foreground/50" />
              {t('legend.no')}
            </span>
          </div>
        </div>

        <Card className="py-0">
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-56">{t('capabilityColumn')}</TableHead>
                  {roleOrder.map((role) => (
                    <TableHead key={role} className="text-center">
                      <Badge
                        variant="secondary"
                        className={cn('font-medium', roleBadgeStyles[role])}
                      >
                        {t(`roles.${role}.name`)}
                      </Badge>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {capabilities.map((capability) => (
                  <TableRow key={capability.key}>
                    <TableCell className="font-medium">
                      {t(`capabilities.${capability.key}`)}
                    </TableCell>
                    {roleOrder.map((role) => (
                      <TableCell key={role} className="text-center">
                        <PermissionCell
                          allowed={capability.values[role]}
                          yesLabel={t('legend.yes')}
                          noLabel={t('legend.no')}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('notesTitle')}</h2>
        <Card>
          <CardContent className="space-y-2.5 text-sm">
            {(['ownRole', 'adminModerators', 'moderator'] as const).map((note) => (
              <p key={note} className="flex items-start gap-2">
                <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span>{t(`notes.${note}`)}</span>
              </p>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
