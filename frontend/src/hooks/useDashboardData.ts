import { useCallback, useEffect, useState } from 'react'

import { loadDashboardData } from '../lib/api'
import type { DashboardData, DashboardFilters, UserRole } from '../types'

export function useDashboardData(filters: DashboardFilters, role: UserRole) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshToken, setRefreshToken] = useState(0)

  const refresh = useCallback(() => setRefreshToken((value) => value + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    const stateTimer = window.setTimeout(() => {
      setLoading(true)
      setError('')
    }, 0)
    loadDashboardData(filters, role)
      .then((payload) => {
        if (!controller.signal.aborted) setData(payload)
      })
      .catch((caught: unknown) => {
        if (!controller.signal.aborted) {
          setError(caught instanceof Error ? caught.message : 'تعذر تحميل البيانات')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => {
      window.clearTimeout(stateTimer)
      controller.abort()
    }
  }, [filters, role, refreshToken])

  return { data, error, loading, refresh }
}
