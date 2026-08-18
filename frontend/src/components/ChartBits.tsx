import { formatNumber, formatPercent } from '../lib/format'

export const chartColors = {
  teal: '#18a999',
  navy: '#153f5f',
  amber: '#f0a93b',
  coral: '#e4665c',
  blue: '#3f82c4',
  muted: '#8aa0b2',
}

interface DashboardTooltipProps {
  active?: boolean
  label?: string | number
  payload?: { dataKey?: string | number; name?: string | number; value?: number; color?: string }[]
}

export function PercentTooltip({ active, payload, label }: DashboardTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <b>{label}</b>
      {payload.map((entry) => (
        <span key={String(entry.dataKey)} style={{ color: entry.color }}>
          {entry.name}: {formatPercent(Number(entry.value))}
        </span>
      ))}
    </div>
  )
}

export function NumberTooltip({ active, payload, label }: DashboardTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <b>{label}</b>
      {payload.map((entry) => (
        <span key={String(entry.dataKey)} style={{ color: entry.color }}>
          {entry.name}: {formatNumber(Number(entry.value))}
        </span>
      ))}
    </div>
  )
}
