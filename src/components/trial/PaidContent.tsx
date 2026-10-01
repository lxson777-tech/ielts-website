/* A page's tool in the GATED build, opened for a PAYING account.

   The gated build (PUBLIC_ACCESS_MODE=trial) writes no locked study material
   into its pages and ships empty stand-ins for it in the browser. A page the
   trial does not include therefore renders this instead of its tool. For a
   paid account it fetches the material through the content gate
   (src/lib/trial/packs.ts), puts it in place, and only then loads and mounts
   the page's real tool, so the tool never draws a frame with the empty
   stand-ins. For everyone else it renders nothing and asks for nothing: the
   page's gate (TrialGate) already explains why the page is closed.

   The free-account model (1 October 2026) retired the trial, so no page is
   "shared" with it any more. The one exception is the vocabulary topic
   lists, free with an account: a free account gets them, without their
   paid practice round.

   The open site never renders this: its pages keep their tools as they are. */

import { useEffect, useState, type ComponentType, type ReactElement } from 'react';
import { useTrial } from '../../lib/trial/react';
import { useT } from '../../lib/i18n/react';
import { withBase } from '../../lib/url';
import { commonPacks, fetchFreePack, fetchPack, loadPacks, paidNow, type ModulePack, type PackFailure } from '../../lib/trial/packs';
import { browserTier, readsLessons } from '../../lib/access/tier';
import { refreshTrial } from '../../lib/trial/client';
import { PaidFailed, PaidLoading } from './PaidStates';

export type PaidView =
  | { name: 'band-ladder' }
  | { name: 'cue-card-bank' }
  | { name: 'model-answers' }
  | { name: 'writing-trainer' }
  | { name: 'writing-checker' }
  | { name: 'speaking-trainer'; live: boolean }
  | { name: 'recorded' }
  | { name: 'examiner' }
  | { name: 'mock-exam'; hubUrl: string }
  | { name: 'vocab-topics' }
  | { name: 'placement' }
  | { name: 'focused'; id: string }
  | { name: 'speaking-focus'; id: string };

/** What each view needs through the gate, and how it is mounted. */
interface Plan {
  packs: ModulePack[];
  /** A pack whose data is handed to the tool as its props. */
  viewPack?: string;
  mount: (data: unknown) => Promise<ReactElement>;
  /** What a paid account gets, when it differs from `mount` (shared pages). */
  paidMount?: (data: unknown) => Promise<ReactElement>;
}

/** The cue-card bank's card under the examiner, as the open site's page
    has it. */
function CueCardBankLink() {
  const { t } = useT();
  return (
    <a href={withBase('/speaking/cue-cards')} className="skill-resource-card">
      <span className="skill-resource-card-title">{t('Cue-card bank (for study, not a test)')}</span>
      <span className="skill-resource-card-desc">{t('Read 24 Part 2 cue cards with model answers, to prepare before you speak')}</span>
    </a>
  );
}

/* Each tool is imported only here, and only after its material is in, so a
   module that reads the material when it loads reads the real thing. */
function planFor(view: PaidView): Plan {
  const el = async <P extends object>(load: () => Promise<{ default: ComponentType<P> }>, props: P): Promise<ReactElement> => {
    const { default: Component } = await load();
    return <Component {...props} />;
  };
  switch (view.name) {
    case 'band-ladder':
      return { packs: ['band-guides'], mount: () => el(() => import('../BandLadder'), {}) };
    case 'cue-card-bank':
      return { packs: ['cue-cards'], mount: () => el(() => import('../CueCardBank'), {}) };
    case 'model-answers':
      return { packs: ['model-answers', 'writing-prompts-imported'], mount: () => el(() => import('../ModelAnswers'), {}) };
    case 'writing-trainer':
      return {
        packs: ['writing-prompts-imported', 'writing-structures', 'writing-plans', 'band-guides', 'model-answers'],
        mount: () => el(() => import('../WritingTester'), { variant: 'trainer' as const }),
      };
    case 'writing-checker':
      return {
        packs: ['writing-prompts-imported', 'band-guides', 'model-answers'],
        mount: () => el(() => import('../WritingTester'), { variant: 'checker' as const }),
      };
    case 'speaking-trainer':
      return {
        packs: ['speaking-prompts', 'speaking-structure-guides', 'band-guides'],
        mount: () =>
          view.live
            ? el(() => import('../LiveExaminer'), { variant: 'drills' as const })
            : el(() => import('../SpeakingTester'), {}),
      };
    case 'recorded':
      return { packs: ['speaking-prompts','speaking-structure-guides','band-guides'], mount: () => el(() => import('../SpeakingTester'), {trialRecorded:true}) };
    case 'examiner':
      return {
        packs: ['speaking-prompts', 'speaking-structure-guides', 'band-guides'],
        mount: async () => {
          const { default: LiveExaminer } = await import('../LiveExaminer');
          return <LiveExaminer />;
        },
        /* Paid access only: the full test, and the cue-card bank under it,
           as the open site shows them. */
        paidMount: async () => {
          const { default: LiveExaminer } = await import('../LiveExaminer');
          return (
            <>
              <LiveExaminer />
              <CueCardBankLink />
            </>
          );
        },
      };
    case 'mock-exam':
      return {
        packs: ['writing-prompts-imported', 'speaking-prompts', 'speaking-structure-guides', 'band-guides'],
        mount: () => el(() => import('../MockExam'), { hubUrl: view.hubUrl }),
      };
    case 'vocab-topics':
      return {
        packs: ['vocabulary'],
        viewPack: 'vocabulary',
        mount: async (data) => {
          const { default: VocabTopics } = await import('../VocabTopics');
          const topics = (data as { topics?: Parameters<typeof VocabTopics>[0]['topics'] }).topics;
          if (!Array.isArray(topics)) throw new Error('pack: vocabulary has no topics');
          return <VocabTopics topics={topics} />;
        },
      };
    case 'placement':
      return {
        packs: ['band-guides'],
        viewPack: 'placement',
        mount: async (data) => {
          const { default: Placement } = await import('../placement/Placement');
          return <Placement material={data as Parameters<typeof Placement>[0]['material']} />;
        },
      };
    case 'focused':
      return {
        packs: ['focused-exercises'],
        viewPack: `focused-${view.id}`,
        mount: async (data) => {
          const value = data as { written?: unknown; item?: unknown };
          if (value.written) {
            const { default: WritingFocusedTask } = await import('../learning/WritingFocusedTask');
            return <WritingFocusedTask view={value.written as Parameters<typeof WritingFocusedTask>[0]['view']} />;
          }
          if (value.item) {
            const { default: FocusedExercise } = await import('../learning/FocusedExercise');
            return <FocusedExercise view={value.item as Parameters<typeof FocusedExercise>[0]['view']} />;
          }
          throw new Error('pack: empty focused view');
        },
      };
    case 'speaking-focus':
      return {
        packs: ['focused-exercises', 'speaking-prompts'],
        viewPack: `speaking-focus-${view.id}`,
        mount: async (data) => {
          const { default: SpokenFocusedTask } = await import('../learning/SpokenFocusedTask');
          return <SpokenFocusedTask view={data as Parameters<typeof SpokenFocusedTask>[0]['view']} />;
        },
      };
  }
}

