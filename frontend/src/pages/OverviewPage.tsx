import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { chartColors, PercentTooltip } from '../components/ChartBits'
import { ChartCard, KpiCard } from '../components/Common'
import { CustomerRiskTable } from '../components/CustomerRiskTable'
import { formatCurrency, formatNumber, formatPercent } from '../lib/format'
import type { DashboardData, Customer } from '../types'

export function OverviewPage({
  data,
  onSelectCustomer,
}: {
  data: DashboardData
  onSelectCustomer: (customer: Customer) => void
}) {
  const { overview, risk, customers } = data
  return (
    <div className="page-stack">
      <div className="kpi-grid kpi-grid-seven">
        <KpiCard label="العملاء النشطون" value={formatNumber(overview.totalActiveCustomers)} meta="ضمن النطاق الحالي" icon="customer" />
        <KpiCard label="معدل Churn المتوقع" value={formatPercent(overview.predictedChurnRate)} meta="خلال 30 يومًا" tone="warning" icon="spark" />
        <KpiCard label="مخاطر مرتفعة" value={formatNumber(overview.highRiskCustomers)} meta="درجة 60–79" tone="warning" icon="risk" />
        <KpiCard label="مخاطر حرجة" value={formatNumber(overview.criticalRiskCustomers)} meta="درجة 80–100" tone="critical" icon="risk" />
        <KpiCard label="الإيراد الشهري المعرض" value={formatCurrency(overview.monthlyRevenueAtRisk)} meta="High + Critical" tone="critical" icon="drivers" />
        <KpiCard label="عملاء تم إنقاذهم" value={formatNumber(overview.customersSaved)} meta="نتائج حملات محاكاة" tone="positive" icon="retention" />
        <KpiCard label="إيراد محمي تقديريًا" value={formatCurrency(overview.estimatedRevenueProtected)} meta="شهريًا — محاكاة" tone="positive" icon="spark" />
      </div>

      <div className="analytics-grid overview-analytics">
        <ChartCard title="اتجاه خطر المغادرة" eyebrow="12 شهرًا — سلسلة محاكاة" className="wide-panel">
          <div className="chart-height">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={risk.trend} margin={{ top: 12, right: 8, left: 8, bottom: 0 }}>
                <defs><linearGradient id="riskArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={chartColors.teal} stopOpacity={0.35}/><stop offset="100%" stopColor={chartColors.teal} stopOpacity={0.02}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 6" vertical={false} stroke="#dce5eb" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} tickLine={false} axisLine={false} width={44} fontSize={11} />
                <Tooltip content={<PercentTooltip />} />
                <Area name="احتمال Churn" type="monotone" dataKey="churnProbability" stroke={chartColors.teal} strokeWidth={3} fill="url(#riskArea)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
        <ChartCard title="الخطر حسب المنطقة" eyebrow="متوسط احتمال 30 يومًا">
          <div className="chart-height">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={risk.byRegion} layout="vertical" margin={{ top: 8, right: 14, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 6" horizontal={false} stroke="#dce5eb" />
                <XAxis type="number" tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} tickLine={false} axisLine={false} fontSize={11} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={72} fontSize={11} />
                <Tooltip content={<PercentTooltip />} />
                <Bar name="احتمال Churn" dataKey="churnProbability" fill={chartColors.amber} radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <ChartCard title="أولوية التدخل الآن" eyebrow="مرتبة حسب القيمة × الخطر × قابلية الاحتفاظ" action={<span className="section-count">أعلى {customers.data.length} حالة</span>}>
        <CustomerRiskTable customers={customers.data} onSelect={onSelectCustomer} />
      </ChartCard>
    </div>
  )
}
