import { PageHeader } from '../components/ui';

export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="page">
      <PageHeader eyebrow="IELTS Prep" title={title} />
      <div className="card empty">This module is being built.</div>
    </div>
  );
}
