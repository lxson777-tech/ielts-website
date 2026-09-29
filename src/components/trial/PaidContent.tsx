/* A page's tool in the GATED build, opened for a PAYING account.

   The gated build (PUBLIC_ACCESS_MODE=trial) writes no locked study material
   into its pages and ships empty stand-ins for it in the browser. A page the
   trial does not include therefore renders this instead of its tool. For a
   paid account it fetches the material through the content gate
   (src/lib/trial/packs.ts), puts it in place, and only then loads and mounts
   the page's real tool, so the tool never draws a frame with the empty
   stand-ins. For everyone else it renders nothing and asks for nothing: the
   page's gate (TrialGate) already explains why the page is closed.

   A few pages are part of the trial too (the Writing Checker, the live
   examiner): there `shared` keeps today's trial behaviour for a non-paid
   account, and a paid account gets the full tool once its material is in.

   The open site never renders this: its pages keep their tools as they are. */

import { useEffect, useState, type ComponentType, type ReactElement } from 'react';
import { useTrial } from '../../lib/trial/react';
import { useT } from '../../lib/i18n/react';
import { withBase } from '../../lib/url';
import { commonPacks, fetchPack, loadPacks, paidNow, type ModulePack, type PackFailure } from '../../lib/trial/packs';
import { refreshTrial } from '../../lib/trial/client';
import { PaidFailed, PaidLoading } from './PaidStates';

export type PaidView =
  | { name: 'band-ladder' }
  | { name: 'cue-card-bank' }
  | { name: 'model-answers' }
  | { name: 'writing-trainer' }
  | { name: 'writing-checker' }
  | { name: 'speaking-trainer'; live: boolean }
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

export default function PaidContent({
  view,
  shared = false,
  full = false,
}: {
  view: PaidView;
  /** The trial includes this page too: a non-paid account gets today's tool
      as it is (it applies the trial's own rules), a paid one the full tool. */
  shared?: boolean;
  /** A bare page (the mock exam, the placement test): fill the screen. */
  full?: boolean;
}) {
  const trial = useTrial();
  const paid = paidNow(trial, trial.now);
  const [attempt, setAttempt] = useState(0);
  const stage = usePaidView(view, paid, attempt);
  const [trialTool, setTrialTool] = useState<ReactElement | null>(null);

  /* A shared page for a student without paid access: the tool as the trial
     has it, with no pack and no paid material. Mounted once the account is
     known, so a paid student never sees the trial's version first. */
  const decided = trial.phase !== 'checking';
  useEffect(() => {
    if (!shared || paid || !decided || trialTool) return;
    let live = true;
    void planFor(view)
      .mount(undefined)
      .then((element) => {
        if (live) setTrialTool(element);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shared, paid, decided]);

  const retry = () => {
    if (stage.kind === 'failed' && stage.reason === 'not-paid') void refreshTrial();
    setAttempt((n) => n + 1);
  };

  if (!paid) {
    if (shared && decided) return trialTool ?? <PaidLoading full={full} />;
    if (shared) return <PaidLoading full={full} />;
    return null;
  }
  if (stage.kind === 'ready') return stage.element;
  if (stage.kind === 'failed') return <PaidFailed reason={stage.reason} onRetry={retry} full={full} />;
  return <PaidLoading full={full} />;
}
