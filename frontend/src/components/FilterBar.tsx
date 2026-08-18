import { Icon } from './Icon'
import type { DashboardFilters, FilterOptions } from '../types'

const emptyFilters: DashboardFilters = {
  region: '', serviceType: '', segment: '', riskLevel: '', revenueBand: '', tenureMin: '', tenureMax: '',
}

export function FilterBar({
  filters,
  options,
  onChange,
}: {
  filters: DashboardFilters
  options: FilterOptions
  onChange: (filters: DashboardFilters) => void
}) {
  const activeCount = Object.values(filters).filter(Boolean).length
  const set = (key: keyof DashboardFilters, value: string) => onChange({ ...filters, [key]: value })
  return (
    <section className="filter-bar" aria-label="مرشحات لوحة التحكم">
      <div className="filter-title"><Icon name="filter" /><span>تصفية ذكية</span>{activeCount > 0 && <b>{activeCount}</b>}</div>
      <label><span>المنطقة</span><select value={filters.region} onChange={(e) => set('region', e.target.value)}><option value="">كل المناطق</option>{options.regions.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label><span>الخدمة</span><select value={filters.serviceType} onChange={(e) => set('serviceType', e.target.value)}><option value="">كل الخدمات</option>{options.serviceTypes.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label><span>الشريحة</span><select value={filters.segment} onChange={(e) => set('segment', e.target.value)}><option value="">كل الشرائح</option>{options.segments.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label><span>مستوى الخطر</span><select value={filters.riskLevel} onChange={(e) => set('riskLevel', e.target.value)}><option value="">كل المستويات</option>{options.riskLevels.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label><span>الإيراد</span><select value={filters.revenueBand} onChange={(e) => set('revenueBand', e.target.value)}><option value="">كل القيم</option><option value="LOW">أقل من 60 د.ل</option><option value="MEDIUM">60–149 د.ل</option><option value="HIGH">150 د.ل فأكثر</option></select></label>
      <label className="tenure-filter"><span>مدة الاشتراك</span><div><input type="number" min="0" max="240" placeholder="من" value={filters.tenureMin} onChange={(e) => set('tenureMin', e.target.value)} /><input type="number" min="0" max="240" placeholder="إلى" value={filters.tenureMax} onChange={(e) => set('tenureMax', e.target.value)} /></div></label>
      {activeCount > 0 && <button className="clear-button" onClick={() => onChange(emptyFilters)}>مسح الكل</button>}
    </section>
  )
}

export { emptyFilters }
