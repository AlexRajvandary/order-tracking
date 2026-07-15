/** Capitalizes the first letter of a name part (фамилия / имя / отчество). */
export function capitalizeNamePart(value: string): string {
  if (!value) return value
  const first = value.charAt(0).toLocaleUpperCase('ru-RU')
  return first + value.slice(1)
}

export function formatCustomerFullName(parts: {
  lastName?: string | null
  firstName?: string | null
  patronymic?: string | null
  fullName?: string | null
}): string {
  if (parts.fullName?.trim()) return parts.fullName.trim()
  return [parts.lastName, parts.firstName, parts.patronymic]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ')
}