type Stage =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; element: ReactElement }
  | { kind: 'failed'; reason: PackFailure | 'error' };

/** Loads a paid view's material and mounts its tool. `attempt` bumps retry. */
function usePaidView(view: PaidView, active: boolean, attempt: number): Stage {
  const [stage, setStage] = useState<Stage>({ kind: 'idle' });
  const key = JSON.stringify(view);
  useEffect(() => {
    if (!active) {
      setStage({ kind: 'idle' });
      return;
    }
    let live = true;
    setStage({ kind: 'loading' });
    const plan = planFor(view);
    void (async () => {
      const packs = await loadPacks([...commonPacks(), ...plan.packs]);
      if (!live) return;
      if (!packs.ok) return setStage({ kind: 'failed', reason: packs.reason });
      let data: unknown = undefined;
      if (plan.viewPack) {
        const own = await fetchPack(plan.viewPack);
        if (!live) return;
        if (!own.ok) return setStage({ kind: 'failed', reason: own.reason });
        data = own.value;
      }
      try {
        const element = await (plan.paidMount ?? plan.mount)(data);
        if (live) setStage({ kind: 'ready', element });
      } catch {
        if (live) setStage({ kind: 'failed', reason: 'error' });
      }
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, active, attempt]);
  return stage;
}

/** The vocabulary topic lists for a FREE account (the free-account model):
    the topics come through the content door (`pack/vocabulary`, see
    FREE_ACCOUNT_PACKS), and the page's practice round stays paid (its
    button carries data-paid-feature, so the upgrade pop-up opens). */
function useFreeVocabTopics(active: boolean, userId: string | null, attempt: number): Stage {
  const [stage, setStage] = useState<Stage>({ kind: 'idle' });
  useEffect(() => {
    if (!active) {
      setStage({ kind: 'idle' });
      return;
    }
    let live = true;
    setStage({ kind: 'loading' });
    void (async () => {
      const pack = await fetchFreePack('vocabulary');
      if (!live) return;
      if (!pack.ok) return setStage({ kind: 'failed', reason: pack.reason });
      try {
        const { default: VocabTopics } = await import('../VocabTopics');
        const topics = (pack.value as { topics?: Parameters<typeof VocabTopics>[0]['topics'] }).topics;
        if (!Array.isArray(topics)) throw new Error('pack: vocabulary has no topics');
        if (live) setStage({ kind: 'ready', element: <VocabTopics topics={topics} /> });
      } catch {
        if (live) setStage({ kind: 'failed', reason: 'error' });
      }
    })();
    return () => {
      live = false;
    };
  }, [active, userId, attempt]);
  return stage;
}

export default function PaidContent({
  view,
  full = false,
}: {
  view: PaidView;
  /** Kept for older pages: the trial is retired, so a page with no paid
      access shows its gate (TrialGate) and nothing here. */
  shared?: boolean;
  /** A bare page (the mock exam, the placement test): fill the screen. */
  full?: boolean;
}) {
  const trial = useTrial();
  const paid = paidNow(trial, trial.now);
  const tier = browserTier(trial, trial.now);
  const [attempt, setAttempt] = useState(0);
  const stage = usePaidView(view, paid, attempt);
  /* The one paid page whose content a free account also opens. */
  const freeVocab = !paid && view.name === 'vocab-topics' && readsLessons(tier);
  const freeStage = useFreeVocabTopics(freeVocab, trial.userId, attempt);

  const retry = () => {
    if (stage.kind === 'failed' && stage.reason === 'not-paid') void refreshTrial();
    setAttempt((n) => n + 1);
  };

  if (freeVocab) {
    if (freeStage.kind === 'ready') return freeStage.element;
    if (freeStage.kind === 'failed') return <PaidFailed reason={freeStage.reason} onRetry={retry} full={full} />;
    return <PaidLoading full={full} />;
  }
  /* Anyone without practice and guidance: the page's gate (TrialGate)
     already explains, with the upgrade pop-up one press away. */
  if (!paid) return null;
  if (stage.kind === 'ready') return stage.element;
  if (stage.kind === 'failed') return <PaidFailed reason={stage.reason} onRetry={retry} full={full} />;
  return <PaidLoading full={full} />;
}
