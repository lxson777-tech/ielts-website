import { useTrial } from '../../lib/trial/react';
import { useT } from '../../lib/i18n/react';
import { withBase } from '../../lib/url';
import { signInHref } from '../../lib/auth/profile';
import { currentRoute } from '../../lib/auth/next';
import { hasPaidAccess } from '../../lib/trial/status';

export default function LessonPracticeNotice() {
  const trial = useTrial();
  const { t } = useT();
  const signedIn = Boolean(trial.userId);
  const paid = trial.status && hasPaidAccess(trial.status, trial.now);
  return <aside className="mt-8 rounded-card border border-border bg-surface-alt p-5" data-public-lesson-notice>
    <p className="font-display font-bold">{t('Lessons are free. Put them into practice.')}</p>
    <p className="mt-2 text-sm text-ink-muted">{t('Read every lesson without an account. Sign in for practice and AI, with trial or paid access.')}</p>
    <div className="mt-4 flex flex-wrap gap-3">
      <a className="rounded-button bg-brand px-5 py-3 text-sm font-semibold text-white" href={signedIn ? withBase(paid ? '/tests' : '/trial') : signInHref(currentRoute())}>
        {t(signedIn ? paid ? 'Open practice' : 'Open my trial' : 'Sign in to practise')}
      </a>
      <a className="rounded-button border border-border px-5 py-3 text-sm font-semibold" href={withBase('/plans')}>{t('View plans')}</a>
    </div>
  </aside>;
}
