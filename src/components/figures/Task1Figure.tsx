import { Fragment, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Schemas } from '../../api/client';
import { seriesColor, toCategoryRows, toPieSlices } from '../../lib/chartData';
import { MapFigure } from '../questions/MapFigure';

type Task1 = Schemas['Task1Academic'];

const axisTick = { fill: 'var(--text-muted)', fontSize: 12 };
const tooltipStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text)',
  fontSize: 13,
};

/** Renders the Academic Task 1 figure from generated data, as the candidate would see it in the exam. */
export function Task1Figure({ task }: { task: Task1 }) {
  const [asTable, setAsTable] = useState(task.chart_type === 'TABLE');
  const chartable = ['LINE', 'BAR', 'PIE'].includes(task.chart_type);
  return (
    <figure className="figure" style={{ margin: 0 }}>
      <figcaption className="row-between" style={{ marginBottom: '0.5rem' }}>
        <strong>{task.figure_title}</strong>
        {chartable && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAsTable((t) => !t)}>
            {asTable ? 'Show chart' : 'Show data table'}
          </button>
        )}
      </figcaption>
      {task.units && chartable && !asTable && <div className="small muted">Units: {task.units}</div>}
      {asTable && (task.chart_type === 'TABLE' || chartable) && <DataTable task={task} />}
      {!asTable && task.chart_type === 'LINE' && <LineFigure task={task} />}
      {!asTable && task.chart_type === 'BAR' && <BarFigure task={task} />}
      {!asTable && task.chart_type === 'PIE' && <PieFigure task={task} />}
      {task.chart_type === 'PROCESS' && <ProcessFigure task={task} />}
      {task.chart_type === 'MAP' && (
        <div className="grid grid-2">
          {task.maps.map((m, i) => (
            <MapFigure key={i} map={{ features: m.features }} title={m.title} />
          ))}
        </div>
      )}
    </figure>
  );
}

function LineFigure({ task }: { task: Task1 }) {
  const rows = toCategoryRows(task.categories, task.series);
  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={rows} margin={{ top: 12, right: 24, bottom: 8, left: 8 }}>
        <CartesianGrid stroke="var(--grid)" vertical={false} />
        <XAxis
          dataKey="category"
          tick={axisTick}
          stroke="var(--axis)"
          label={axisLabel(task.x_label, 'insideBottom')}
          height={task.x_label ? 44 : 30}
        />
        <YAxis
          tick={axisTick}
          stroke="var(--axis)"
          width={56}
          label={axisLabel(task.y_label || task.units, 'insideLeft')}
        />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend verticalAlign="top" height={34} wrapperStyle={{ fontSize: 13, color: 'var(--text)' }} />
        {task.series.map((s, i) => (
          <Line
            key={s.name}
            type="linear"
            dataKey={s.name}
            stroke={seriesColor(i)}
            strokeWidth={2}
            dot={{ r: 4, strokeWidth: 2, fill: 'var(--surface)' }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function BarFigure({ task }: { task: Task1 }) {
  const rows = toCategoryRows(task.categories, task.series);
  return (
    <ResponsiveContainer width="100%" height={340}>
      <BarChart
        data={rows}
        margin={{ top: 12, right: 16, bottom: 8, left: 8 }}
        barGap={2}
        barCategoryGap="18%"
      >
        <CartesianGrid stroke="var(--grid)" vertical={false} />
        <XAxis
          dataKey="category"
          tick={axisTick}
          stroke="var(--axis)"
          interval={0}
          label={axisLabel(task.x_label, 'insideBottom')}
          height={task.x_label ? 44 : 30}
        />
        <YAxis
          tick={axisTick}
          stroke="var(--axis)"
          width={56}
          label={axisLabel(task.y_label || task.units, 'insideLeft')}
        />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--surface-2)' }} />
        <Legend verticalAlign="top" height={34} wrapperStyle={{ fontSize: 13, color: 'var(--text)' }} />
        {task.series.map((s, i) => (
          <Bar
            key={s.name}
            dataKey={s.name}
            fill={seriesColor(i)}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function PieFigure({ task }: { task: Task1 }) {
  return (
    <div
      className="grid"
      style={{ gridTemplateColumns: `repeat(${Math.min(task.series.length, 3)}, minmax(0, 1fr))` }}
    >
      {task.series.map((s) => {
        const slices = toPieSlices(task.categories, s);
        return (
          <div key={s.name} style={{ textAlign: 'center' }}>
            <strong>{s.name}</strong>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  outerRadius="72%"
                  stroke="var(--surface)"
                  strokeWidth={2}
                  label={({ index }) => `${slices[index ?? 0]?.share ?? 0}%`}
                  labelLine={false}
                  isAnimationActive={false}
                >
                  {slices.map((_, i) => (
                    <Cell key={i} fill={seriesColor(i)} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => `${v}${task.units.includes('%') ? '%' : ''}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        );
      })}
      <div style={{ gridColumn: '1 / -1' }} className="row">
        {task.categories.map((c, i) => (
          <span key={c} className="row small" style={{ gap: '0.35rem' }}>
            <span
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: seriesColor(i),
                display: 'inline-block',
              }}
            />
            {c}
          </span>
        ))}
      </div>
    </div>
  );
}

function DataTable({ task }: { task: Task1 }) {
  return (
    <div className="table-wrap">
      <table className="gap-table">
        <thead>
          <tr>
            <th>{task.chart_type === 'TABLE' ? task.x_label : ''}</th>
            {task.categories.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {task.series.map((s) => (
            <tr key={s.name}>
              <th style={{ textAlign: 'left' }}>{s.name}</th>
              {s.values.map((v, i) => (
                <td key={i} style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {v.toLocaleString()}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {task.units && (
        <div className="small muted" style={{ marginTop: '0.35rem' }}>
          Units: {task.units}
        </div>
      )}
    </div>
  );
}

function ProcessFigure({ task }: { task: Task1 }) {
  return (
    <div>
      <div
        className="grid"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', alignItems: 'stretch' }}
      >
        {task.process_steps.map((step, i) => (
          <Fragment key={step.step}>
            <div className="flow-box" style={{ textAlign: 'left', lineHeight: 1.4 }}>
              <div className="row" style={{ gap: '0.4rem' }}>
                <span className="badge badge-primary">{step.step}</span>
                <strong>{step.label}</strong>
              </div>
              <div className="small muted" style={{ marginTop: '0.3rem' }}>
                {step.description}
              </div>
              {i < task.process_steps.length - 1 && (
                <div className="small muted" style={{ textAlign: 'right' }}>
                  →
                </div>
              )}
            </div>
          </Fragment>
        ))}
      </div>
      {task.process_is_cycle && (
        <p className="small muted" style={{ marginTop: '0.5rem' }}>
          ↺ The final stage leads back to stage 1 (the process is a cycle).
        </p>
      )}
    </div>
  );
}

function axisLabel(text: string, position: 'insideBottom' | 'insideLeft') {
  if (!text) return undefined;
  return position === 'insideLeft'
    ? {
        value: text,
        angle: -90,
        position,
        style: { fill: 'var(--text-muted)', fontSize: 12, textAnchor: 'middle' as const },
      }
    : { value: text, position, offset: -2, style: { fill: 'var(--text-muted)', fontSize: 12 } };
}
