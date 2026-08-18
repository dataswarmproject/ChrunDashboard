import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { RiskBadge } from './RiskBadge'

describe('RiskBadge', () => {
  it('includes a text label so risk is not communicated by color alone', () => {
    render(<RiskBadge level="CRITICAL" />)

    expect(screen.getByText('حرج')).toBeInTheDocument()
    expect(screen.getByLabelText('مستوى الخطر: حرج')).toBeInTheDocument()
  })
})
