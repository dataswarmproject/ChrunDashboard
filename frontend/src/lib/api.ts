import { buildFilterQuery } from './format'
import type {
  Customer,
  DashboardData,
  DashboardFilters,
  Drivers,
  FilterOptions,
  GeographyPoint,
  ModelPerformance,
  Overview,
  PaginatedCustomers,
  RiskAnalysis,
  UserRole,
} from '../types'

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

async function request<T>(path: string, role: UserRole, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-User-Role': role,
      ...init?.headers,
    },
  })
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new ApiError(payload?.error?.message ?? 'تعذر تحميل البيانات', response.status)
  }
  return response.json() as Promise<T>
}

function filteredPath(path: string, filters: DashboardFilters): string {
  const query = buildFilterQuery(filters)
  return query ? `${path}?${query}` : path
}

export async function loadDashboardData(
  filters: DashboardFilters,
  role: UserRole,
): Promise<DashboardData> {
  const [overview, risk, drivers, customers, retention, geography, model, options] =
    await Promise.all([
      request<Overview>(filteredPath('/api/v1/overview', filters), role),
      request<RiskAnalysis>(filteredPath('/api/v1/risk-analysis', filters), role),
      request<Drivers>(filteredPath('/api/v1/drivers', filters), role),
      request<PaginatedCustomers>(
        `${filteredPath('/api/v1/customers', filters)}${buildFilterQuery(filters) ? '&' : '?'}pageSize=40`,
        role,
      ),
      request<PaginatedCustomers>('/api/v1/retention?pageSize=80', role),
      request<GeographyPoint[]>(filteredPath('/api/v1/geography', filters), role),
      request<ModelPerformance>('/api/v1/model-performance', role),
      request<FilterOptions>('/api/v1/filter-options', role),
    ])
  return { overview, risk, drivers, customers, retention, geography, model, options }
}

export function loadCustomer(customerId: string, role: UserRole): Promise<Customer> {
  return request<Customer>(`/api/v1/customers/${encodeURIComponent(customerId)}`, role)
}

export function updateRetention(
  customerId: string,
  role: UserRole,
  campaignStatus: Customer['campaignStatus'],
  retentionResult: Customer['retentionResult'],
): Promise<{ campaignStatus: string; retentionResult: string }> {
  return request(`/api/v1/retention/${encodeURIComponent(customerId)}`, role, {
    method: 'PATCH',
    body: JSON.stringify({ campaignStatus, retentionResult }),
  })
}

export async function exportCustomers(filters: DashboardFilters, role: UserRole): Promise<void> {
  const response = await fetch(filteredPath('/api/v1/customers/export', filters), {
    headers: { 'X-User-Role': role },
  })
  if (!response.ok) throw new ApiError('التصدير متاح لأدوار التحليل والاحتفاظ فقط', response.status)
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'churn-risk-export.csv'
  link.click()
  URL.revokeObjectURL(url)
}
