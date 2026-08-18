import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { chartColors, PercentTooltip } from '../components/ChartBits'
import { ChartCard } from '../components/Common'
import { formatPercent } from '../lib/format'
import type { Drivers, ImpactPoint } from '../types'

function ImpactChart({ data, color = chartColors.teal }: { data: ImpactPoint[]; color?: string }) {
  return <div className="mini-chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}><CartesianGrid strokeDasharray="3 6" vertical={false} stroke="#dce5eb"/><XAxis dataKey="bucket" tickLine={false} axisLine={false} fontSize={10}/><YAxis tickFormatter={(value) => `${(value*100).toFixed(0)}%`} tickLine={false} axisLine={false} width={36} fontSize={10}/><Tooltip content={<PercentTooltip />}/><Line name="احتمال Churn" type="monotone" dataKey="churnProbability" stroke={color} strokeWidth={2.5} dot={{ r: 4, fill: '#fff', strokeWidth: 2 }}/></LineChart></ResponsiveContainer></div>
}

export function DriversPage({ drivers }: { drivers: Drivers }) {
  const topFeatures = drivers.featureImportance.slice(0, 10)
  return (
    <div className="page-stack">
      <div className="insight-banner"><span className="insight-number">01</span><div><b>الإشارة التنفيذية الأهم</b><p>ارتفاع الانقطاعات والشكاوى مع انخفاض الاستخدام يشكّل نمط الخطر الأكثر قابلية للتدخل. التفسير مبني على {drivers.explainabilityMethod} لبيانات اصطناعية.</p></div></div>
      <div className="analytics-grid two-columns">
        <ChartCard title="أهم محركات Churn" eyebrow={`${drivers.explainabilityMethod} — Mean |impact|`}>
          <div className="tall-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={topFeatures} layout="vertical" margin={{ top: 6, right: 18, left: 12, bottom: 0 }}><CartesianGrid strokeDasharray="3 6" horizontal={false} stroke="#dce5eb"/><XAxis type="number" tickFormatter={(value) => `${(value*100).toFixed(0)}%`} tickLine={false} axisLine={false}/><YAxis type="category" dataKey="labelAr" width={150} tickLine={false} axisLine={false} fontSize={11}/><Tooltip formatter={(value) => formatPercent(Number(value))}/><Bar name="الأهمية" dataKey="importance" fill={chartColors.navy} radius={[0,4,4,0]} barSize={15}/></BarChart></ResponsiveContainer></div>
        </ChartCard>
        <div className="driver-summary panel">
          <span className="eyebrow">ترجمة النموذج إلى قرار</span><h2>من الإشارة إلى التدخل</h2>
          <ol className="decision-flow"><li><span>01</span><div><b>رصد مبكر</b><p>هبوط استخدام، أعطال، شكاوى، أو احتكاك بالدفع.</p></div></li><li><span>02</span><div><b>تفسير فردي</b><p>ثلاثة reason codes واضحة لكل عميل.</p></div></li><li><span>03</span><div><b>ترتيب تجاري</b><p>الاحتمال × قيمة العميل × قابلية الاحتفاظ.</p></div></li><li><span>04</span><div><b>إجراء مالك بزمن</b><p>ربط الحالة بالفريق المسؤول وإجراء قابل للتنفيذ.</p></div></li></ol>
        </div>
      </div>
      <div className="impact-grid">
        <ChartCard title="أثر الانقطاعات" eyebrow="انقطاعات / 30 يومًا"><ImpactChart data={drivers.outageImpact} color={chartColors.coral}/></ChartCard>
        <ChartCard title="أثر الدعم والشكاوى" eyebrow="تذاكر / 90 يومًا"><ImpactChart data={drivers.supportImpact} color={chartColors.amber}/></ChartCard>
        <ChartCard title="أثر انخفاض الاستخدام" eyebrow="تغير 30 يومًا"><ImpactChart data={drivers.usageDeclineImpact} color={chartColors.blue}/></ChartCard>
        <ChartCard title="أثر تأخر الدفع" eyebrow="أيام التأخير"><ImpactChart data={drivers.paymentImpact} color={chartColors.navy}/></ChartCard>
        <ChartCard title="أثر رضا العميل" eyebrow="CSAT 1–5"><ImpactChart data={drivers.satisfactionImpact} color={chartColors.teal}/></ChartCard>
      </div>
    </div>
  )
}
