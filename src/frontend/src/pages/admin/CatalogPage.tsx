import { useLocation, useNavigate, Outlet, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Tabs, TabsList, TabsTrigger } from '@/shared/ui/tabs'

const catalogTabs = [
  { value: 'products', path: '/admin/catalog/products', label: 'nav.products' },
  { value: 'analytics', path: '/admin/catalog/analytics', label: 'nav.catalogAnalytics' },
  { value: 'announcement', path: '/admin/catalog/storefront-announcement', label: 'nav.storefrontAnnouncement' },
] as const

export function CatalogPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const activeTab = location.pathname.includes('/analytics')
    ? 'analytics'
    : location.pathname.includes('/storefront-announcement')
      ? 'announcement'
      : 'products'

  if (location.pathname === '/admin/catalog') {
    return <Navigate to="/admin/catalog/products" replace />
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={(value) => {
        const tab = catalogTabs.find((item) => item.value === value)
        if (tab) navigate(tab.path)
      }}>
        <TabsList className="w-full justify-start sm:w-fit">
          {catalogTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="px-3">
              {t(tab.label)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <Outlet />
    </div>
  )
}
