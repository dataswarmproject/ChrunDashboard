import type { DashboardFilters, RiskLevel } from '../types'

const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 })

export function formatNumber(value: number): string {
  return numberFormat.format(value)
}

export function formatCurrency(value: number): string {
  return `${numberFormat.format(value)} د.ل`
}

export function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`
}

export function riskLabel(level: RiskLevel): string {
  return { LOW: 'منخفض', MEDIUM: 'متوسط', HIGH: 'مرتفع', CRITICAL: 'حرج' }[level]
}

export function buildFilterQuery(filters: DashboardFilters): string {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== '') params.set(key, value)
  })
  return params.toString()
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('ar-LY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}
