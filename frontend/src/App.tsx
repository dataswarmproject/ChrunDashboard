import { lazy, Suspense, useCallback, useState } from 'react'

import { ErrorState, LoadingState } from './components/Common'
import { emptyFilters, FilterBar } from './components/FilterBar'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { useDashboardData } from './hooks/useDashboardData'
import type { Customer, DashboardFilters, PageKey, UserRole } from './types'

const OverviewPage = lazy(() =>
  import('./pages/OverviewPage').then((module) => ({ default: module.OverviewPage })),
)
const RiskAnalysisPage = lazy(() =>
  import('./pages/RiskAnalysisPage').then((module) => ({ default: module.RiskAnalysisPage })),
)
const DriversPage = lazy(() =>
  import('./pages/DriversPage').then((module) => ({ default: module.DriversPage })),
)
const Customer360Page = lazy(() =>
  import('./pages/Customer360Page').then((module) => ({ default: module.Customer360Page })),
)
const RetentionPage = lazy(() =>
  import('./pages/RetentionPage').then((module) => ({ default: module.RetentionPage })),
)
const GeographyPage = lazy(() =>
  import('./pages/GeographyPage').then((module) => ({ default: module.GeographyPage })),
)
const ModelPerformancePage = lazy(() =>
  import('./pages/ModelPerformancePage').then((module) => ({
    default: module.ModelPerformancePage,
  })),
)

const filterablePages: PageKey[] = ['overview', 'risk', 'drivers', 'geography']

export default function App() {
  const [page, setPage] = useState<PageKey>('overview')
  const [role, setRole] = useState<UserRole>('analyst')
  const [filters, setFilters] = useState<DashboardFilters>(emptyFilters)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer>()
  const { data, error, loading, refresh } = useDashboardData(filters, role)

  const navigate = useCallback((next: PageKey) => {
    setPage(next)
    setSidebarOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const openCustomer = useCallback(
    (customer: Customer) => {
      setSelectedCustomer(customer)
      navigate('customer')
    },
    [navigate],
  )

  return (
    <div className="app-shell">
      <Sidebar activePage={page} onNavigate={navigate} open={sidebarOpen} />
      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="إغلاق قائمة التنقل"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className="app-main">
        <Header
          page={page}
          role={role}
          onRoleChange={setRole}
          onToggleSidebar={() => setSidebarOpen((open) => !open)}
          onRefresh={refresh}
        />
        <main className="app-content" id="main-content">
          {data && (
            <p className="synthetic-banner" role="note">
              <b>{data.overview.datasetNoticeAr}</b>
              <span dir="ltr">{data.overview.datasetNoticeEn}</span>
            </p>
          )}
          {data && filterablePages.includes(page) && (
            <FilterBar filters={filters} options={data.options} onChange={setFilters} />
          )}
          {loading && !data && <LoadingState />}
          {error && !data && <ErrorState message={error} retry={refresh} />}
          {data && (
            <Suspense fallback={<LoadingState />}>
              <div className={loading ? 'page-body page-busy' : 'page-body'}>
              {page === 'overview' && (
                <OverviewPage data={data} onSelectCustomer={openCustomer} />
              )}
              {page === 'risk' && <RiskAnalysisPage risk={data.risk} />}
              {page === 'drivers' && <DriversPage drivers={data.drivers} />}
              {page === 'customer' && (
                <Customer360Page
                  key={`${role}-${selectedCustomer?.customerId ?? 'default'}`}
                  initialCustomer={selectedCustomer ?? data.customers.data[0]}
                  role={role}
                />
              )}
              {page === 'retention' && (
                <RetentionPage
                  key={role}
                  initialCustomers={data.retention.data}
                  role={role}
                  filters={filters}
                  onRefresh={refresh}
                />
              )}
              {page === 'geography' && <GeographyPage geography={data.geography} />}
              {page === 'model' && <ModelPerformancePage model={data.model} />}
              </div>
            </Suspense>
          )}
        </main>
      </div>
    </div>
  )
}
