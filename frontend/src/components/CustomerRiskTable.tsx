import { useMemo, useState } from 'react'

import { formatCurrency, formatPercent } from '../lib/format'
import type { Customer } from '../types'
import { EmptyState } from './Common'
import { RiskBadge } from './RiskBadge'

type SortKey = 'retentionPriorityScore' | 'riskScore' | 'monthlyRevenue' | 'revenueAtRisk'

export function CustomerRiskTable({
  customers,
  onSelect,
  compact = false,
}: {
  customers: Customer[]
  onSelect?: (customer: Customer) => void
  compact?: boolean
}) {
  const [sortKey, setSortKey] = useState<SortKey>('retentionPriorityScore')
  const sorted = useMemo(
    () => [...customers].sort((a, b) => b[sortKey] - a[sortKey]),
    [customers, sortKey],
  )
  if (!sorted.length) return <EmptyState message="لا توجد حالات مطابقة لهذه المرشحات." />

  const sortButton = (key: SortKey, label: string) => (
    <button className={sortKey === key ? 'table-sort active-sort' : 'table-sort'} onClick={() => setSortKey(key)}>{label} ↕</button>
  )
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead><tr><th>العميل</th><th>المنطقة / الخدمة</th><th>{sortButton('monthlyRevenue', 'الإيراد')}</th><th>{sortButton('riskScore', 'الخطر')}</th><th>الاحتمال</th><th>{sortButton('revenueAtRisk', 'إيراد معرض')}</th>{!compact && <><th>المحرك الرئيسي</th><th>الإجراء المقترح</th></>}<th>{sortButton('retentionPriorityScore', 'الأولوية')}</th></tr></thead>
        <tbody>{sorted.map((customer, index) => (
          <tr key={`${customer.customerId}-${index}`} onClick={() => onSelect?.(customer)} className={onSelect ? 'clickable-row' : ''}>
            <td><b dir="ltr">{customer.customerId}</b><small>{customer.customerSegment}</small></td>
            <td>{customer.region}<small>{customer.serviceType}</small></td>
            <td dir="ltr">{formatCurrency(customer.monthlyRevenue)}</td>
            <td><RiskBadge level={customer.riskCategory} /><small>{customer.riskScore}/100</small></td>
            <td><b>{formatPercent(customer.churnProbability30d)}</b></td>
            <td dir="ltr">{formatCurrency(customer.revenueAtRisk)}</td>
            {!compact && <><td className="reason-cell">{customer.reasons[0]?.labelAr ?? '—'}</td><td className="action-cell">{customer.recommendedAction}</td></>}
            <td><span className="priority-pill">{customer.retentionPriorityScore.toFixed(1)}</span></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}
