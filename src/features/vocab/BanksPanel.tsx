import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '../../api/client';
import { ErrorBox, Loading } from '../../components/ui';
import { pronounce } from '../../lib/vocab';
import { titleCase } from '../../lib/format';

const TOPICS = [
  'education',
  'environment',
  'technology',
  'health',
  'work',
  'society',
  'government',
  'crime',
  'culture',
  'family',
  'media',
  'globalisation',
  'transport',
];

export function BanksPanel() {
  const qc = useQueryClient();
  const banks = useQuery({
    queryKey: ['vocab', 'banks'],
    queryFn: () => unwrap(api.GET('/api/vocab/banks')),
  });
  const [open, setOpen] = useState<number | null>(null);
  const [topic, setTopic] = useState(TOPICS[0]!);
  const [queued, setQueued] = useState<string | null>(null);
  const selected = open ?? banks.data?.[0]?.itemId ?? null;

  const generate = useMutation({
    mutationFn: () => unwrap(api.POST('/api/vocab/banks/generate/{topic}', { params: { path: { topic } } })),
    onSuccess: (r) => {
      setQueued(r.message);
      window.setTimeout(() => qc.invalidateQueries({ queryKey: ['vocab', 'banks'] }), 60_000);
    },
  });

  if (banks.isLoading) return <Loading />;
  return (
    <div className="stack">
      <ErrorBox error={banks.error ?? generate.error} />
      <div className="bank-grid">
        {banks.data?.map((b) => {
          const pct = b.words ? (b.inDeck / b.words) * 100 : 0;
          return (
            <button
              key={b.itemId}
              className={`bank-card${selected === b.itemId ? ' active' : ''}`}
              onClick={() => setOpen(b.itemId)}
            >
              <span className="row-between">
                <strong>{titleCase(b.topic)}</strong>
                {b.origin === 'GENERATED' && <span className="badge badge-accent">new</span>}
              </span>
              <span className="small muted">
                {b.words} words · {b.inDeck} in deck
              </span>
              <span className="progress">
                <span style={{ width: `${pct}%` }} />
              </span>
            </button>
          );
        })}
      </div>

      {selected != null && <BankDetail itemId={selected} />}

      <div className="card callout m-vocab">
        <div>
          <div className="eyebrow">More words</div>
          <h3 style={{ margin: 0 }}>Generate a fresh topic bank</h3>
          <p className="muted small" style={{ margin: '0.3rem 0 0' }}>
            Claude writes 15–20 band-7+ words for the topic (avoiding ones you already have), and an
            independent review checks every definition and collocation before it appears here.
          </p>
          {queued && (
            <div className="alert alert-good" style={{ marginTop: '0.6rem' }}>
              {queued}
            </div>
          )}
        </div>
        <div className="row">
          <select
            className="select"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            aria-label="Topic"
          >
            {TOPICS.map((t) => (
              <option key={t} value={t}>
                {titleCase(t)}
              </option>
            ))}
          </select>
          <button className="btn" onClick={() => generate.mutate()} disabled={generate.isPending}>
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}

function BankDetail({ itemId }: { itemId: number }) {
  const qc = useQueryClient();
  const bank = useQuery({
    queryKey: ['vocab', 'bank', itemId],
    queryFn: () => unwrap(api.GET('/api/vocab/banks/{itemId}', { params: { path: { itemId } } })),
  });
  const add = useMutation({
    mutationFn: () => unwrap(api.POST('/api/vocab/banks/{itemId}/add', { params: { path: { itemId } } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vocab'] }),
  });

  if (bank.isLoading) return <Loading />;
  const b = bank.data;
  if (!b) return <ErrorBox error={bank.error} />;
  const inDeck = new Set(b.inDeck);
  const missing = b.words.length - b.inDeck.length;

  return (
    <div className="card">
      <div className="card-title">
        <div>
          <div className="eyebrow">Word bank</div>
          <h2 style={{ margin: 0 }}>{titleCase(b.topic)}</h2>
        </div>
        <button className="btn" onClick={() => add.mutate()} disabled={missing === 0 || add.isPending}>
          {missing === 0 ? 'All in your deck ✓' : `Add ${missing} words to deck`}
        </button>
      </div>
      <ErrorBox error={add.error} />
      <div className="bank-words">
        {b.words.map((w) => (
          <div key={w.word} className={`bank-word${inDeck.has(w.word.toLowerCase()) ? ' in-deck' : ''}`}>
            <div className="row" style={{ gap: '0.4rem' }}>
              <button className="link-btn deck-word" onClick={() => pronounce(w.word)} title="Pronounce">
                {w.word}
              </button>
              <span className="small muted">{w.part_of_speech}</span>
              <span className="badge">{w.cefr}</span>
              {inDeck.has(w.word.toLowerCase()) && <span className="badge badge-good">in deck</span>}
            </div>
            <div className="small">{w.definition}</div>
            <div className="small muted bank-example">“{w.example}”</div>
            <div className="collocations">
              {w.collocations.map((c) => (
                <span key={c} className="chip chip-sm">
                  {c}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
