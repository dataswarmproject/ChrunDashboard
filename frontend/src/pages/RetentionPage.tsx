import { useMemo, useState } from 'react'

import { ChartCard } from '../components/Common'
import { Icon } from '../components/Icon'
import { RiskBadge } from '../components/RiskBadge'
import { exportCustomers, updateRetention } from '../lib/api'
import { formatCurrency, formatPercent } from '../lib/format'
import type { Customer, DashboardFilters, UserRole } from '../types'

const statusLabels = { NOT_STARTED: 'لم يبدأ', IN_PROGRESS: 'قيد التنفيذ', COMPLETED: 'مكتمل' }

export function RetentionPage({
  initialCustomers,
  role,
  filters,
  onRefresh,
}: {
  initialCustomers: Customer[]
  role: UserRole
  filters: DashboardFilters
  onRefresh: () => void
}) {
  const [customers, setCustomers] = useState(initialCustomers)
  const [statusFilter, setStatusFilter] = useState('')
  const [message, setMessage] = useState('')
  const canEdit = role === 'retention' || role === 'admin'
  const visible = useMemo(() => statusFilter ? customers.filter((customer) => customer.campaignStatus === statusFilter) : customers, [customers, statusFilter])

  const changeStatus = async (customer: Customer, campaignStatus: Customer['campaignStatus']) => {
    try {
      await updateRetention(customer.customerId, role, campaignStatus, customer.retentionResult)
      setCustomers((current) => current.map((item) => item.customerId === customer.customerId ? { ...item, campaignStatus } : item))
      setMessage('تم تحديث حالة الحملة وتسجيل الحدث في Audit Log.')
      onRefresh()
    } catch (caught) { setMessage(caught instanceof Error ? caught.message : 'تعذر حفظ التحديث') }
  }

  return (
    <div className="page-stack">
      <section className="action-toolbar panel"><div><span className="eyebrow">Operational queue</span><h2>قائمة تدخل قابلة للتنفيذ</h2><p>الترتيب الافتراضي حسب Retention Priority Score، وليس احتمال Churn وحده.</p></div><div className="toolbar-actions"><label><span>حالة الحملة</span><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">الكل</option><option value="NOT_STARTED">لم يبدأ</option><option value="IN_PROGRESS">قيد التنفيذ</option><option value="COMPLETED">مكتمل</option></select></label><button className="secondary-button" onClick={() => exportCustomers(filters, role).catch((error) => setMessage(error.message))}><Icon name="download"/> تصدير CSV</button></div></section>
      {message && <div className="toast-message" role="status">{message}</div>}
      <ChartCard title="العملاء ذوو الأولوية" eyebrow={`${visible.length} حالة High / Critical`}>
        <div className="table-scroll"><table className="data-table retention-table"><thead><tr><th>الأولوية</th><th>العميل</th><th>الخطر</th><th>القيمة</th><th>المحرك</th><th>الإجراء / المالك</th><th>حالة الحملة</th></tr></thead><tbody>{visible.map((customer, index) => <tr key={customer.customerId}><td><span className="queue-rank">{String(index + 1).padStart(2, '0')}</span><b>{customer.retentionPriorityScore.toFixed(1)}</b></td><td><b dir="ltr">{customer.customerId}</b><small>{customer.region} · {customer.serviceType}</small></td><td><RiskBadge level={customer.riskCategory}/><small>{formatPercent(customer.churnProbability30d)}</small></td><td><b>{formatCurrency(customer.monthlyRevenue)}</b><small>{formatCurrency(customer.revenueAtRisk)} معرض</small></td><td className="reason-cell">{customer.reasons[0]?.labelAr}</td><td className="action-cell">{customer.recommendedAction}<small>{customer.actionOwner}</small></td><td>{canEdit ? <select className={`status-select status-${customer.campaignStatus.toLowerCase()}`} value={customer.campaignStatus} onChange={(e) => changeStatus(customer, e.target.value as Customer['campaignStatus'])}><option value="NOT_STARTED">لم يبدأ</option><option value="IN_PROGRESS">قيد التنفيذ</option><option value="COMPLETED">مكتمل</option></select> : <span className={`status-chip status-${customer.campaignStatus.toLowerCase()}`}>{statusLabels[customer.campaignStatus]}</span>}</td></tr>)}</tbody></table></div>
      </ChartCard>
      {!canEdit && <p className="permission-note"><Icon name="shield"/> للتعديل، غيّر العرض إلى دور «فريق الاحتفاظ» أو «مسؤول النظام».</p>}
    </div>
  )
}
