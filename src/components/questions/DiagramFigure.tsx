import type { Schemas } from '../../api/client';
import { splitGaps } from './gaps';

type DiagramSpec = Schemas['DiagramSpec'];

/** Labelled schematic (nodes on a 0–100 canvas joined by edges); gap labels show the question number. */
export function DiagramFigure({ diagram, offset }: { diagram: DiagramSpec; offset: number }) {
  if (diagram.nodes.length === 0) return null;
  const byId = new Map(diagram.nodes.map((n) => [n.id, n]));
  const label = (text: string) =>
    splitGaps(text)
      .map((p) => (typeof p === 'string' ? p : `(${p.gap + offset}) ________`))
      .join('');
  return (
    <figure className="figure" style={{ margin: '0 0 0.8rem' }}>
      {diagram.title && (
        <figcaption style={{ fontWeight: 600, marginBottom: '0.4rem' }}>{diagram.title}</figcaption>
      )}
      <svg viewBox="-12 -8 124 116" role="img" aria-label={diagram.title || 'Diagram'}>
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="4"
            markerHeight="4"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--text-muted)" />
          </marker>
        </defs>
        {diagram.edges.map((e, i) => {
          const a = byId.get(e.from);
          const b = byId.get(e.to);
          if (!a || !b) return null;
          return (
            <g key={i}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="var(--text-muted)"
                strokeWidth="0.5"
                markerEnd="url(#arrow)"
              />
              {e.label && (
                <text
                  x={(a.x + b.x) / 2}
                  y={(a.y + b.y) / 2 - 1.5}
                  fontSize="2.6"
                  textAnchor="middle"
                  fill="var(--text-muted)"
                >
                  {e.label}
                </text>
              )}
            </g>
          );
        })}
        {diagram.nodes.map((n) => {
          const text = label(n.label);
          const gap = /\{\{\d+\}\}/.test(n.label);
          const width = Math.min(40, Math.max(14, text.length * 1.45));
          return (
            <g key={n.id}>
              <rect
                x={n.x - width / 2}
                y={n.y - 4}
                width={width}
                height="8"
                rx="1.5"
                fill={gap ? 'var(--primary-soft)' : 'var(--surface-2)'}
                stroke={gap ? 'var(--primary)' : 'var(--border)'}
                strokeWidth="0.4"
              />
              <text
                x={n.x}
                y={n.y + 0.3}
                fontSize="2.8"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--text)"
              >
                {text}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
