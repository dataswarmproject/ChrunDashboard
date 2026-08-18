import { riskLabel } from '../lib/format'
import type { RiskLevel } from '../types'

export function RiskBadge({ level }: { level: RiskLevel }) {
  const label = riskLabel(level)
  return (
    <span className={`risk-badge risk-${level.toLowerCase()}`} aria-label={`مستوى الخطر: ${label}`}>
      <span className="risk-dot" aria-hidden="true" />
      {label}
    </span>
  )
}
