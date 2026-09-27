import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Schemas } from '../../api/client';
import { bandDomain, bandTimeline, seriesColor } from '../../lib/chartData';
import { criterionName } from '../../lib/criteria';
import { formatDate } from '../../lib/format';

const tick = { fill: 'var(--text-muted)', fontSize: 11 };
const tooltipStyle = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
  fontSize: 12,
};

/** One module's band history: every attempt as a dot (hollow = partial-test estimate) + 7-attempt rolling average. */
export function BandHistoryChart({
  points,
  target,
  color,
}: {
  points: Schemas['BandPoint'][];
  target: number;
  color: string;
}) {
  const data = bandTimeline(points.map((p) => ({ at: p.at, band: p.band }))).map((d, i) => ({
    ...d,
    estimate: points[i]?.estimate,
  }));
  const [lo, hi] = bandDomain([...data.map((d) => d.band), target]);
  return (
    <ResponsiveContainer width="100%" height={190}>
      <LineChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -18 }}>
        <CartesianGrid stroke="var(--grid)" vertical={false} />
        <XAxis dataKey="attempt" tick={tick} stroke="var(--axis)" tickLine={false} />
        <YAxis domain={[lo, hi]} ticks={range(lo, hi)} tick={tick} stroke="var(--axis)" tickLine={false} />
        <ReferenceLine
          y={target}
          stroke="var(--gold)"
          strokeDasharray="5 4"
          strokeWidth={2}
          label={{
            value: `Target ${target.toFixed(1)}`,
            fill: 'var(--text-muted)',
            fontSize: 11,
            position: 'insideTopRight',
          }}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={(_, p) =>
            p?.[0] ? `Attempt ${p[0].payload.attempt} · ${formatDate(p[0].payload.at)}` : ''
          }
          formatter={(v, name) => [Number(v).toFixed(2), name === 'avg' ? '7-attempt average' : 'Band']}
        />
        <Line
          dataKey="band"
          stroke="transparent"
          isAnimationActive={false}
          dot={(props: { cx?: number; cy?: number; payload?: { estimate?: boolean }; index?: number }) => (
            <circle
              key={props.index}
              cx={props.cx}
              cy={props.cy}
              r={4}
              stroke={color}
              strokeWidth={2}
              fill={props.payload?.estimate ? 'var(--surface)' : color}
            />
          )}
          activeDot={{ r: 6, fill: color }}
        />
        <Line dataKey="avg" stroke={color} strokeWidth={2.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Four criterion lines (whole bands 0–9) over graded attempts. */
export function CriteriaChart({ points }: { points: Schemas['CriteriaPoint'][] }) {
  const keys = Array.from(new Set(points.flatMap((p) => Object.keys(p.bands).map(normalise))));
  const data = points.map((p, i) => {
    const row: Record<string, number | string> = { attempt: i + 1, at: p.at };
    Object.entries(p.bands).forEach(([k, v]) => (row[normalise(k)] = v));
    return row;
  });
  const values = points.flatMap((p) => Object.values(p.bands));
  const [lo, hi] = bandDomain(values);
  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -18 }}>
        <CartesianGrid stroke="var(--grid)" vertical={false} />
        <XAxis dataKey="attempt" tick={tick} stroke="var(--axis)" tickLine={false} />
        <YAxis
          domain={[lo, hi]}
          ticks={range(lo, hi)}
          tick={tick}
          stroke="var(--axis)"
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={(a) => `Attempt ${a}`}
          formatter={(v, k) => [String(v), criterionName(String(k))]}
        />
        <Legend
          verticalAlign="top"
          height={30}
          formatter={(k: string) => (
            <span style={{ color: 'var(--text)', fontSize: 12 }}>{criterionName(k)}</span>
          )}
        />
        {keys.map((k, i) => (
          <Line
            key={k}
            dataKey={k}
            stroke={seriesColor(i)}
            strokeWidth={2}
            dot={{ r: 4, strokeWidth: 2, fill: 'var(--surface)' }}
            isAnimationActive={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Task Achievement (Task 1) and Task Response (Task 2) are plotted as one "Task" line. */
function normalise(k: string): string {
  return k === 'TASK_ACHIEVEMENT' ? 'TASK_RESPONSE' : k;
}

function range(lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let v = lo; v <= hi; v++) out.push(v);
  return out;
}
