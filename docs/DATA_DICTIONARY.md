# Synthetic data dictionary

The dataset is customer-grain: one row per synthetic customer at the scoring snapshot. `customer_id` is artificial and contains no personal information.

| Field group | Fields | Meaning |
|---|---|---|
| Identity and mix | `customer_id`, `region`, `service_type`, `customer_segment`, `current_package` | Synthetic customer key and commercial dimensions |
| Value and tenure | `tenure_months`, `monthly_revenue` | Relationship age and monthly revenue in LYD |
| Usage | `monthly_data_usage_gb`, `usage_change_30d_pct`, `usage_change_90d_pct` | Usage level and early-warning movement |
| Service quality | `average_speed_mbps`, `service_outages_30d`, `total_outage_minutes_30d` | Experience and reliability signals |
| Support | `support_tickets_30d`, `support_tickets_90d`, `complaints_90d`, `average_resolution_time_hours` | Care workload and customer friction |
| Payment | `payment_delay_days`, `failed_payments_90d`, `days_since_last_recharge` | Renewal and payment behaviour |
| Relationship | `package_changes_90d`, `customer_satisfaction_score`, `nps_score` | Package movement and sentiment |
| Label | `churn` | 1 for a simulated churn event in the defined training window, otherwise 0 |
| Predictions | `churn_probability_30d`, `churn_probability_60d`, `churn_probability_90d`, `churn_risk_score`, `risk_category` | Decision-support risk outputs |
| Decision outputs | `revenue_at_risk`, `estimated_retention_probability`, `retention_priority_score`, `reason_codes`, `recommended_action` | Business impact, explanation, and intervention |
