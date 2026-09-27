export function Navigator({
  total,
  answers,
  results,
  onJump,
}: {
  total: number;
  answers: Record<number, string>;
  results?: Record<number, { correct: boolean }>;
  onJump: (n: number) => void;
}) {
  return (
    <div className="navigator" aria-label="Question navigator">
      {Array.from({ length: total }, (_, i) => i + 1).map((n) => {
        const r = results?.[n];
        const cls = r ? (r.correct ? 'correct' : 'wrong') : answers[n] ? 'answered' : '';
        return (
          <button key={n} type="button" className={cls} onClick={() => onJump(n)} title={`Question ${n}`}>
            {n}
          </button>
        );
      })}
    </div>
  );
}
