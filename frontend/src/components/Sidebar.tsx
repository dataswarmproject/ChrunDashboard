import { Icon } from './Icon'
import type { PageKey } from '../types'

const navigation: { key: PageKey; label: string; hint: string }[] = [
  { key: 'overview', label: 'النظرة التنفيذية', hint: 'Executive' },
  { key: 'risk', label: 'تحليل مخاطر المغادرة', hint: 'Risk analysis' },
  { key: 'drivers', label: 'لماذا يغادر العملاء؟', hint: 'Churn drivers' },
  { key: 'customer', label: 'ملف العميل 360°', hint: 'Customer 360' },
  { key: 'retention', label: 'مركز إجراءات الاحتفاظ', hint: 'Action center' },
  { key: 'geography', label: 'التحليل الجغرافي', hint: 'Geography' },
  { key: 'model', label: 'أداء النموذج', hint: 'Model governance' },
]

export function Sidebar({
  activePage,
  onNavigate,
  open,
}: {
  activePage: PageKey
  onNavigate: (page: PageKey) => void
  open: boolean
}) {
  return (
    <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
      <div className="brand-block">
        <div className="brand-mark" aria-hidden="true"><span>L</span></div>
        <div>
          <strong>LTT Intelligence</strong>
          <small>Customer Retention OS</small>
        </div>
      </div>
      <nav aria-label="التنقل الرئيسي">
        {navigation.map((item) => (
          <button
            key={item.key}
            className={activePage === item.key ? 'nav-item nav-active' : 'nav-item'}
            onClick={() => onNavigate(item.key)}
            aria-current={activePage === item.key ? 'page' : undefined}
          >
            <Icon name={item.key} />
            <span><b>{item.label}</b><small>{item.hint}</small></span>
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <Icon name="shield" />
        <div><b>بيئة تجريبية آمنة</b><small>البيانات اصطناعية بالكامل</small></div>
      </div>
    </aside>
  )
}
