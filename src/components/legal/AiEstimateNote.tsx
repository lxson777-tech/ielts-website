/* One quiet line under an AI-marked result (2 October 2026; AI Law Art. 21
   and Personal Data Law Art. 19-1): the marking was done by AI, the band is
   an estimate and not an official IELTS score, and a person can be asked to
   review it.

   The sentence is shown on every build, because saying that AI marked the
   work is needed everywhere. The link to a person appears only where the
   support form can send (SUPPORT_ENABLED, src/lib/support.ts), exactly like
   SupportLink: it carries reason=ai-review and, at click time, the page the
   student was on, so the request arrives with its context. */

import { currentRoute } from '../../lib/auth/next';
import { useT } from '../../lib/i18n/react';
import { SUPPORT_ENABLED, supportHref } from '../../lib/support';
import './legal.css';

export default function AiEstimateNote({ className }: { className?: string }) {
  const { t } = useT();
  return (
    <p className={`ai-estimate-note${className ? ` ${className}` : ''}`} data-testid="ai-estimate-note">
      {t('Marked by AI. This band is an AI estimate, not an official IELTS score.')}
      {SUPPORT_ENABLED && (
        <>
          {' '}
          <a
            href={supportHref('ai-review')}
            onClick={(e) => {
              e.currentTarget.href = supportHref('ai-review', currentRoute());
            }}
          >
            {t('Ask a person to review it')}
          </a>
        </>
      )}
    </p>
  );
}
