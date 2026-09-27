import { useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap, type Schemas } from '../../api/client';
import { Empty, ErrorBox, Loading } from '../../components/ui';
import { pronounce, relativeDue, strength } from '../../lib/vocab';
import { titleCase } from '../../lib/format';
import { useNow } from '../../lib/useCountdown';

type Card = Schemas['VocabCardView'];
type Filter = 'all' | 'due' | 'new' | 'awl' | 'learned';

const FILTERS: [Filter, string][] = [
  ['all', 'All'],
  ['due', 'Due'],
  ['new', 'New'],
  ['awl', 'AWL'],
  ['learned', 'Learned'],
];

export function DeckPanel() {
  const qc = useQueryClient();
  const now = useNow(60_000);
  const cards = useQuery({
    queryKey: ['vocab', 'cards'],
    queryFn: () => unwrap(api.GET('/api/vocab/cards')),
  });
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [word, setWord] = useState('');
  const [sentence, setSentence] = useState('');
  const [editing, setEditing] = useState<number | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ['vocab'] });
  const add = useMutation({
    mutationFn: () =>
      unwrap(api.POST('/api/vocab/cards', { body: { word, sentence: sentence || undefined } })),
    onSuccess: () => {
      setWord('');
      setSentence('');
      refresh();
    },
  });
  const remove = useMutation({
    mutationFn: (id: number) => unwrap(api.DELETE('/api/vocab/cards/{id}', { params: { path: { id } } })),
    onSuccess: refresh,
  });

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (cards.data ?? []).filter((c) => {
      if (q && !c.word.includes(q) && !(c.definition ?? '').toLowerCase().includes(q)) return false;
      switch (filter) {
        case 'due':
          return new Date(c.dueAt).getTime() <= now;
        case 'new':
          return c.repetitions === 0;
        case 'awl':
          return c.awlSublist != null;
        case 'learned':
          return c.intervalDays >= 21;
        default:
          return true;
      }
    });
  }, [cards.data, filter, search, now]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (word.trim()) add.mutate();
  }

  if (cards.isLoading) return <Loading />;
  return (
    <div className="stack">
      <form className="card add-word" onSubmit={submit}>
        <input
          className="input"
          placeholder="Add a word or phrase…"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          aria-label="Word"
        />
        <input
          className="input"
          placeholder="Sentence where you met it (optional)"
          value={sentence}
          onChange={(e) => setSentence(e.target.value)}
          aria-label="Context sentence"
        />
        <button className="btn" disabled={!word.trim() || add.isPending}>
          Add to deck
        </button>
      </form>
      <ErrorBox error={cards.error ?? add.error ?? remove.error} />

      <div className="row-between" style={{ flexWrap: 'wrap', gap: '0.6rem' }}>
        <div className="row" style={{ gap: '0.35rem', flexWrap: 'wrap' }}>
          {FILTERS.map(([key, label]) => (
            <button
              key={key}
              className={`chip${filter === key ? ' chip-active' : ''}`}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          className="input"
          style={{ maxWidth: 260 }}
          placeholder="Search words or definitions"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search deck"
        />
      </div>

      {visible.length === 0 ? (
        <Empty>{cards.data?.length ? 'No cards match this filter.' : 'Your deck is empty.'}</Empty>
      ) : (
        <div className="card table-wrap" style={{ padding: 0 }}>
          <table className="table deck-table">
            <thead>
              <tr>
                <th>Word</th>
                <th>Meaning</th>
                <th>Source</th>
                <th>Strength</th>
                <th>Next review</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {visible.map((c) =>
                editing === c.id ? (
                  <EditRow key={c.id} card={c} onDone={() => setEditing(null)} />
                ) : (
                  <tr key={c.id}>
                    <td>
                      <button
                        className="link-btn deck-word"
                        onClick={() => pronounce(c.word)}
                        title="Pronounce"
                      >
                        {c.word}
                      </button>
                      <div className="row" style={{ gap: '0.25rem', marginTop: '0.15rem' }}>
                        {c.partOfSpeech && <span className="small muted">{c.partOfSpeech}</span>}
                        {c.awlSublist != null && (
                          <span className="badge badge-primary">AWL {c.awlSublist}</span>
                        )}
                        {c.cefr && <span className="badge">{c.cefr}</span>}
                      </div>
                    </td>
                    <td className="deck-meaning">
                      {c.definition ?? (
                        <span className="muted">
                          {c.enrichmentStatus === 'PENDING' ? 'Definition pending…' : 'No definition'}
                        </span>
                      )}
                    </td>
                    <td className="small">{titleCase(c.source)}</td>
                    <td>
                      <StrengthMeter level={strength(c.intervalDays, c.repetitions)} />
                    </td>
                    <td className="small">{relativeDue(c.dueAt, now)}</td>
                    <td>
                      <div
                        className="row"
                        style={{ gap: '0.2rem', justifyContent: 'flex-end', flexWrap: 'nowrap' }}
                      >
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(c.id)}>
                          Edit
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          aria-label={`Remove ${c.word}`}
                          onClick={() => remove.mutate(c.id)}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StrengthMeter({ level }: { level: number }) {
  const labels = ['New', 'Learning', 'Young', 'Growing', 'Mature'];
  return (
    <span className="strength" title={labels[level]}>
      {[1, 2, 3, 4].map((i) => (
        <span key={i} className={i <= level ? 'on' : ''} />
      ))}
      <span className="small muted">{labels[level]}</span>
    </span>
  );
}

function EditRow({ card, onDone }: { card: Card; onDone: () => void }) {
  const qc = useQueryClient();
  const [definition, setDefinition] = useState(card.definition ?? '');
  const [pos, setPos] = useState(card.partOfSpeech ?? '');
  const [examples, setExamples] = useState(card.examples.join('\n'));
  const save = useMutation({
    mutationFn: () =>
      unwrap(
        api.PUT('/api/vocab/cards/{id}', {
          params: { path: { id: card.id } },
          body: {
            definition,
            partOfSpeech: pos,
            examples: examples
              .split('\n')
              .map((s) => s.trim())
              .filter(Boolean),
          },
        }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vocab'] });
      onDone();
    },
  });
  return (
    <tr className="edit-row">
      <td>
        <strong>{card.word}</strong>
        <input
          className="input"
          value={pos}
          onChange={(e) => setPos(e.target.value)}
          placeholder="part of speech"
        />
      </td>
      <td colSpan={4}>
        <textarea
          className="textarea"
          rows={2}
          value={definition}
          onChange={(e) => setDefinition(e.target.value)}
          placeholder="Definition"
        />
        <textarea
          className="textarea"
          rows={2}
          value={examples}
          onChange={(e) => setExamples(e.target.value)}
          placeholder="Example sentences, one per line"
        />
        <ErrorBox error={save.error} />
      </td>
      <td>
        <div className="stack" style={{ gap: '0.3rem' }}>
          <button className="btn btn-sm" onClick={() => save.mutate()} disabled={save.isPending}>
            Save
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onDone}>
            Cancel
          </button>
        </div>
      </td>
    </tr>
  );
}
