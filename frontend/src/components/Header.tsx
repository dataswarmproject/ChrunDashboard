import { Icon } from './Icon'
import type { PageKey, UserRole } from '../types'

const titles: Record<PageKey, { title: string; subtitle: string }> = {
  overview: { title: 'النظرة التنفيذية', subtitle: 'صورة موحّدة للمخاطر والقيمة القابلة للحماية' },
  risk: { title: 'تحليل مخاطر المغادرة', subtitle: 'أين يتركز الخطر وكيف يتحرك عبر الشرائح؟' },
  drivers: { title: 'لماذا يغادر العملاء؟', subtitle: 'تفسير إشارات النموذج وتحويلها إلى أسباب مفهومة' },
  customer: { title: 'ملف العميل 360°', subtitle: 'سياق العميل، احتمال المغادرة، والإجراء الأفضل التالي' },
  retention: { title: 'مركز إجراءات الاحتفاظ', subtitle: 'قائمة تدخل مرتبة حسب القيمة القابلة للحماية' },
  geography: { title: 'التحليل الجغرافي', subtitle: 'ربط جودة الخدمة والخطر والإيراد بالمناطق' },
  model: { title: 'أداء النموذج وحوكمته', subtitle: 'مقارنة النماذج، العتبة، وقابلية التفسير' },
}

const roleLabels: Record<UserRole, string> = {
  executive: 'الإدارة العليا',
  analyst: 'محلل BI',
  retention: 'فريق الاحتفاظ',
  operations: 'عمليات الشبكة',
  admin: 'مسؤول النظام',
}

export function Header({
  page,
  role,
  onRoleChange,
  onToggleSidebar,
  onRefresh,
}: {
  page: PageKey
  role: UserRole
  onRoleChange: (role: UserRole) => void
  onToggleSidebar: () => void
  onRefresh: () => void
}) {
  return (
    <header className="topbar">
      <div className="page-heading">
        <button className="menu-button" onClick={onToggleSidebar} aria-label="فتح قائمة التنقل">☰</button>
        <div><h1>{titles[page].title}</h1><p>{titles[page].subtitle}</p></div>
      </div>
      <div className="topbar-actions">
        <button className="icon-button" onClick={onRefresh} aria-label="تحديث البيانات"><Icon name="refresh" /></button>
        <label className="role-select">
          <span>عرض بصفة</span>
          <select value={role} onChange={(event) => onRoleChange(event.target.value as UserRole)}>
            {Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <div className="profile-chip"><span>أه</span><div><b>أحمد هلوب</b><small>{roleLabels[role]}</small></div></div>
      </div>
    </header>
  )
}
