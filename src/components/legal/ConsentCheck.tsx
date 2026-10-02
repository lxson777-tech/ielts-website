/* The required consent tick box, used at sign-up and, for an account that
   has not given the current consent yet, on the profile form. Unticked by
   default. The full wording (who, what, why, third parties and countries,
   how long, how to withdraw) sits in a "Read what this covers" disclosure
   right under it, built from src/lib/legal/consent.ts for THIS build. */

import { withBase } from '../../lib/url';
import { useT } from '../../lib/i18n/react';
import { isTrialBuild } from '../../lib/trial/mode';
import { ACCOUNT_DELETION_ENABLED } from '../../lib/auth/session';
import { SUPPORT_ENABLED } from '../../lib/support';
import { CONSENT_SENTENCE, CONSENT_VERSION, consentPoints } from '../../lib/legal/consent';
import './legal.css';

export default function ConsentCheck({
  id,
  checked,
  onChange,
  error,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string | null;
}) {
  const { t } = useT();
  const points = consentPoints({
    drafts: isTrialBuild(),
    paid: isTrialBuild(),
    deletion: ACCOUNT_DELETION_ENABLED,
    support: SUPPORT_ENABLED,
  });
  const errorId = `${id}-error`;
  return (
    <div className="auth-field consent-field">
      <label className="auth-check">
        <input
          id={id}
          type="checkbox"
          required
          checked={checked}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : `${id}-details`}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span>{t(CONSENT_SENTENCE)}</span>
      </label>
      {error && (
        <p className="auth-field-error" id={errorId} role="alert">
          {error}
        </p>
      )}
      <details className="consent-details" id={`${id}-details`} data-testid="consent-details">
        <summary>{t('Read what this covers')}</summary>
        {points.map((point) => (
          <div key={point.heading}>
            <h3>{t(point.heading)}</h3>
            <ul>
              {point.lines.map((line) => (
                <li key={line.text}>{t(line.text, line.vars)}</li>
              ))}
            </ul>
          </div>
        ))}
        <p className="consent-foot">
          {t('Consent version {version}.', { version: CONSENT_VERSION })}{' '}
          <a href={withBase('/privacy')}>{t('The privacy notice explains all of this in full.')}</a>
        </p>
      </details>
    </div>
  );
}
