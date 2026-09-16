/* The essay model-answer bank at /writing/models. Left: every Task 2 and
   Task 1 prompt from writing-prompts.ts, grouped by type. Right: the chosen
   prompt, a band tab strip (or, in compare mode, two independent band
   pickers side by side), the model essay with hoverable/tappable highlighted
   phrases, a quiet four-block criteria grid, the word count, and a link to
   the Writing Trainer (WritingTester has no prompt-id query param — see its
   header comment — so this links there plainly rather than pretending to
   deep-link a specific prompt).

   All content comes from MODEL_ANSWERS (src/data/model-answers.ts); the
   prompt text itself stays in writing-prompts.ts and is only referenced by
   id, per that file's own comment about being the source of truth. */

import { useEffect, useMemo, useState } from 'react';
import { WRITING_PROMPTS, getWritingPrompt } from '../data/writing-prompts';
import { getModelAnswers, getModelBands, type ModelAnswer, type ModelBand } from '../data/model-answers';
import type { EssayPrompt } from '../lib/writing/schema';
import { countWords } from '../lib/writing/mechanics';
import { withBase } from '../lib/url';
import Tabs, { type TabDef } from './Tabs';
import Html from './Html';

const TASK2_GROUPS: { key: string; label: string }[] = [
  { key: 'opinion', label: 'Opinion' },
  { key: 'discussion', label: 'Discussion' },
  { key: 'problem-solution', label: 'Problem / Solution' },
  { key: 'advantages-disadvantages', label: 'Advantages & Disadvantages' },
  { key: 'two-part', label: 'Two-part question' },
];

/* The imported exam tasks use one 'chart' variant for line graphs, bar charts
   and pie charts rather than naming each. Without this group, twelve of the
   thirty real Task 1 tasks were filtered off the page entirely. The three
   older, finer-grained keys stay so nothing breaks if they ever come back. */
const TASK1_GROUPS: { key: string; label: string }[] = [
  { key: 'chart', label: 'Charts and graphs' },
  { key: 'line-graph', label: 'Line graphs' },
  { key: 'bar-chart', label: 'Bar charts' },
  { key: 'pie-chart', label: 'Pie charts' },
  { key: 'table', label: 'Tables' },
  { key: 'process', label: 'Process diagrams' },
  { key: 'map', label: 'Maps' },
  { key: 'combination', label: 'Combination' },
];

function groupPrompts(
  task: 'task1' | 'task2',
  groups: { key: string; label: string }[],
  prompts: EssayPrompt[],
) {
  return groups
    .map((g) => ({ ...g, prompts: prompts.filter((p) => p.task === task && p.variant === g.key) }))
    .filter((g) => g.prompts.length > 0);
}

function fmtBand(b: ModelBand): string {
  return b.toFixed(1);
}

/* Splits a paragraph into plain-text and highlight segments. Highlights are
   matched as exact substrings (guaranteed by data — see the checker script
   run in verification); overlapping matches are dropped rather than risking
   a crash on malformed data. */
interface Segment {
  text: string;
  highlight?: { note: string; key: string };
}

