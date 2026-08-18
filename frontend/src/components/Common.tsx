import type { ReactNode } from 'react'

import { Icon } from './Icon'

export function ChartCard({
  title,
  eyebrow,
  action,
  children,
  className = '',
}: {
  title: string
  eyebrow?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`panel chart-card ${className}`}>
      <header className="panel-heading">
        <div>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h2>{title}</h2>
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}

export function KpiCard({
  label,
  value,
  meta,
  tone = 'default',
  icon = 'spark',
}: {
  label: string
  value: string
  meta: string
  tone?: 'default' | 'warning' | 'critical' | 'positive'
  icon?: 'spark' | 'risk' | 'customer' | 'retention' | 'drivers' | 'model'
}) {
  return (
    <article className={`kpi-card kpi-${tone}`}>
      <div className="kpi-topline">
        <span>{label}</span>
        <span className="kpi-icon"><Icon name={icon} /></span>
      </div>
      <strong>{value}</strong>
      <small>{meta}</small>
    </article>
  )
}

export function LoadingState() {
  return (
    <div className="loading-layout" aria-busy="true" aria-label="جارٍ تحميل بيانات لوحة التحكم">
      <div className="skeleton skeleton-title" />
      <div className="skeleton-grid">
        {Array.from({ length: 6 }).map((_, index) => <div className="skeleton" key={index} />)}
      </div>
      <div className="skeleton skeleton-chart" />
    </div>
  )
}

export function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="state-card" role="alert">
      <span className="state-icon">!</span>
      <h2>تعذر الاتصال بمحرك التحليلات</h2>
      <p>{message}</p>
      <button className="primary-button" onClick={retry}><Icon name="refresh" /> إعادة المحاولة</button>
    </div>
  )
}

export function EmptyState({ message }: { message: string }) {
  return <div className="empty-state">{message}</div>
}
