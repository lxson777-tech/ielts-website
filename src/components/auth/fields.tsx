/* Small pieces shared by the account pages: a labelled field, a password
   input with a show/hide control, and the password rules with a strength
   hint. Styles in src/styles/auth.css. */

import { useId, useState, type ReactNode } from 'react';
import { checkPassword, type PasswordProblem } from '../../lib/auth/password';
import type { ProfileSource } from '../../lib/auth/profile';
import { useT } from '../../lib/i18n/react';
import { nt } from '../../lib/i18n/translate';

export function Field({
  id,
  label,
  error,
  hint,
  aside,
  children,
}: {
  id: string;
  label: string;
  error?: string | null;
  hint?: string | null;
  /** Something small on the label's line, e.g. "Forgot password?". */
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="auth-field">
      <div className="auth-field-head">
        <label className="auth-label" htmlFor={id}>
          {label}
        </label>
        {aside}
      </div>
      {children}
      {error ? (
        <p className="auth-field-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="auth-hint" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** aria-describedby for an input inside <Field>. */
export function describedBy(id: string, error?: string | null, hint?: string | null): string | undefined {
  if (error) return `${id}-error`;
  if (hint) return `${id}-hint`;
  return undefined;
}

export function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  invalid,
  describedById,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  invalid?: boolean;
  describedById?: string;
}) {
  const { t } = useT();
  const [shown, setShown] = useState(false);
  return (
    <div className="auth-password">
      <input
        id={id}
        className="auth-input"
        type={shown ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        autoCapitalize="none"
        spellCheck={false}
        required
        aria-invalid={invalid ? 'true' : undefined}
        aria-describedby={describedById}
      />
      <button
        type="button"
        className="auth-reveal"
        aria-controls={id}
        aria-pressed={shown}
        onClick={() => setShown((s) => !s)}
      >
        {shown ? t('Hide') : t('Show')}
      </button>
    </div>
  );
}

/** "How did you find us", in words, for the profile form and /account. */
export const SOURCE_LABELS: Record<ProfileSource, string> = {
  friend: nt('A friend'),
  instagram: nt('Instagram'),
  centre: nt('The teaching centre'),
  other: nt('Somewhere else'),
};

const RULES: { problem: PasswordProblem; label: string }[] = [
  { problem: 'tooShort', label: nt('At least 8 characters') },
  { problem: 'noLetter', label: nt('At least one letter') },
  { problem: 'noDigit', label: nt('At least one number') },
];

/** The three rules, ticking off as they are met, and a one-word strength
    hint once they all are. Announced politely to screen readers. */
export function PasswordStrength({ password }: { password: string }) {
  const { t } = useT();
  const id = useId();
  const check = checkPassword(password);
  const word = check.strength === 'strong' ? t('Strong') : check.strength === 'fair' ? t('Fair') : t('Weak');
  return (
    <div className="auth-strength" data-strength={password ? check.strength : undefined} aria-live="polite" id={id}>
      <div className="auth-strength-bar" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <ul className="auth-rules">
        {RULES.map((rule) => (
          <li key={rule.problem} className={password && !check.problems.includes(rule.problem) ? 'is-met' : undefined}>
            {t(rule.label)}
          </li>
        ))}
      </ul>
      {password && (
        <p className="auth-strength-label">
          <span>{t('Password strength')}</span>
          <strong>{word}</strong>
        </p>
      )}
    </div>
  );
}

/** The sentence for the first rule a password still breaks, for a form's
    submit-time error. */
export function passwordProblemSentence(t: (key: string) => string, problems: PasswordProblem[]): string {
  if (problems.includes('tooShort')) return t('Use at least 8 characters.');
  if (problems.includes('noLetter')) return t('Add at least one letter.');
  return t('Add at least one number.');
}