function segmentParagraph(text: string, highlights: ModelAnswer['highlights'], keyPrefix: string): Segment[] {
  type Match = { start: number; end: number; note: string; key: string };
  const matches: Match[] = [];
  highlights.forEach((h, i) => {
    const start = text.indexOf(h.phrase);
    if (start === -1) return;
    matches.push({ start, end: start + h.phrase.length, note: h.note, key: `${keyPrefix}-${i}` });
  });
  matches.sort((a, b) => a.start - b.start);

  const kept: Match[] = [];
  let lastEnd = 0;
  for (const m of matches) {
    if (m.start < lastEnd) continue;
    kept.push(m);
    lastEnd = m.end;
  }

  const segments: Segment[] = [];
  let cursor = 0;
  for (const m of kept) {
    if (m.start > cursor) segments.push({ text: text.slice(cursor, m.start) });
    segments.push({ text: text.slice(m.start, m.end), highlight: { note: m.note, key: m.key } });
    cursor = m.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments;
}

function HighlightMark({
  text,
  note,
  active,
  onToggle,
}: {
  text: string;
  note: string;
  active: boolean;
  onToggle: (on: boolean) => void;
}) {
  return (
    <span className="ma-hl-wrap">
      <button
        type="button"
        className={`ma-hl${active ? ' is-active' : ''}`}
        onMouseEnter={() => onToggle(true)}
        onMouseLeave={() => onToggle(false)}
        onFocus={() => onToggle(true)}
        onBlur={() => onToggle(false)}
        onClick={(e) => {
          // Tap-to-reveal on touch devices: a click is always preceded by its
          // own focus/mouseenter (which already opened this note), so toggling
          // off "current" state here would just re-close what the same tap
          // opened — always (re)open on click instead, and stop the event
          // reaching a page-level "click elsewhere closes it" listener.
          e.stopPropagation();
          onToggle(true);
        }}
      >
        {text}
      </button>
      {active && (
        <span className="ma-hl-note" role="note">
          {note}
        </span>
      )}
    </span>
  );
}

function EssayBody({
  model,
  activeHighlight,
  setActiveHighlight,
}: {
  model: ModelAnswer;
  activeHighlight: string | null;
  setActiveHighlight: (key: string | null) => void;
}) {
  return (
    <div className="ma-essay">
      {model.text.map((para, pi) => {
        const segments = segmentParagraph(para, model.highlights, `${model.promptId}-${model.band}-${pi}`);
        return (
          <p key={pi} style={{ whiteSpace: 'pre-line' }}>
            {segments.map((s, si) =>
              s.highlight ? (
                <HighlightMark
                  key={s.highlight.key}
                  text={s.text}
                  note={s.highlight.note}
                  active={activeHighlight === s.highlight.key}
                  onToggle={(on) => setActiveHighlight(on ? s.highlight!.key : null)}
                />
              ) : (
                <span key={si}>{s.text}</span>
              ),
            )}
          </p>
        );
      })}
    </div>
  );
}

function CriteriaGrid({ model }: { model: ModelAnswer }) {
  const firstLabel = model.task === 'task1' ? 'Task Achievement' : 'Task Response';
  const firstText = model.criteria.taskAchievement ?? model.criteria.taskResponse ?? '';
  const entries = [
    { label: firstLabel, text: firstText },
    { label: 'Coherence & Cohesion', text: model.criteria.coherence },
    { label: 'Lexical Resource', text: model.criteria.lexical },
    { label: 'Grammatical Range & Accuracy', text: model.criteria.grammar },
  ];
  return (
    <div className="ma-criteria-grid">
      {entries.map((e) => (
        <div key={e.label} className="ma-criteria-block">
          <p className="ma-criteria-label">{e.label}</p>
          <p className="ma-criteria-text">{e.text}</p>
        </div>
      ))}
    </div>
  );
}

function EssayPanel({
  model,
  compact,
  asTabPanel,
  activeHighlight,
  setActiveHighlight,
}: {
  model: ModelAnswer;
  compact?: boolean;
  /** Single-band view only: the band buttons above are a real tab list, so
      the essay below them is the tab panel they control. Naming it as one
      completes the aria wiring Tabs already points at, and picks up the
      shared 200ms panel cross-fade when the band changes. */
  asTabPanel?: boolean;
  activeHighlight: string | null;
  setActiveHighlight: (key: string | null) => void;
}) {
  const wordCount = useMemo(() => countWords(model.text.join(' ')), [model]);
  return (
    <div
      className={`ma-panel${compact ? ' is-compact' : ''}`}
      {...(asTabPanel
        ? { role: 'tabpanel', id: `tabpanel-${model.band}`, 'aria-labelledby': `tab-${model.band}` }
        : {})}
    >
      <div className="ma-panel-head">
        <span className="ma-band-badge">Band {fmtBand(model.band)}</span>
        <span className="ma-word-count" data-testid="word-count">
          {wordCount} words
        </span>
      </div>
      <EssayBody model={model} activeHighlight={activeHighlight} setActiveHighlight={setActiveHighlight} />
      <CriteriaGrid model={model} />
    </div>
  );
}

export default function ModelAnswers() {
  // Only prompts that actually have a model answer are selectable. The
  // model bank predates the imported prompt set, so most prompts currently
  // have none; this list can be empty, in which case the empty state below
  // is shown instead of a broken picker.
  const promptsWithModels = useMemo(
    () => WRITING_PROMPTS.filter((p) => getModelBands(p.id).length > 0),
    [],
  );
  const task2Groups = useMemo(() => groupPrompts('task2', TASK2_GROUPS, promptsWithModels), [promptsWithModels]);
  const task1Groups = useMemo(() => groupPrompts('task1', TASK1_GROUPS, promptsWithModels), [promptsWithModels]);

  const [promptId, setPromptId] = useState<string>(promptsWithModels[0]?.id ?? '');
  const prompt = promptId ? (getWritingPrompt(promptId) as EssayPrompt | undefined) : undefined;
  const bands = useMemo(() => (promptId ? getModelBands(promptId) : []), [promptId]);

  const [band, setBand] = useState<ModelBand | null>(bands[0] ?? null);
  const [compare, setCompare] = useState(false);
  const [bandA, setBandA] = useState<ModelBand | null>(bands[0] ?? null);
  const [bandB, setBandB] = useState<ModelBand | null>(bands[bands.length - 1] ?? null);
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);

  // Tapping (or clicking) anywhere outside an open highlight note closes it —
  // the highlight button itself stops propagation, so this only ever fires
  // for genuine "elsewhere" clicks.
  useEffect(() => {
    if (!activeHighlight) return;
    const onDocClick = () => setActiveHighlight(null);
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [activeHighlight]);

  function selectPrompt(id: string) {
    setPromptId(id);
    const nextBands = getModelBands(id);
    setBand(nextBands[0] ?? null);
    setBandA(nextBands[0] ?? null);
    setBandB(nextBands[nextBands.length - 1] ?? null);
    setActiveHighlight(null);
  }

  const tabDefs: TabDef[] = bands.map((b) => ({ id: String(b), label: `Band ${fmtBand(b)}` }));
  const modelForBand = (b: ModelBand | null): ModelAnswer | undefined =>
    b == null || !promptId ? undefined : getModelAnswers(promptId).find((m) => m.band === b);

  // No prompt has a model answer yet: no hooks below this point, this is a
  // plain early return after every hook above has already run, so hook
  // order stays identical on every render regardless of which branch a
  // given render takes.
  if (promptsWithModels.length === 0) {
    return (
      <div className="ma-empty-state">
        <h2 className="ma-empty-state-title">Model answers are being prepared</h2>
        <p className="ma-empty-state-text">
          Model answers for the real exam tasks on this site are on their way. In the meantime the
          Writing Trainer's AI feedback shows you, sentence by sentence, how to reach the next band.
        </p>
        <a
          href={withBase('/trainers/writing')}
          className="rounded-button bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-hover"
        >
          Go to the Writing Trainer
        </a>
      </div>
    );
  }

  // Defensive: promptId is always drawn from promptsWithModels above, so
  // this should always resolve, but a missing prompt should render nothing
  // rather than throw.
  if (!prompt) return null;

  const currentBand = band ?? bands[0] ?? null;
  const currentModel = modelForBand(currentBand);
  const modelA = modelForBand(bandA);
  const modelB = modelForBand(bandB);

  return (
    <div className="ma-layout">
      <nav className="ma-sidebar" aria-label="Model answer prompts">
        <PromptGroup title="Task 2 essays" groups={task2Groups} activeId={promptId} onSelect={selectPrompt} />
        <PromptGroup title="Task 1 reports & letters" groups={task1Groups} activeId={promptId} onSelect={selectPrompt} />
      </nav>

      <section className="ma-content" key={promptId}>
        <div className="ma-prompt-card">
          <p className="ma-prompt-eyebrow">
            {prompt.task === 'task2' ? 'Task 2' : 'Task 1'} · {prompt.title}
          </p>
          <Html as="div" className="ma-prompt-html" html={prompt.promptHtml} />
        </div>

        <div className="ma-controls">
          {!compare ? (
            <Tabs
              tabs={tabDefs}
              active={currentBand != null ? String(currentBand) : ''}
              onChange={(id) => { setBand(Number(id) as ModelBand); setActiveHighlight(null); }}
            />
          ) : (
            <div className="ma-compare-selects">
              <label>
                Band A
                <select value={bandA ?? ''} onChange={(e) => setBandA(Number(e.target.value) as ModelBand)}>
                  {bands.map((b) => (
                    <option key={b} value={b}>
                      Band {fmtBand(b)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Band B
                <select value={bandB ?? ''} onChange={(e) => setBandB(Number(e.target.value) as ModelBand)}>
                  {bands.map((b) => (
                    <option key={b} value={b}>
                      Band {fmtBand(b)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          <div className="ma-controls-right">
            {bands.length > 1 && (
              <button
                type="button"
                className={`ma-compare-toggle${compare ? ' is-on' : ''}`}
                onClick={() => { setCompare((c) => !c); setActiveHighlight(null); }}
                aria-pressed={compare}
              >
                Compare bands
              </button>
            )}
            <a href={withBase('/trainers/writing')} className="rounded-button bg-brand px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-hover">
              Write this one
            </a>
          </div>
        </div>

        {!compare ? (
          currentModel && (
            <EssayPanel
              key={currentBand}
              model={currentModel}
              asTabPanel
              activeHighlight={activeHighlight}
              setActiveHighlight={setActiveHighlight}
            />
          )
        ) : (
          <div className="ma-compare-grid">
            {modelA && <EssayPanel model={modelA} compact activeHighlight={activeHighlight} setActiveHighlight={setActiveHighlight} />}
            {modelB && <EssayPanel model={modelB} compact activeHighlight={activeHighlight} setActiveHighlight={setActiveHighlight} />}
          </div>
        )}
      </section>
    </div>
  );
}

function PromptGroup({
  title,
  groups,
  activeId,
  onSelect,
}: {
  title: string;
  groups: { key: string; label: string; prompts: EssayPrompt[] }[];
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="ma-sidebar-section">
      <p className="ma-sidebar-title">{title}</p>
      {groups.map((g) => (
        <div key={g.key} className="ma-sidebar-group">
          <p className="ma-sidebar-group-label">{g.label}</p>
          <ul className="ma-sidebar-list">
            {g.prompts.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  data-testid="prompt-item"
                  className={`ma-sidebar-item${p.id === activeId ? ' is-active' : ''}`}
                  onClick={() => onSelect(p.id)}
                  aria-current={p.id === activeId ? 'true' : undefined}
                >
                  {p.title}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
