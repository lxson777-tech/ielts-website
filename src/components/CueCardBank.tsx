/* The Cue Card Bank: browse CUE_CARDS by topic family, read a card as a
   tabbed reference (Plan / Model answer / Band 8 upgrade / Part 3), and run
   a "Prepare and speak" timer that mirrors the real exam (60s prep, then
   2 minutes to speak). No recording here, that is what the Speaking
   Trainer is for, this is a reference + timing rehearsal.

   The cue card box replicates the look of the real exam card (the same
   shape as `.lesson-body .cue-card` in lesson.css: topic, "You should
   say:", bulleted points, a closing note) using this page's own design
   tokens, rather than importing lesson.css, since that sheet is scoped to
   LessonLayout and this page uses BaseLayout. */

import { useEffect, useRef, useState } from 'react';
import { CUE_CARDS, CUE_CARD_FAMILIES, type CueCard, type CueCardFamily } from '../data/cue-cards';
import { withBase } from '../lib/url';
import { useT } from '../lib/i18n/react';
import { LIBRARY_REASON_SENTENCES, parseLibraryReason } from './library-links';
import { recordLessonStudied } from '../lib/learning/store.browser';
import SessionContinueBar from './learning/SessionContinueBar';
import Tabs, { type TabDef } from './Tabs';

type PrepPhase = 'idle' | 'prep' | 'speaking' | 'done';

/** Shuffle glyph for the "Random card" buttons, inline SVG (currentColor)
    rather than the 🔀 emoji so it inherits the button's ink color and stays
    inside the restrained, no-emoji icon system used across the workspace. */
function ShuffleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="16 3 21 3 21 8" />
      <line x1="4" y1="20" x2="21" y2="3" />
      <polyline points="21 16 21 21 16 21" />
      <line x1="15" y1="15" x2="21" y2="21" />
      <line x1="4" y1="4" x2="9" y2="9" />
    </svg>
  );
}

