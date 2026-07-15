import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { LoginPage } from '@/pages/admin/LoginPage'
import { DashboardPage } from '@/pages/admin/DashboardPage'
import { AuditPage } from '@/pages/admin/AuditPage'
import { AuditDetailsPage } from '@/pages/admin/AuditDetailsPage'
import { StatusManagementPage } from '@/pages/admin/StatusManagementPage'
import { CustomersPage } from '@/pages/admin/CustomersPage'
import { CustomerDetailsPage } from '@/pages/admin/CustomerDetailsPage'
import { AdminsPage } from '@/pages/admin/AdminsPage'
import { OrdersListPage } from '@/pages/admin/OrdersListPage'
import { CreateOrderPage } from '@/pages/admin/CreateOrderPage'
import { OrderDetailsPage } from '@/pages/admin/OrderDetailsPage'
import { TrackingPage } from '@/pages/public/TrackingPage'
import { AdminShell } from '@/widgets/admin-shell/AdminShell'
import { AuthProvider } from '@/features/auth/model/AuthContext'
import { RequireAuth } from '@/features/auth/ui/RequireAuth'

export function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />

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
              <Route path="customers" element={<CustomersPage />} />
              <Route path="customers/:id" element={<CustomerDetailsPage />} />
              <Route path="admins" element={<AdminsPage />} />
              <Route path="statuses" element={<StatusManagementPage />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
