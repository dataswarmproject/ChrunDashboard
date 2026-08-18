export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type UserRole = 'executive' | 'analyst' | 'retention' | 'operations' | 'admin'
export type PageKey =
  | 'overview'
  | 'risk'
  | 'drivers'
  | 'customer'
  | 'retention'
  | 'geography'
  | 'model'

export interface DashboardFilters {
  region: string
  serviceType: string
  segment: string
  riskLevel: string
  revenueBand: string
  tenureMin: string
  tenureMax: string
}

export interface FilterOptions {
  regions: string[]
  serviceTypes: string[]
  segments: string[]
  riskLevels: RiskLevel[]
  revenueBands: string[]
}

export interface Overview {
  datasetType: 'SYNTHETIC'
  datasetNoticeAr: string
  datasetNoticeEn: string
  totalActiveCustomers: number
  predictedChurnRate: number
  highRiskCustomers: number
  criticalRiskCustomers: number
  monthlyRevenueAtRisk: number
  customersSaved: number
  estimatedRevenueProtected: number
  population: number
  lastScoredAt: string
}

export interface BreakdownPoint {
  name: string
  customers: number
  churnProbability: number
  revenueAtRisk: number
}

export interface RiskAnalysis {
  distribution: { range: string; customers: number }[]
  byRegion: BreakdownPoint[]
  byService: BreakdownPoint[]
  bySegment: BreakdownPoint[]
  trend: { month: string; churnProbability: number }[]
  trendIsSimulated: boolean
  heatmap: { region: string; serviceType: string; churnProbability: number }[]
}

export interface FeatureImportance {
  feature: string
  labelAr: string
  importance: number
}

export interface Drivers {
  featureImportance: FeatureImportance[]
  explainabilityMethod: string
  outageImpact: ImpactPoint[]
  supportImpact: ImpactPoint[]
  usageDeclineImpact: ImpactPoint[]
  paymentImpact: ImpactPoint[]
  satisfactionImpact: ImpactPoint[]
}

export interface ImpactPoint {
  bucket: string
  churnProbability: number
}

export interface ChurnReason {
  code: string
  labelAr: string
  labelEn: string
  severity: number
}

export interface Customer {
  customerId: string
  region: string
  serviceType: string
  customerSegment: string
  currentPackage: string
  tenureMonths: number
  monthlyRevenue: number
  monthlyDataUsageGb: number
  usageChange30dPct: number
  usageChange90dPct: number
  averageSpeedMbps: number
  serviceOutages30d: number
  totalOutageMinutes30d: number
  supportTickets30d: number
  supportTickets90d: number
  complaints90d: number
  averageResolutionTimeHours: number
  paymentDelayDays: number
  failedPayments90d: number
  daysSinceLastRecharge: number
  customerSatisfactionScore: number
  npsScore: number
  churnProbability30d: number
  churnProbability60d: number
  churnProbability90d: number
  riskScore: number
  riskCategory: RiskLevel
  revenueAtRisk: number
  retentionProbability: number
  retentionPriorityScore: number
  reasons: ChurnReason[]
  recommendedAction: string
  recommendedActionCode: string
  actionOwner: string
  campaignStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
  retentionResult: 'PENDING' | 'SAVED' | 'CHURNED' | 'UNREACHABLE'
}

export interface PaginatedCustomers {
  data: Customer[]
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number }
}

export interface GeographyPoint {
  region: string
  latitude: number
  longitude: number
  customers: number
  churnProbability: number
  highRiskCustomers: number
  averageOutages: number
  averageSpeedMbps: number
  revenueAtRisk: number
}

export interface ModelMetric {
  rocAuc: number
  precision: number
  recall: number
  f1: number
  accuracy: number
  threshold: number
  confusionMatrix: {
    trueNegative: number
    falsePositive: number
    falseNegative: number
    truePositive: number
  }
  rocCurve: { x: number; y: number }[]
  precisionRecallCurve: { x: number; y: number }[]
}

export interface ModelPerformance {
  modelVersion: string
  selectedModel: string
  trainedAt: string
  threshold: number
  datasetType: string
  recordCount: number
  metrics: Record<string, ModelMetric>
  featureImportance: FeatureImportance[]
  explainabilityMethod: string
}

export interface DashboardData {
  overview: Overview
  risk: RiskAnalysis
  drivers: Drivers
  customers: PaginatedCustomers
  retention: PaginatedCustomers
  geography: GeographyPoint[]
  model: ModelPerformance
  options: FilterOptions
}