export default function CueCardBank() {
  const { t, tn } = useT();
  const DETAIL_TABS: TabDef[] = [
    { id: 'plan', label: t('Plan') },
    { id: 'model', label: t('Model answer') },
    { id: 'upgrade', label: t('Band 8 upgrade') },
    { id: 'part3', label: 'Part 3' },
  ];
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(12);
  const [familyFilter, setFamilyFilter] = useState<CueCardFamily | 'all'>('all');
  /* ?card=<id> opens straight on that card, the same deep-link convention
     ModelAnswers.tsx uses for ?task=. deepLinked marks a visit the URL
     actually named, so the evidence recording below never fires for
     ordinary browsing of the grid. */
  const deepLinked = useRef(false);
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const asked = new URLSearchParams(window.location.search).get('card');
    if (asked && CUE_CARDS.some((c) => c.id === asked)) {
      deepLinked.current = true;
      return asked;
    }
    return null;
  });
  const [reason] = useState(() => (typeof window !== 'undefined' ? parseLibraryReason(window.location.search) : null));
  const [activeTab, setActiveTab] = useState('plan');
  const [prepPhase, setPrepPhase] = useState<PrepPhase>('idle');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [showDuringSpeaking, setShowDuringSpeaking] = useState(true);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelRef = useRef(false);
  const evidenceRecorded = useRef(false);

  /* Voluntary use of a reference page is "studied" context, never a
     demonstration (lead decision, brief section 7), recorded once and only
     for a visit the URL actually pointed at. */
  useEffect(() => {
    if (!deepLinked.current || evidenceRecorded.current) return;
    evidenceRecorded.current = true;
    recordLessonStudied({
      lessonKey: 'cue-card-bank',
      activityId: 'tool:cue-cards',
      subskill: 'part2-narrative-structure',
      paper: 'speaking',
      mode: 'practice',
      estimatedMinutes: 2,
    });
  }, []);

  useEffect(() => {
    return () => {
      cancelRef.current = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const filtered = CUE_CARDS.filter(c => (familyFilter === 'all' || c.family === familyFilter) && c.title.toLowerCase().includes(search.trim().toLowerCase()));
  const selected = CUE_CARDS.find((c) => c.id === selectedId) ?? null;

  function familyLabel(id: CueCardFamily): string {
    return CUE_CARD_FAMILIES.find((f) => f.id === id)?.label ?? id;
  }

  function openCard(id: string) {
    cancelRef.current = true;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSelectedId(id);
    setActiveTab('plan');
    setPrepPhase('idle');
  }

  function backToGrid() {
    cancelRef.current = true;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSelectedId(null);
    setPrepPhase('idle');
  }

  function pickRandom() {
    const pool = filtered.length > 0 ? filtered : CUE_CARDS;
    const card = pool[Math.floor(Math.random() * pool.length)]!;
    openCard(card.id);
  }

  function runCountdown(totalSeconds: number): Promise<void> {
    return new Promise((resolve) => {
      setSecondsLeft(totalSeconds);
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            intervalRef.current = null;
            resolve();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    });
  }

  async function startPrepareAndSpeak() {
    cancelRef.current = false;
    setPrepPhase('prep');
    await runCountdown(60);
    if (cancelRef.current) return;
    setPrepPhase('speaking');
    await runCountdown(120);
    if (cancelRef.current) return;
    setPrepPhase('done');
  }

  function cancelPrepare() {
    cancelRef.current = true;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setPrepPhase('idle');
  }

  /* ── Detail view ── */
  if (selected) {
    return (
      <div className="screen-in space-y-5">
      <label className="discovery-search">{t('Search cue cards')}<input type="search" value={search} onChange={e => {setSearch(e.target.value);setVisibleCount(12);}} /></label>
      <p className="discovery-count" aria-live="polite">{Math.min(visibleCount,filtered.length)} / {filtered.length} {t('results shown')}</p>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={backToGrid}
            className="text-sm font-semibold text-ink-muted hover:text-ink"
          >
            {t('All cue cards')}
          </button>
          <span className="rounded-full bg-brand-tint px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand">
            {familyLabel(selected.family)}
          </span>
        </div>

        {deepLinked.current && reason && (reason === 'same-family' || reason === 'from-session') && (
          <p className="rounded-card border border-brand/25 bg-brand-tint/40 px-4 py-3 text-sm text-ink">
            {t(LIBRARY_REASON_SENTENCES[reason])}
          </p>
        )}

        {prepPhase === 'idle' && (
          <>
            <CueCardBox card={selected} />

            <div className="rounded-card border border-border bg-surface p-4 shadow-card">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">{t('Rounding-off questions')}</p>
              <p className="mt-1 text-xs text-ink-muted">
                {t('Short questions the examiner may ask right after your two minutes, before moving on to Part 3.')}
              </p>
              <div className="mt-3 space-y-2">
                {selected.roundingOff.map((r) => (
                  <div key={r.q} className="text-sm">
                    <span className="font-semibold">{r.q}</span>
                    <span className="text-ink-muted"> {r.a}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={startPrepareAndSpeak}
                className="rounded-button bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
              >
                ▷ {t('Prepare and speak')}
              </button>
              <button
                type="button"
                onClick={pickRandom}
                className="inline-flex items-center gap-1.5 rounded-button border border-border px-5 py-2.5 text-sm font-semibold hover:bg-surface-alt"
              >
                <ShuffleIcon /> {t('Random card')}
              </button>
              <label className="ml-auto flex items-center gap-2 text-xs text-ink-muted">
                <input
                  type="checkbox"
                  checked={showDuringSpeaking}
                  onChange={(e) => setShowDuringSpeaking(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-brand focus:ring-brand"
                />
                {t('Keep the card visible while I speak')}
              </label>
            </div>

            <div>
              <Tabs tabs={DETAIL_TABS} active={activeTab} onChange={setActiveTab} />
              <div className="mt-4 rounded-card border border-border bg-surface p-5 shadow-card">
                {activeTab === 'plan' && (
                  <div id="tabpanel-plan" role="tabpanel" aria-labelledby="tab-plan">
                    <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                      {t('One-minute prep notes')}
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {t('Short jotted notes, the way you would actually write them in the real one-minute prep.')}
                    </p>
                    <ul className="mt-3 space-y-1.5 text-sm">
                      {selected.notes.map((n, i) => (
                        <li key={i} className="flex gap-2">
                          <span aria-hidden="true" className="text-ink-muted">·</span>
                          <span>{n}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {activeTab === 'model' && (
                  <div id="tabpanel-model" role="tabpanel" aria-labelledby="tab-model">
                    <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                      {t('Band 7.0 model answer')}
                    </p>
                    <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink">
                      {selected.model.map((p, i) => (
                        <p key={i}>{p}</p>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'upgrade' && (
                  <div id="tabpanel-upgrade" role="tabpanel" aria-labelledby="tab-upgrade">
                    <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">{t('Band 8 upgrade')}</p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {t('Phrases and structures worth borrowing from the model answer above.')}
                    </p>
                    <ul className="mt-3 space-y-3">
                      {selected.upgrades.map((u) => (
                        <li key={u.phrase} className="rounded-lg border border-border bg-surface-alt p-3">
                          <p className="text-sm font-bold text-brand">{u.phrase}</p>
                          <p className="mt-1 text-sm text-ink-muted">{u.note}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {activeTab === 'part3' && (
                  <div id="tabpanel-part3" role="tabpanel" aria-labelledby="tab-part3">
                    <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                      {t('Part 3 follow-up questions')}
                    </p>
                    <div className="mt-3 space-y-4">
                      {selected.part3.map((p, i) => (
                        <div key={i}>
                          <p className="text-sm font-semibold">{p.q}</p>
                          <p className="mt-1 text-sm text-ink-muted">{p.a}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <SessionContinueBar activityId="tool:cue-cards" compact />
          </>
        )}

        {(prepPhase === 'prep' || prepPhase === 'speaking') && (
          <div className="screen-in space-y-4">
            <div className="rounded-card border border-border bg-surface p-8 text-center shadow-card">
              <p className="text-xs font-bold uppercase tracking-wider text-brand">
                {prepPhase === 'prep' ? t('Preparation time') : t('Speaking time')}
              </p>
              <p className="mt-2 font-display text-6xl font-extrabold tabular-nums text-brand" aria-live="polite">
                {formatClock(secondsLeft)}
              </p>
              <p className="mt-2 text-sm text-ink-muted">
                {prepPhase === 'prep'
                  ? t('Read the card and jot short notes, the way you would with a real pencil and paper.')
                  : showDuringSpeaking
                    ? t('Speak until the timer ends. Cover every bullet, then explain why.')
                    : t('Speak from memory. Nothing is being recorded here, the Speaking Trainer does that.')}
              </p>
              <button
                type="button"
                onClick={cancelPrepare}
                className="mt-5 rounded-button border border-border px-5 py-2 text-sm font-semibold hover:bg-surface-alt"
              >
                {t('Stop')}
              </button>
            </div>
            {(prepPhase === 'prep' || (prepPhase === 'speaking' && showDuringSpeaking)) && (
              <CueCardBox card={selected} compact />
            )}
          </div>
        )}

        {prepPhase === 'done' && (
          <div className="screen-in space-y-4">
            <div className="rounded-card border border-border bg-surface p-8 text-center shadow-card">
              <p className="font-display text-2xl font-extrabold">{t("Time's up")}</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
                {t(
                  "That's the full two minutes. Compare what you said against the model answer, or take it to the Speaking Trainer for a real AI-graded attempt with your microphone.",
                )}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setPrepPhase('idle')}
                  className="rounded-button border border-border px-5 py-2.5 text-sm font-semibold hover:bg-surface-alt"
                >
                  ↻ {t('Back to this card')}
                </button>
                <a
                  href={withBase('/trainers/speaking')}
                  className="rounded-button bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
                >
                  {t('Practise this in the Speaking Trainer')}
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── Grid view ── */
  return (
    <div className="screen-in space-y-5">
      <label className="discovery-search">{t('Search cue cards')}<input type="search" value={search} onChange={e => {setSearch(e.target.value);setVisibleCount(12);}} /></label>
      <p className="discovery-count" aria-live="polite">{Math.min(visibleCount,filtered.length)} / {filtered.length} {t('results shown')}</p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="cue-chip-row flex flex-wrap gap-2">
          <FilterChip active={familyFilter === 'all'} onClick={() => {setFamilyFilter('all');setVisibleCount(12);}}>
            {t('All ({count})', { count: CUE_CARDS.length })}
          </FilterChip>
          {CUE_CARD_FAMILIES.map((f) => {
            const count = CUE_CARDS.filter((c) => c.family === f.id).length;
            return (
              <FilterChip key={f.id} active={familyFilter === f.id} onClick={() => {setFamilyFilter(f.id);setVisibleCount(12);}}>
                {t(f.label)} ({count})
              </FilterChip>
            );
          })}
        </div>
        <button
          type="button"
          onClick={pickRandom}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-button border border-border px-4 py-2 text-sm font-semibold hover:bg-surface-alt"
        >
          <ShuffleIcon /> {t('Random card')}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.slice(0,visibleCount).map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => openCard(c.id)}
            className="group flex flex-col items-start gap-2 rounded-card border border-border bg-surface p-4 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <span className="rounded-full bg-surface-alt px-2.5 py-0.5 text-[0.68rem] font-bold uppercase tracking-wider text-ink-muted">
              {t(familyLabel(c.family))}
            </span>
            <p className="font-display text-base font-bold leading-snug group-hover:text-brand">{c.title}</p>
            <p className="mt-auto text-xs text-ink-muted">
              {tn(c.card.points.length + 1, { one: '{n} point to cover', other: '{n} points to cover' })}
            </p>
          </button>
        ))}
      </div>

      {filtered.length > visibleCount && <button type="button" className="discovery-more" onClick={() => setVisibleCount(n => n + 12)}>{t('Show more')}</button>}
      {filtered.length === 0 && (
        <p className="rounded-card border border-dashed border-border p-8 text-center text-sm text-ink-muted">
          {t('No matches. Try another search.')}
        </p>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? 'border-brand bg-brand text-white'
          : 'border-border bg-surface text-ink-muted hover:border-brand/50 hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

/** Renders a cue card in the same shape as the real exam card (topic /
    "You should say:" / bulleted points / a closing note), styled from this
    page's own design tokens so it needs no cross-file CSS dependency. */
function CueCardBox({ card, compact }: { card: CueCard; compact?: boolean }) {
  const { t } = useT();
  return (
    <div className={`rounded-card border-2 border-brand bg-surface shadow-card ${compact ? 'p-5' : 'p-6'}`}>
      <p className="font-display text-lg font-bold leading-snug">{card.card.topic}</p>
      <p className="mt-3 text-sm italic text-ink-muted">{t('You should say:')}</p>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm">
        {card.card.points.map((pt, i) => (
          <li key={i}>{pt}</li>
        ))}
        <li>{card.card.explain}</li>
      </ul>
      <p className="mt-4 border-t border-border pt-3 text-xs text-ink-muted">
        {t('You will have one minute to prepare before speaking.')}
      </p>
    </div>
  );
}

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
