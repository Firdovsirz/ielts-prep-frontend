import type { Schemas } from '../../api/client';

type MapSpec = Schemas['MapSpec'];

const FILL: Record<string, string> = {
  building: 'var(--surface-3)',
  road: '#b9c0ca',
  path: '#d8c9a8',
  water: '#9cc9e8',
  green: '#b7dcae',
  car_park: '#d9dde3',
  entrance: 'var(--accent-soft)',
  farmland: '#e9dfae',
  forest: '#8fbf86',
  other: 'var(--surface-2)',
};

/**
 * Plan/map on a 0–100 canvas: x to the right (east), y downwards (south), north at the top; each feature's x,y is
 * its top-left corner. Lettered markers sit on the unlabelled features.
 */
export function MapFigure({
  map,
  title,
}: {
  map: Pick<MapSpec, 'features'> & { title?: string; markers?: MapSpec['markers'] };
  title?: string;
}) {
  const heading = title ?? map.title;
  return (
    <figure className="figure" style={{ margin: '0 0 0.8rem' }}>
      {heading && <figcaption style={{ fontWeight: 600, marginBottom: '0.4rem' }}>{heading}</figcaption>}
      <svg viewBox="-2 -2 104 104" role="img" aria-label={heading || 'Map'}>
        <rect
          x="-2"
          y="-2"
          width="104"
          height="104"
          fill="var(--surface)"
          stroke="var(--border)"
          strokeWidth="0.4"
        />
        {map.features.map((f, i) => (
          <g key={i}>
            <rect
              x={f.x}
              y={f.y}
              width={Math.max(f.w, 0.5)}
              height={Math.max(f.h, 0.5)}
              rx={f.kind === 'water' || f.kind === 'green' ? 2 : 0.6}
              fill={FILL[f.kind] ?? FILL.other}
              stroke="var(--text-muted)"
              strokeWidth={f.kind === 'road' || f.kind === 'path' ? 0.15 : 0.3}
            />
            {f.label && (
              <text
                x={f.x + f.w / 2}
                y={f.y + f.h / 2}
                fontSize={Math.max(1.8, Math.min(3, (f.w / Math.max(f.label.length, 1)) * 1.6))}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--text)"
              >
                {f.label}
              </text>
            )}
          </g>
        ))}
        {(map.markers ?? []).map((m) => (
          <g key={m.key}>
            <circle cx={m.x} cy={m.y} r="2.6" fill="var(--primary)" />
            <text
              x={m.x}
              y={m.y + 0.1}
              fontSize="3"
              fontWeight="700"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--primary-contrast)"
            >
              {m.key}
            </text>
          </g>
        ))}
        <g transform="translate(95 7)">
          <path d="M0 -4 L2 1 L0 0 L-2 1 Z" fill="var(--text)" />
          <text y="4.5" fontSize="2.6" textAnchor="middle" fill="var(--text)">
            N
          </text>
        </g>
      </svg>
    </figure>
  );
}
