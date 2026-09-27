import { Link } from 'react-router-dom';

/** Leaves a full-screen exam. Answers are autosaved in this browser; the session can be resumed from History. */
export function ExamExit({ to }: { to: string }) {
  return (
    <Link
      to={to}
      className="exam-exit"
      title="Leave — your answers are saved and you can resume from History"
    >
      ✕ Exit
    </Link>
  );
}
