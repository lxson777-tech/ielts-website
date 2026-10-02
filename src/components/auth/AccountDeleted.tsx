/* Where a student lands after deleting their account (2 October 2026):
   one calm confirmation, and the way back in for anyone who wants a fresh
   start. Everything was already removed before this page loaded. */
import { AuthShell } from './shell';
import { useT } from '../../lib/i18n/react';
import { withBase } from '../../lib/url';

export default function AccountDeleted() {
  const { t } = useT();
  return (
    <AuthShell title={t('Your account has been deleted')}>
      <div className="auth-done">
        <p className="auth-lede">{t('Your account and all your data have been removed. Thank you for studying with us.')}</p>
        <p className="auth-hint" style={{ marginTop: 14 }}>
          {t('You can create a new account at any time. It will start empty.')}
        </p>
        <a className="auth-button is-secondary" href={withBase('/')}>
          {t('Back to the home page')}
        </a>
      </div>
    </AuthShell>
  );
}
