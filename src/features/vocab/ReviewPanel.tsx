import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap, type Schemas } from '../../api/client';
import { ErrorBox, Loading } from '../../components/ui';
import { GRADES, emphasise, pronounce, relativeDue } from '../../lib/vocab';
import { titleCase } from '../../lib/format';
import { useNow } from '../../lib/useCountdown';

type Card = Schemas['VocabCardView'];

export function ReviewPanel({
  nextDue,
  onBrowseBanks,
}: {
  nextDue: string | null;
  onBrowseBanks: () => void;
}) {
  const qc = useQueryClient();
  const due = useQuery({
    queryKey: ['vocab', 'due'],
    queryFn: () => unwrap(api.GET('/api/vocab/due', { params: { query: { limit: 60 } } })),
    refetchOnWindowFocus: false,
  });
  const [done, setDone] = useState<number[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [tally, setTally] = useState({ reviewed: 0, again: 0 });
  const now = useNow(30_000);

  const queue = (due.data ?? []).filter((c) => !done.includes(c.id));
  const card = queue[0];

  const review = useMutation({
    mutationFn: ({ id, grade }: { id: number; grade: number }) =>
      unwrap(api.POST('/api/vocab/cards/{id}/review', { params: { path: { id } }, body: { grade } })),
    onSuccess: (_, v) => {
      setDone((d) => [...d, v.id]);
      setRevealed(false);
      setTally((t) => ({ reviewed: t.reviewed + 1, again: t.again + (v.grade < 3 ? 1 : 0) }));
      qc.invalidateQueries({ queryKey: ['vocab', 'overview'] });
    },
  });

  function restart() {
    setDone([]);
    setTally({ reviewed: 0, again: 0 });
    due.refetch();
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!card || review.isPending) return;
      const target = e.target as HTMLElement;
      if (target.closest('input, textarea, select')) return;
      if (!revealed && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && ['1', '2', '3', '4'].includes(e.key)) {
        review.mutate({ id: card.id, grade: GRADES[Number(e.key) - 1]!.grade });
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [card, revealed, review]);

  if (due.isLoading) return <Loading />;
  const total = due.data?.length ?? 0;

  if (!card) {
    return (
      <div className="card review-done m-vocab">
        <ErrorBox error={due.error} />
        <div className="review-done-mark">✓</div>
        <h2>{tally.reviewed > 0 ? 'Session complete' : 'Nothing due right now'}</h2>
        {tally.reviewed > 0 && (
          <p className="muted">
            {tally.reviewed} cards reviewed · {tally.reviewed - tally.again} remembered · {tally.again} to
            relearn
          </p>
        )}
        <p className="muted">
          {nextDue
            ? `Next card is due ${relativeDue(nextDue, now)}.`
            : 'Your deck is empty — add a topic word bank to begin.'}
        </p>
        <div className="row" style={{ justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={restart}>
            Check for due cards
          </button>
          <button className="btn" onClick={onBrowseBanks}>
            Browse word banks
          </button>
        </div>
      </div>
    );
  }

  const position = total - queue.length + 1;
  return (
    <div className="review m-vocab">
      <ErrorBox error={review.error} />
      <div className="review-progress">
        <span className="small muted">
          Card {position} of {total}
        </span>
        <div className="progress" style={{ flex: 1 }}>
          <span style={{ width: `${((position - 1) / total) * 100}%` }} />
        </div>
        <span className="small muted">
          {tally.reviewed} done{tally.again ? ` · ${tally.again} again` : ''}
        </span>
      </div>

      <div
        className={`card flashcard${revealed ? ' revealed' : ''}`}
        onClick={() => !revealed && setRevealed(true)}
      >
        <CardFace card={card} revealed={revealed} />
      </div>

      {!revealed ? (
        <div className="review-actions">
          <button className="btn btn-lg" onClick={() => setRevealed(true)}>
            Show answer <kbd>Space</kbd>
          </button>
        </div>
      ) : (
        <div className="grade-row">
          {GRADES.map((g, i) => (
            <button
              key={g.key}
              className={`grade-btn grade-${g.tone}`}
              disabled={review.isPending}
              onClick={() => review.mutate({ id: card.id, grade: g.grade })}
            >
              <span className="grade-label">{g.label}</span>
              <span className="grade-next">{card.previews[g.key] ?? ''}</span>
              <kbd>{i + 1}</kbd>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CardFace({ card, revealed }: { card: Card; revealed: boolean }) {
  return (
    <div className="flashcard-inner">
      <div className="flashcard-tags">
        {card.partOfSpeech && <span className="badge">{card.partOfSpeech}</span>}
        {card.awlSublist != null && <span className="badge badge-primary">AWL {card.awlSublist}</span>}
        {card.cefr && <span className="badge badge-dark">{card.cefr}</span>}
        {card.topic && <span className="badge">{titleCase(card.topic)}</span>}
      </div>
      <div className="row" style={{ justifyContent: 'center', gap: '0.6rem' }}>
        <span className="word">{card.word}</span>
        <button
          className="speak-btn"
          title="Pronounce"
          aria-label={`Pronounce ${card.word}`}
          onClick={(e) => {
            e.stopPropagation();
            pronounce(card.word);
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 9v6h4l5 4V5L8 9H4z" />
            <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" />
          </svg>
        </button>
      </div>
      {card.contextSentence && (
        <p className="flashcard-context">
          “
          {emphasise(card.contextSentence, card.word).map((s, i) =>
            s.hit ? <mark key={i}>{s.text}</mark> : s.text,
          )}
          ”
        </p>
      )}
      {!revealed && <p className="small muted">Recall the meaning, then reveal.</p>}
      {revealed && (
        <div className="flashcard-back">
          {card.definition ? (
            <p className="flashcard-definition">{card.definition}</p>
          ) : (
            <p className="muted">
              {card.enrichmentStatus === 'PENDING'
                ? 'The definition is added automatically once the Claude API key is configured — or write your own in My deck.'
                : 'No definition yet — add one in My deck.'}
            </p>
          )}
          {card.examples.length > 0 && (
            <ul className="flashcard-examples">
              {card.examples.map((ex, i) => (
                <li key={i}>
                  {emphasise(ex, card.word).map((s, j) =>
                    s.hit ? <strong key={j}>{s.text}</strong> : s.text,
                  )}
                </li>
              ))}
            </ul>
          )}
          {card.collocations.length > 0 && (
            <div className="collocations">
              {card.collocations.map((c) => (
                <span key={c} className="chip">
                  {c}
                </span>
              ))}
            </div>
          )}
          <div className="small muted">From {titleCase(card.source)}</div>
        </div>
      )}
    </div>
  );
}
