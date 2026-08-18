"""Business scoring rules shared by training and serving layers."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any


def risk_category(score: float) -> str:
    """Map a 0-100 score to the approved business risk bands."""
    bounded = max(0.0, min(100.0, float(score)))
    if bounded < 30:
        return "LOW"
    if bounded < 60:
        return "MEDIUM"
    if bounded < 80:
        return "HIGH"
    return "CRITICAL"


def calculate_priority_score(
    churn_probability: float,
    monthly_revenue: float,
    estimated_retention_probability: float,
) -> float:
    """Rank interventions by expected protectable monthly revenue."""
    probability = max(0.0, min(1.0, float(churn_probability)))
    revenue = max(0.0, float(monthly_revenue))
    retainability = max(0.0, min(1.0, float(estimated_retention_probability)))
    return round(probability * revenue * retainability, 2)


def derive_reason_codes(customer: Mapping[str, Any]) -> list[dict[str, Any]]:
    """Return the three strongest understandable churn warning signals."""
    candidates: list[dict[str, Any]] = []

    usage_change = float(customer.get("usage_change_30d_pct", 0) or 0)
    if usage_change <= -20:
        candidates.append(
            {
                "code": "USAGE_DROP",
                "labelAr": f"انخفاض الاستخدام {abs(round(usage_change))}% خلال 30 يومًا",
                "labelEn": "Sharp 30-day usage decline",
                "severity": min(100, abs(usage_change) * 1.65),
            }
        )

    outages = int(customer.get("service_outages_30d", 0) or 0)
    outage_minutes = int(customer.get("total_outage_minutes_30d", 0) or 0)
    if outages >= 2 or outage_minutes >= 120:
        candidates.append(
            {
                "code": "SERVICE_INSTABILITY",
                "labelAr": f"{outages} انقطاعات بإجمالي {outage_minutes} دقيقة",
                "labelEn": "Repeated service instability",
                "severity": min(98, outages * 14 + outage_minutes / 12),
            }
        )

    complaints = int(customer.get("complaints_90d", 0) or 0)
    tickets = int(customer.get("support_tickets_90d", 0) or 0)
    if complaints >= 2 or tickets >= 4:
        candidates.append(
            {
                "code": "SUPPORT_FRICTION",
                "labelAr": f"{complaints} شكاوى و{tickets} تذاكر دعم خلال 90 يومًا",
                "labelEn": "Elevated support and complaint volume",
                "severity": min(95, complaints * 16 + tickets * 6),
            }
        )

    payment_delay = int(customer.get("payment_delay_days", 0) or 0)
    failed_payments = int(customer.get("failed_payments_90d", 0) or 0)
    if payment_delay >= 7 or failed_payments >= 2:
        candidates.append(
            {
                "code": "PAYMENT_FRICTION",
                "labelAr": f"تأخر التجديد {payment_delay} يومًا مع {failed_payments} دفعات متعثرة",
                "labelEn": "Renewal or payment friction",
                "severity": min(92, payment_delay * 3 + failed_payments * 14),
            }
        )

    satisfaction = float(customer.get("customer_satisfaction_score", 5) or 5)
    if satisfaction < 3:
        candidates.append(
            {
                "code": "LOW_SATISFACTION",
                "labelAr": f"رضا منخفض ({satisfaction:.1f} من 5)",
                "labelEn": "Low customer satisfaction",
                "severity": min(90, (5 - satisfaction) * 24),
            }
        )

    nps = int(customer.get("nps_score", 0) or 0)
    if nps <= -20:
        candidates.append(
            {
                "code": "NPS_DETRACTOR",
                "labelAr": f"العميل ضمن فئة المنتقدين (NPS {nps})",
                "labelEn": "Strong NPS detractor",
                "severity": min(88, abs(nps)),
            }
        )

    if not candidates:
        candidates.append(
            {
                "code": "WEAK_ENGAGEMENT",
                "labelAr": "إشارات ارتباط أضعف من العملاء المشابهين",
                "labelEn": "Below-peer engagement signals",
                "severity": 20,
            }
        )

    return sorted(candidates, key=lambda reason: reason["severity"], reverse=True)[:3]


def recommend_retention_action(
    customer: Mapping[str, Any], reasons: list[dict[str, Any]] | None = None
) -> dict[str, str]:
    """Translate drivers and customer value into an executable intervention."""
    reason_codes = {reason["code"] for reason in (reasons or derive_reason_codes(customer))}
    revenue = float(customer.get("monthly_revenue", 0) or 0)

    has_service_failure = (
        "SERVICE_INSTABILITY" in reason_codes
        or int(customer.get("service_outages_30d", 0) or 0) >= 3
    )
    has_support_friction = (
        "SUPPORT_FRICTION" in reason_codes or int(customer.get("complaints_90d", 0) or 0) >= 2
    )
    if has_service_failure and has_support_friction:
        return {
            "code": "TECHNICAL_RECOVERY",
            "labelAr": "تصعيد فني استباقي ثم تواصل شخصي خلال 24 ساعة",
            "labelEn": "Technical escalation and proactive contact within 24 hours",
            "owner": "Network Ops + Customer Care",
        }
    if revenue >= 180:
        return {
            "code": "VIP_SAVE_DESK",
            "labelAr": "مكالمة احتفاظ ذات أولوية وعرض شخصي مرتبط بسبب الخطر",
            "labelEn": "Priority save-desk call with a personalized offer",
            "owner": "Retention Team",
        }
    if "USAGE_DROP" in reason_codes:
        return {
            "code": "EXPERIENCE_CHECK",
            "labelAr": "تواصل للتحقق من التجربة واحتمال الانتقال إلى منافس",
            "labelEn": "Experience check and competitor-migration investigation",
            "owner": "Customer Experience",
        }
    if "PAYMENT_FRICTION" in reason_codes:
        return {
            "code": "RENEWAL_NUDGE",
            "labelAr": "تذكير بالتجديد مع عرض باقة ملائم للسلوك",
            "labelEn": "Renewal reminder with a behavior-matched package offer",
            "owner": "Marketing",
        }
    return {
        "code": "CARE_RECOVERY",
        "labelAr": "تدخل لاستعادة تجربة العميل ومتابعة الرضا",
        "labelEn": "Customer experience recovery and satisfaction follow-up",
        "owner": "Customer Care",
    }
