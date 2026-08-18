import { FormEvent, useState } from 'react'

import { ChartCard, EmptyState } from '../components/Common'
import { Icon } from '../components/Icon'
import { RiskBadge } from '../components/RiskBadge'
import { loadCustomer } from '../lib/api'
import { formatCurrency, formatPercent } from '../lib/format'
import type { Customer, UserRole } from '../types'

function ProbabilityGauge({ value }: { value: number }) {
  const degrees = Math.round(value * 360)
  return (
    <div className="probability-gauge" style={{ background: `conic-gradient(#e4665c ${degrees}deg, #e6edf1 ${degrees}deg)` }}>
      <div><strong>{formatPercent(value, 0)}</strong><span>احتمال 30 يومًا</span></div>
    </div>
  )
}

export function Customer360Page({
  initialCustomer,
  role,
}: {
  initialCustomer?: Customer
  role: UserRole
}) {
  const [customer, setCustomer] = useState<Customer | undefined>(initialCustomer)
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const search = async (event: FormEvent) => {
    event.preventDefault()
    if (!query.trim()) return
    setLoading(true); setError('')
    try { setCustomer(await loadCustomer(query.trim().toUpperCase(), role)) }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'لم يتم العثور على العميل') }
    finally { setLoading(false) }
  }

  return (
    <div className="page-stack">
      <form className="customer-search panel" onSubmit={search}>
        <div><span className="eyebrow">بحث آمن بالمعرّف</span><h2>افتح ملف عميل</h2><p>مثال: LTT-008421 — تُخفى المعرّفات عن الأدوار غير المخولة.</p></div>
        <div className="search-control"><Icon name="search"/><input dir="ltr" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="LTT-000001" aria-label="معرّف العميل"/><button className="primary-button" disabled={loading}>{loading ? 'جارٍ البحث…' : 'بحث'}</button></div>
        {error && <span className="form-error" role="alert">{error}</span>}
      </form>

      {!customer ? <EmptyState message="اختر عميلًا من جدول المخاطر أو ابحث باستخدام Customer ID." /> : (
        <>
          <section className="customer-hero panel">
            <div className="customer-identity"><span className="avatar-large">LT</span><div><span className="eyebrow">Customer 360</span><h2 dir="ltr">{customer.customerId}</h2><p>{customer.customerSegment} · {customer.region} · {customer.serviceType}</p><RiskBadge level={customer.riskCategory}/></div></div>
            <ProbabilityGauge value={customer.churnProbability30d}/>
            <div className="customer-action"><span className="eyebrow">Next best action</span><h3>{customer.recommendedAction}</h3><p>المالك: {customer.actionOwner}</p><span className="sla-chip">SLA مقترح: 24 ساعة</span></div>
          </section>

          <div className="customer-stat-grid">
            <article><span>الباقة الحالية</span><b>{customer.currentPackage}</b><small>{customer.serviceType}</small></article>
            <article><span>مدة الاشتراك</span><b>{customer.tenureMonths} شهرًا</b><small>Tenure</small></article>
            <article><span>الإيراد الشهري</span><b>{formatCurrency(customer.monthlyRevenue)}</b><small>ARPU</small></article>
            <article><span>إيراد معرض</span><b>{formatCurrency(customer.revenueAtRisk)}</b><small>Probability-weighted</small></article>
            <article><span>الاستخدام</span><b>{customer.monthlyDataUsageGb} GB</b><small className={customer.usageChange30dPct < 0 ? 'negative-text' : 'positive-text'}>{customer.usageChange30dPct}% / 30d</small></article>
            <article><span>متوسط السرعة</span><b>{customer.averageSpeedMbps} Mbps</b><small>آخر 30 يومًا</small></article>
          </div>

          <div className="analytics-grid two-columns">
            <ChartCard title="لماذا ارتفع الخطر؟" eyebrow="Top individual reason codes">
              <div className="reason-list">{customer.reasons.map((reason, index) => <article key={reason.code}><span>{String(index + 1).padStart(2, '0')}</span><div><b>{reason.labelAr}</b><small>{reason.labelEn}</small></div><em>{Math.round(reason.severity)}</em></article>)}</div>
            </ChartCard>
            <ChartCard title="إشارات التجربة" eyebrow="Service, care & payment">
              <div className="signal-grid"><article><span>الانقطاعات</span><b>{customer.serviceOutages30d}</b><small>{customer.totalOutageMinutes30d} دقيقة</small></article><article><span>تذاكر الدعم</span><b>{customer.supportTickets90d}</b><small>{customer.complaints90d} شكاوى</small></article><article><span>زمن الحل</span><b>{customer.averageResolutionTimeHours}h</b><small>متوسط</small></article><article><span>تأخر الدفع</span><b>{customer.paymentDelayDays}</b><small>{customer.failedPayments90d} دفعات متعثرة</small></article><article><span>رضا العميل</span><b>{customer.customerSatisfactionScore}/5</b><small>NPS {customer.npsScore}</small></article><article><span>آخر تجديد</span><b>{customer.daysSinceLastRecharge}</b><small>يومًا</small></article></div>
            </ChartCard>
          </div>

          <ChartCard title="أفق الخطر" eyebrow="احتمالات تراكمية للقرار — وليست ضمانًا زمنيًا">
            <div className="horizon-grid"><article><span>30 يومًا</span><b>{formatPercent(customer.churnProbability30d)}</b><div><i style={{ width: formatPercent(customer.churnProbability30d) }}/></div></article><article><span>60 يومًا</span><b>{formatPercent(customer.churnProbability60d)}</b><div><i style={{ width: formatPercent(customer.churnProbability60d) }}/></div></article><article><span>90 يومًا</span><b>{formatPercent(customer.churnProbability90d)}</b><div><i style={{ width: formatPercent(customer.churnProbability90d) }}/></div></article></div>
          </ChartCard>
        </>
      )}
    </div>
  )
}
