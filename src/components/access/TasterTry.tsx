/* The page where a free account uses its one free essay check or its one
   free recorded Speaking check (free AI tries, 10 October 2026): /try/essay
   and /try/speaking, GATED BUILD ONLY.

   Why a page of their own: /writing/checker and /speaking/recorded are paid
   pages whose questions arrive only through the content gate for a paid
   account, and that must stay true. These two take a question that is
   already public (the Part 1 topic the retired trial used, four Task 2
   questions written for this, or the student's own text), so no paid
   material is involved. The tools are the same ones paid accounts use
   (WritingTester, SpeakingTester) in a free-check mode.

   Who sees what:
   - a free account (or one whose paid access ended) with a try left: the
     tool. It stays on screen after the try is used, so the result is read;
   - the same account with the try used: a calm "used" card and the pitch;
   - paid and complimentary: nothing of the free check; a link to the real
     Writing checker or recorded Speaking page, which use their own allowance;
   - signed out: the page's own gate shows the sign-in invitation.
   Nothing here grants anything: the Worker counts and refuses for itself. */

import { lazy, Suspense, useEffect, useState } from 'react';
import { useT } from '../../lib/i18n/react';
import { withBase } from '../../lib/url';
import { currentRoute } from '../../lib/auth/next';
import { opensEverything } from '../../lib/access/tier';
import { openUpgrade } from '../../lib/access/upgrade';
import { TASTER_OWN_MAX, TASTER_OWN_MIN, TASTER_QUESTIONS, TASTER_QUESTION_TEXT, ownQuestion } from '../../lib/access/taster-questions';
import type { EssayPrompt } from '../../lib/writing/schema';
import { ensureAccessStyles } from './access-styles';
import { useTaster } from './taster-ui';

const WritingTester = lazy(() => import('../WritingTester'));
const SpeakingTester = lazy(() => import('../SpeakingTester'));

export type TasterTryKind = 'essay' | 'speaking';

function Fallback() {
  const { t } = useT();
  return (
    <p className="taster-page-intro" role="status">
      {t('Loading…')}
    </p>
  );
}

/** The card for an account that has used this try (or never gets it). */
function UsedCard({ kind, unavailable }: { kind: TasterTryKind; unavailable: boolean }) {
  const { t } = useT();
  return (
    <section className="trial-ui taster-card" data-taster-used={kind}>
      <span className="upgrade-eyebrow">{t('Your free AI tries')}</span>
      <h2>
        {unavailable
          ? t('Free tries are not available right now.')
          : kind === 'essay'
            ? t('You have used your free essay check.')
            : t('You have used your free Speaking check.')}
      </h2>
      <p className="taster-lead">
        {unavailable
          ? t('Your lessons are all still open. Please try again later.')
          : t('Your result is saved in your account. Every lesson stays free, and practice and guidance keeps the checks coming.')}
      </p>
      <p className="taster-foot">
        <button
          type="button"
          className="trial-btn trial-primary"
          onClick={() => openUpgrade(kind === 'essay' ? 'essay' : 'speaking', { from: currentRoute(), reason: 'taster-used' })}
        >
          {t('See what practice and guidance adds')}
        </button>
        <a className="taster-link" href={withBase('/dashboard')}>
          {t('Back to Today')}
        </a>
      </p>
    </section>
  );
}

/** Choose a Task 2 question, or write your own. */
function QuestionPicker({ onChoose }: { onChoose: (prompt: EssayPrompt) => void }) {
  const { t } = useT();
  const [own, setOwn] = useState('');
  const parsed = ownQuestion(own);
  return (
    <section className="taster-picker" data-taster-picker>
      <h2 className="font-display text-xl font-extrabold">{t('Choose a Task 2 question')}</h2>
      <p className="taster-page-intro">
        {t('Write your answer under exam conditions. Then an AI examiner marks it on the four official IELTS Writing criteria. You can only check one essay for free, so take your time.')}
      </p>
      <ul className="taster-questions">
        {TASTER_QUESTIONS.map((question) => (
          <li key={question.id}>
            <button type="button" className="taster-question" onClick={() => onChoose(question)} data-taster-question={question.id}>
              {TASTER_QUESTION_TEXT[question.id]}
            </button>
          </li>
        ))}
      </ul>
      <div className="taster-own">
        <label htmlFor="taster-own-question">{t('Or use a question of your own')}</label>
        <textarea
          id="taster-own-question"
          value={own}
          maxLength={TASTER_OWN_MAX}
          placeholder={t('Paste or type an IELTS Task 2 question')}
          onChange={(e) => setOwn(e.target.value)}
        />
        <div>
          <button
            type="button"
            className="trial-btn"
            disabled={!parsed}
            onClick={() => parsed && onChoose(parsed)}
            data-taster-own-use
          >
            {t('Use my question')}
          </button>
          {own.trim().length > 0 && !parsed && (
            <small className="taster-page-intro" role="status">
              {' '}
              {t('A question needs at least {n} characters.', { n: TASTER_OWN_MIN })}
            </small>
          )}
        </div>
      </div>
    </section>
  );
}

export default function TasterTry({ kind }: { kind: TasterTryKind }) {
  const { t } = useT();
  const taster = useTaster();
  const feature = kind === 'essay' ? 'writing' : 'speaking';
  const [prompt, setPrompt] = useState<EssayPrompt | null>(null);
  /* Once the tool has been shown it stays, so the result can be read after
     the server counts the try as used. */
  const [kept, setKept] = useState(false);
  const offered = taster.offered(feature);
  const open = kind === 'essay' ? prompt !== null : offered;
  useEffect(() => {
    if (open || kept) setKept(true);
  }, [open, kept]);

  if (taster.tier === 'checking' || taster.tier === 'error' || taster.tier === 'signed-out') return null;
  /* The open site has no such page; a stray visit shows nothing. */
  if (taster.tier === 'open') return null;
  ensureAccessStyles();

  if (opensEverything(taster.tier)) {
    return (
      <section className="trial-ui taster-card" data-taster-paid={kind}>
        <h2>{t('You already have practice and guidance.')}</h2>
        <p className="taster-lead">
          {kind === 'essay'
            ? t('Your essay checks come with your plan. Open the Writing checker to use one.')
            : t('Your Speaking checks come with your plan. Open recorded Speaking to use one.')}
        </p>
        <p className="taster-foot">
          <a className="trial-btn trial-primary" href={withBase(kind === 'essay' ? '/writing/checker' : '/speaking/recorded')}>
            {kind === 'essay' ? t('Open the Writing checker') : t('Open recorded Speaking')}
          </a>
        </p>
      </section>
    );
  }

  if (kind === 'essay') {
    if (prompt) {
      return (
        <Suspense fallback={<Fallback />}>
          <WritingTester variant="checker" taster={prompt} />
        </Suspense>
      );
    }
    if (!offered) return <UsedCard kind={kind} unavailable={taster.taster === null} />;
    return <QuestionPicker onChoose={setPrompt} />;
  }

  if (offered || kept) {
    return (
      <Suspense fallback={<Fallback />}>
        <SpeakingTester taster />
      </Suspense>
    );
  }
  return <UsedCard kind={kind} unavailable={taster.taster === null} />;
}
