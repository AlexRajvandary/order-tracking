import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { LoginPage } from '@/pages/admin/LoginPage'
import { DashboardPage } from '@/pages/admin/DashboardPage'
import { AuditPage } from '@/pages/admin/AuditPage'
import { AuditDetailsPage } from '@/pages/admin/AuditDetailsPage'
import { StatusManagementPage } from '@/pages/admin/StatusManagementPage'
import { CustomersPage } from '@/pages/admin/CustomersPage'
import { CustomerDetailsPage } from '@/pages/admin/CustomerDetailsPage'
import { AdminsPage } from '@/pages/admin/AdminsPage'
import { HelpPage } from '@/pages/admin/HelpPage'
import { OrdersListPage } from '@/pages/admin/OrdersListPage'
import { CreateOrderPage } from '@/pages/admin/CreateOrderPage'
import { OrderDetailsPage } from '@/pages/admin/OrderDetailsPage'
import { ProductsPage } from '@/pages/admin/ProductsPage'
import { ProductDetailsPage } from '@/pages/admin/ProductDetailsPage'
import { ChangesPage } from '@/pages/admin/ChangesPage'
import { VpsMonitoringPage } from '@/pages/admin/VpsMonitoringPage'
import { StorefrontAnnouncementPage } from '@/pages/admin/StorefrontAnnouncementPage'
import { CatalogAnalyticsPage } from '@/pages/admin/CatalogAnalyticsPage'
import { CatalogPage } from '@/pages/admin/CatalogPage'
import { ProcurementItemDetailPage, ProcurementOrderDetailPage, ProcurementsPage } from '@/pages/admin/ProcurementsPage'
import { TrackingPage } from '@/pages/public/TrackingPage'
import { AdminShell } from '@/widgets/admin-shell/AdminShell'
import { AuthProvider } from '@/features/auth/model/AuthContext'
import { RequireAuth } from '@/features/auth/ui/RequireAuth'
import { AdminRealtime } from '@/shared/realtime/AdminRealtime'

function isTrackingHost() {
  return window.location.hostname.toLowerCase() === 'tracking.the-get.ru'
}

function PublicTrackingRoutes() {
  return (
    <Routes>
      <Route path="/" element={<TrackingPage />} />
      <Route path="/:code" element={<TrackingPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

function LegacyCatalogRedirect() {
  const { pathname, search, hash } = useLocation()
  const target = pathname.startsWith('/admin/products')
    ? pathname.replace('/admin/products', '/admin/catalog/products')
    : pathname === '/admin/catalog-analytics'
      ? '/admin/catalog/analytics'
      : '/admin/catalog/storefront-announcement'
  return <Navigate to={`${target}${search}${hash}`} replace />
}

function AdminAndLegacyRoutes() {
  return (
    <AuthProvider>
      <AdminRealtime />
      <Routes>
        {/* Storefront lives on Next.js at domain root; SPA root is unused. */}
        <Route path="/" element={<Navigate to="/admin/login" replace />} />

        <Route path="/track" element={<TrackingPage />} />
        <Route path="/track/:code" element={<TrackingPage />} />

        <Route path="/admin/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route path="/admin" element={<AdminShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="audit" element={<AuditPage />} />
            <Route path="audit/:id" element={<AuditDetailsPage />} />
            <Route path="orders" element={<OrdersListPage />} />
            <Route path="orders/new" element={<CreateOrderPage />} />
            <Route path="orders/:id" element={<OrderDetailsPage />} />
            <Route path="procurements" element={<ProcurementsPage />} />
            <Route path="procurements/items/:procurementId" element={<ProcurementItemDetailPage />} />
            <Route path="procurements/orders/:orderId/:stage" element={<ProcurementOrderDetailPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="customers/:id" element={<CustomerDetailsPage />} />
            <Route path="catalog" element={<CatalogPage />}>
              <Route path="products" element={<ProductsPage />} />
              <Route path="products/:id" element={<ProductDetailsPage />} />
              <Route path="analytics" element={<CatalogAnalyticsPage />} />
              <Route path="storefront-announcement" element={<StorefrontAnnouncementPage />} />
            </Route>
            <Route path="products" element={<LegacyCatalogRedirect />} />
            <Route path="products/:id" element={<LegacyCatalogRedirect />} />
            <Route path="catalog-analytics" element={<LegacyCatalogRedirect />} />
            <Route path="changes" element={<ChangesPage />} />
            <Route path="monitoring" element={<VpsMonitoringPage />} />
            <Route path="storefront-announcement" element={<LegacyCatalogRedirect />} />
            <Route path="admins" element={<AdminsPage />} />
            <Route path="statuses" element={<StatusManagementPage />} />
            <Route path="help" element={<HelpPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AuthProvider>
  )
}

export function AppRouter() {
  return (
    <BrowserRouter>
      {isTrackingHost() ? <PublicTrackingRoutes /> : <AdminAndLegacyRoutes />}
    </BrowserRouter>
  )
}
