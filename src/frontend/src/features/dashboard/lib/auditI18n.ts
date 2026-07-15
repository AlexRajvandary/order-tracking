import type { TFunction } from 'i18next'

type AuditTranslationGroup = 'actions' | 'entities' | 'fields'

export function translateAuditName(
  t: TFunction<'dashboard'>,
  group: AuditTranslationGroup,
  value: string,
) {
  return t(`audit.${group}.${value}`, { defaultValue: value })
}
