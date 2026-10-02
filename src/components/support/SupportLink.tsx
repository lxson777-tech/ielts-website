/* One quiet line that leads to a person: "Something not right? Ask a person."

   Placed on the screens where the site itself cannot help any further: Mr
   EZ or a grader failing, the trial's ended and locked screens, the plans
   page. The link remembers which screen it was on (`reason`) and, at click
   time, the page the student was on, so Alex reads the message in context.
   Adding the page at click time rather than during render keeps the server
   HTML and the first browser render identical. */

import { currentRoute } from '../../lib/auth/next';
import { useT } from '../../lib/i18n/react';
import { nt } from '../../lib/i18n/translate';
import { SUPPORT_ENABLED, supportHref, type SupportReason } from '../../lib/support';
import './support.css';

const LEADS = {
  wrong: nt('Something not right?'),
  buy: nt('Questions before you buy?'),
  hand: nt('Need a hand?'),
} as const;

export default function SupportLink({
  reason,
  lead = 'wrong',
  className,
}: {
  reason: SupportReason;
  /** The short sentence before the link, or null for the link alone. */
  lead?: keyof typeof LEADS | null;
  className?: string;
}) {
  const { t } = useT();
  // No form on this build, so no link to it (src/lib/support.ts).
  if (!SUPPORT_ENABLED) return null;
  return (
    <p className={`support-link${className ? ` ${className}` : ''}`}>
      {lead && <span>{t(LEADS[lead])} </span>}
      <a
        href={supportHref(reason)}
        onClick={(e) => {
          e.currentTarget.href = supportHref(reason, currentRoute());
        }}
      >
        {t('Ask a person')}
      </a>
    </p>
  );
}
