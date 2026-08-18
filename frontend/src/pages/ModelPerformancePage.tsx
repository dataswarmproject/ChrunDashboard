import { useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { chartColors } from '../components/ChartBits'
import { ChartCard, KpiCard } from '../components/Common'
import { formatDate, formatNumber, formatPercent } from '../lib/format'
import type { ModelPerformance } from '../types'

const metricColumns = [
  { key: 'rocAuc', label: 'ROC-AUC' },
  { key: 'recall', label: 'Recall' },
  { key: 'precision', label: 'Precision' },
  { key: 'f1', label: 'F1' },
  { key: 'accuracy', label: 'Accuracy' },
] as const

function CurveChart({
  points,
  color,
  xLabel,
  yLabel,
  diagonal = false,
}: {
  points: { x: number; y: number }[]
  color: string
  xLabel: string
  yLabel: string
  diagonal?: boolean
}) {
  return (
    <div className="chart-height">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 10, right: 12, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 6" stroke="#dce5eb" />
          <XAxis
            dataKey="x"
            type="number"
            domain={[0, 1]}
            tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`}
            tickLine={false}
            axisLine={false}
            fontSize={10}
          />
          <YAxis
            type="number"
            domain={[0, 1]}
            tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`}
            tickLine={false}
            axisLine={false}
            width={40}
            fontSize={10}
          />
          <Tooltip
            formatter={(value) => [formatPercent(Number(value)), yLabel]}
            labelFormatter={(label) => `${xLabel}: ${formatPercent(Number(label))}`}
          />
          {diagonal && (
            <ReferenceLine
              segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]}
              stroke={chartColors.muted}
              strokeDasharray="4 5"
            />
          )}
          <Line
            name={yLabel}
            type="monotone"
            dataKey="y"
            stroke={color}
            strokeWidth={2.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ModelPerformancePage({ model }: { model: ModelPerformance }) {
  const [inspected, setInspected] = useState(model.selectedModel)
  const active = model.metrics[inspected] ?? model.metrics[model.selectedModel]
  const matrix = active.confusionMatrix
  const total =
    matrix.trueNegative + matrix.falsePositive + matrix.falseNegative + matrix.truePositive
  const matrixCells = [
    { key: 'tn', label: 'صحيح سلبي TN', hint: 'بقي ولم ننذر', value: matrix.trueNegative, tone: 'quiet' },
    { key: 'fp', label: 'إنذار زائد FP', hint: 'أنذرنا وبقي', value: matrix.falsePositive, tone: 'warn' },
    { key: 'fn', label: 'خطر مفقود FN', hint: 'غادر دون إنذار', value: matrix.falseNegative, tone: 'danger' },
    { key: 'tp', label: 'التقاط صحيح TP', hint: 'أنذرنا وغادر فعلًا', value: matrix.truePositive, tone: 'good' },
  ]
  const topFeatures = model.featureImportance.slice(0, 10)

  return (
    <div className="page-stack">
      <div className="kpi-grid kpi-grid-five">
        <KpiCard label="ROC-AUC" value={formatPercent(active.rocAuc)} meta={inspected} icon="model" />
        <KpiCard label="Recall — التقاط المغادرين" value={formatPercent(active.recall)} meta="أولوية القرار الأولى" tone="warning" icon="risk" />
        <KpiCard label="Precision — دقة الإنذار" value={formatPercent(active.precision)} meta="كلفة الحملات الزائدة" icon="spark" />
        <KpiCard label="F1 Score" value={formatPercent(active.f1)} meta="التوازن بين الاثنين" icon="drivers" />
        <KpiCard label="عتبة القرار" value={formatPercent(active.threshold, 0)} meta="Threshold مضبوطة للأعمال" icon="model" />
      </div>

      <div className="analytics-grid governance-layout">
        <ChartCard
          title="مقارنة النماذج المرشحة"
          eyebrow="الاختيار وفق ROC-AUC وRecall وPrecision — وليس Accuracy"
          className="wide-panel"
          action={<span className="section-count">اضغط نموذجًا لفحص منحنياته</span>}
        >
          <div className="table-scroll">
            <table className="data-table model-table">
              <thead>
                <tr>
                  <th>النموذج</th>
                  {metricColumns.map((column) => <th key={column.key}>{column.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {Object.entries(model.metrics).map(([name, metric]) => (
                  <tr
                    key={name}
                    onClick={() => setInspected(name)}
                    className={`clickable-row ${name === inspected ? 'inspected-row' : ''}`}
                  >
                    <td>
                      <b dir="ltr">{name}</b>
                      {name === model.selectedModel && <span className="champion-chip">المعتمد ★</span>}
                    </td>
                    {metricColumns.map((column) => (
                      <td key={column.key} dir="ltr">{formatPercent(metric[column.key])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>

        <div className="governance-panel panel">
          <span className="eyebrow">Model governance</span>
          <h2>بطاقة حوكمة النموذج</h2>
          <dl className="governance-list">
            <div><dt>إصدار النموذج</dt><dd dir="ltr">{model.modelVersion}</dd></div>
            <div><dt>النموذج المعتمد</dt><dd dir="ltr">{model.selectedModel}</dd></div>
            <div><dt>آخر تدريب</dt><dd>{formatDate(model.trainedAt)}</dd></div>
            <div><dt>حجم بيانات التدريب</dt><dd dir="ltr">{formatNumber(model.recordCount)}</dd></div>
            <div><dt>نوع البيانات</dt><dd><span className="synthetic-chip">{model.datasetType}</span></dd></div>
            <div><dt>طريقة التفسير</dt><dd dir="ltr">{model.explainabilityMethod}</dd></div>
          </dl>
          <p className="governance-note">
            نُفضّل التقاط أكبر عدد من المغادرين الحقيقيين (Recall) مع إبقاء كلفة الإنذارات
            الزائدة تحت السيطرة، لأن تفويت عميل يغادر أغلى من مكالمة احتفاظ إضافية.
          </p>
        </div>
      </div>

      <div className="analytics-grid two-columns">
        <ChartCard title="منحنى ROC" eyebrow={`${inspected} — مقابل خط الحظ العشوائي`}>
          <CurveChart points={active.rocCurve} color={chartColors.teal} xLabel="FPR" yLabel="TPR" diagonal />
        </ChartCard>
        <ChartCard title="منحنى Precision-Recall" eyebrow="الأهم مع فئة Churn غير المتوازنة">
          <CurveChart points={active.precisionRecallCurve} color={chartColors.coral} xLabel="Recall" yLabel="Precision" />
        </ChartCard>
      </div>

      <div className="analytics-grid two-columns">
        <ChartCard title="مصفوفة الالتباس" eyebrow={`${inspected} — عيّنة اختبار ${formatNumber(total)} عميل`}>
          <div className="matrix-wrap">
            <div className="matrix-axis matrix-axis-x"><span>التوقع: يبقى</span><span>التوقع: يغادر</span></div>
            <div className="matrix-grid">
              {matrixCells.map((cell) => (
                <article key={cell.key} className={`matrix-cell matrix-${cell.tone}`}>
                  <span>{cell.label}</span>
                  <b>{formatNumber(cell.value)}</b>
                  <small>{formatPercent(total ? cell.value / total : 0)} — {cell.hint}</small>
                </article>
              ))}
            </div>
          </div>
        </ChartCard>
        <ChartCard title="أهمية الميزات العالمية" eyebrow={`${model.explainabilityMethod} — Mean |impact|`}>
          <div className="tall-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topFeatures} layout="vertical" margin={{ top: 6, right: 18, left: 12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 6" horizontal={false} stroke="#dce5eb" />
                <XAxis type="number" tickFormatter={(value) => `${(Number(value) * 100).toFixed(0)}%`} tickLine={false} axisLine={false} fontSize={10} />
                <YAxis type="category" dataKey="labelAr" width={150} tickLine={false} axisLine={false} fontSize={11} />
                <Tooltip formatter={(value) => formatPercent(Number(value))} />
                <Bar name="الأهمية" dataKey="importance" fill={chartColors.blue} radius={[0, 4, 4, 0]} barSize={15} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  )
}
