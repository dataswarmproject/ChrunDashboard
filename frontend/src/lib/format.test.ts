import { describe, expect, it } from 'vitest'

import { buildFilterQuery, formatCurrency, riskLabel } from './format'

describe('dashboard formatting', () => {
  it('renders business risk categories bilingually', () => {
    expect(riskLabel('CRITICAL')).toBe('حرج')
    expect(riskLabel('HIGH')).toBe('مرتفع')
  })

  it('formats Libyan dinar values consistently', () => {
    expect(formatCurrency(1234.5)).toContain('1,234.5')
    expect(formatCurrency(1234.5)).toContain('د.ل')
  })

  it('only serializes active filters and uses API field names', () => {
    expect(
      buildFilterQuery({
        region: 'Tripoli',
        serviceType: '',
        segment: 'SME',
        riskLevel: 'HIGH',
        revenueBand: '',
        tenureMin: '',
        tenureMax: '',
      }),
    ).toBe('region=Tripoli&segment=SME&riskLevel=HIGH')
  })
})

