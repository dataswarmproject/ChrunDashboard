import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { chartColors, NumberTooltip } from '../components/ChartBits'
import { ChartCard } from '../components/Common'
import { formatCurrency, formatPercent } from '../lib/format'
import type { GeographyPoint } from '../types'

const mapPositions: Record<string, [number, number]> = {
  Tripoli: [73, 32], Zawiya: [60, 34], Misrata: [106, 40], Benghazi: [161, 47], Sabha: [104, 112], Other: [131, 88],
}

export function GeographyPage({ geography }: { geography: GeographyPoint[] }) {
  const maxRisk = Math.max(...geography.map((point) => point.highRiskCustomers), 1)
  return (
    <div className="page-stack">
      <div className="analytics-grid geography-layout">
        <ChartCard title="تركيز الخطر عبر ليبيا" eyebrow="حجم الدائرة = عدد High + Critical" className="map-panel">
          <div className="libya-map-wrap">
            <svg className="libya-map" viewBox="0 0 220 180" role="img" aria-label="خريطة تحليلية تقريبية لليبيا">
              <path className="libya-shape" d="M37 20 87 14l27 8 36-3 25 18 7 29-12 22 11 39-27 20-32-9-23 23-35-22-18-34 8-36-19-22Z" />
              <path className="map-gridline" d="M45 68h126M86 18l17 131M145 24l-12 118"/>
              {geography.map((point) => { const [x,y] = mapPositions[point.region] ?? mapPositions.Other; const radius = 5 + (point.highRiskCustomers/maxRisk)*11; return <g key={point.region} className="map-point" tabIndex={0}><circle cx={x} cy={y} r={radius} /><circle cx={x} cy={y} r="2" className="map-core"/><text x={x} y={y-radius-4} textAnchor="middle">{point.region}</text><title>{point.region}: {formatPercent(point.churnProbability)} — {point.highRiskCustomers} عميل عالي الخطر</title></g> })}
            </svg>
            <div className="map-legend"><span><i className="legend-bubble small"/> خطر أقل</span><span><i className="legend-bubble large"/> خطر أعلى</span></div>
          </div>
        </ChartCard>
        <div className="region-list panel"><span className="eyebrow">Regional watchlist</span><h2>قائمة المراقبة الجغرافية</h2>{geography.map((point, index) => <article key={point.region}><span className="region-rank">{index+1}</span><div><b>{point.region}</b><small>{point.customers.toLocaleString('en-US')} عميل</small></div><div><strong>{formatPercent(point.churnProbability)}</strong><small>{point.highRiskCustomers} عالي الخطر</small></div></article>)}</div>
      </div>
      <div className="analytics-grid two-columns">
        <ChartCard title="الإيراد المعرض حسب المنطقة" eyebrow="Probability-weighted LYD"><div className="chart-height"><ResponsiveContainer width="100%" height="100%"><BarChart data={geography}><CartesianGrid strokeDasharray="3 6" vertical={false} stroke="#dce5eb"/><XAxis dataKey="region" tickLine={false} axisLine={false}/><YAxis tickLine={false} axisLine={false} width={58}/><Tooltip content={<NumberTooltip />}/><Bar name="إيراد معرض" dataKey="revenueAtRisk" fill={chartColors.coral} radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></div></ChartCard>
        <ChartCard title="جودة الخدمة الإقليمية" eyebrow="السرعة والانقطاعات"><div className="quality-table">{geography.map((point) => <article key={point.region}><b>{point.region}</b><div><span>السرعة <strong>{point.averageSpeedMbps} Mbps</strong></span><span>الانقطاعات <strong>{point.averageOutages}</strong></span></div><em>{formatCurrency(point.revenueAtRisk)}</em></article>)}</div></ChartCard>
      </div>
    </div>
  )
}
