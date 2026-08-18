import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { chartColors, NumberTooltip, PercentTooltip } from '../components/ChartBits'
import { ChartCard } from '../components/Common'
import { formatPercent } from '../lib/format'
import type { RiskAnalysis } from '../types'

const pieColors = [chartColors.teal, chartColors.blue, chartColors.amber]

export function RiskAnalysisPage({ risk }: { risk: RiskAnalysis }) {
  const services = [...new Set(risk.heatmap.map((point) => point.serviceType))]
  const regions = [...new Set(risk.heatmap.map((point) => point.region))]
  const heatValue = (region: string, service: string) => risk.heatmap.find((point) => point.region === region && point.serviceType === service)?.churnProbability ?? 0
  return (
    <div className="page-stack">
      <div className="analytics-grid three-columns">
        <ChartCard title="توزيع Churn Risk Score" eyebrow="عدد العملاء لكل عشر نقاط" className="wide-panel">
          <div className="chart-height"><ResponsiveContainer width="100%" height="100%"><BarChart data={risk.distribution}><CartesianGrid strokeDasharray="3 6" vertical={false} stroke="#dce5eb"/><XAxis dataKey="range" tickLine={false} axisLine={false} fontSize={10}/><YAxis tickLine={false} axisLine={false} fontSize={11}/><Tooltip content={<NumberTooltip />}/><Bar name="العملاء" dataKey="customers" radius={[5,5,0,0]}>{risk.distribution.map((_, index) => <Cell key={index} fill={index >= 8 ? chartColors.coral : index >= 6 ? chartColors.amber : chartColors.teal}/>)}</Bar></BarChart></ResponsiveContainer></div>
        </ChartCard>
        <ChartCard title="المزيج حسب الشريحة" eyebrow="الحصة من العملاء"><div className="chart-height"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={risk.bySegment} dataKey="customers" nameKey="name" innerRadius={62} outerRadius={92} paddingAngle={3}>{risk.bySegment.map((_, index) => <Cell key={index} fill={pieColors[index % pieColors.length]}/>)}</Pie><Tooltip content={<NumberTooltip />}/><Legend verticalAlign="bottom" iconType="circle"/></PieChart></ResponsiveContainer></div></ChartCard>
      </div>

      <div className="analytics-grid two-columns">
        <ChartCard title="مقارنة الخدمات" eyebrow="احتمال Churn والقيمة المعرضة"><div className="chart-height"><ResponsiveContainer width="100%" height="100%"><BarChart data={risk.byService}><CartesianGrid strokeDasharray="3 6" vertical={false} stroke="#dce5eb"/><XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11}/><YAxis tickFormatter={(value) => `${(value*100).toFixed(0)}%`} tickLine={false} axisLine={false}/><Tooltip content={<PercentTooltip />}/><Bar name="احتمال Churn" dataKey="churnProbability" fill={chartColors.blue} radius={[5,5,0,0]} barSize={28}/></BarChart></ResponsiveContainer></div></ChartCard>
        <ChartCard title="Risk heatmap" eyebrow="المنطقة × نوع الخدمة">
          <div className="heatmap" style={{ gridTemplateColumns: `minmax(78px, .8fr) repeat(${services.length}, 1fr)` }}>
            <span />{services.map((service) => <b key={service}>{service}</b>)}
            {regions.flatMap((region) => [<strong key={`${region}-label`}>{region}</strong>, ...services.map((service) => { const value = heatValue(region, service); const intensity = Math.min(1, value / 0.24); return <span key={`${region}-${service}`} className="heat-cell" style={{ backgroundColor: `rgba(228, 102, 92, ${0.08 + intensity * 0.82})` }} title={`${region} / ${service}: ${formatPercent(value)}`}>{formatPercent(value)}</span> })])}
          </div>
        </ChartCard>
      </div>
    </div>
  )
}
