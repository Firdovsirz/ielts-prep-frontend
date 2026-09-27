import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, unwrap } from '../../api/client';
import { ErrorBox, PageHeader } from '../../components/ui';
import { ModuleIcon } from '../../components/icons';
import { storage } from '../../lib/storage';
import { ReviewPanel } from './ReviewPanel';
import { DeckPanel } from './DeckPanel';
import { BanksPanel } from './BanksPanel';

type Tab = 'review' | 'deck' | 'banks';
const TAB_KEY = 'ielts.vocab.tab';

export function VocabularyPage() {
  const [tab, setTab] = useState<Tab>(() => (storage.get(TAB_KEY) as Tab | null) ?? 'review');
  const overview = useQuery({
    queryKey: ['vocab', 'overview'],
    queryFn: () => unwrap(api.GET('/api/vocab/overview')),
  });
  const o = overview.data;

  function choose(t: Tab) {
    setTab(t);
    storage.set(TAB_KEY, t);
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Lexical Resource"
        title="Vocabulary"
        subtitle="Words you flagged in Reading and Listening, upgrades from your graded Writing and Speaking, and topic banks — scheduled with spaced repetition so they stick."
        icon={<ModuleIcon module="VOCAB" size={28} />}
      />
      <ErrorBox error={overview.error} />
      <div className="vocab-stats m-vocab">
        <Stat value={o?.due ?? 0} label="Due now" accent />
        <Stat value={o?.fresh ?? 0} label="New" />
        <Stat value={o?.learned ?? 0} label="Learned" hint="21+ day interval" />
        <Stat value={o?.awl ?? 0} label="Academic Word List" />
        <Stat value={o?.reviewedToday ?? 0} label="Reviewed today" />
      </div>

      <div className="tabs" role="tablist">
        {(
          [
            ['review', `Review${o?.due ? ` · ${o.due}` : ''}`],
            ['deck', `My deck${o ? ` · ${o.total}` : ''}`],
            ['banks', 'Topic word banks'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            className={`tab${tab === key ? ' active' : ''}`}
            onClick={() => choose(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'review' && <ReviewPanel nextDue={o?.nextDue ?? null} onBrowseBanks={() => choose('banks')} />}
      {tab === 'deck' && <DeckPanel />}
      {tab === 'banks' && <BanksPanel />}
    </div>
  );
}

function Stat({
  value,
  label,
  hint,
  accent,
}: {
  value: number;
  label: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className={`vocab-stat${accent ? ' accent' : ''}`} title={hint}>
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}
