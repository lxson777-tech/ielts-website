/* The Tests and Practice pages in a TRIAL build: every "start a test"
   action and every full-access description follows the student's account
   (audit F02 and F03, 29 September 2026).

   BROWSER ONLY, and only loaded by a trial build (the pages import it on
   demand), so the open site never downloads it.

   Markup contract, written by src/pages/tests/index.astro and
   src/pages/trainers/index.astro:

     [data-trial-section="reading"]   a button or link that starts that
                                      section's test. Optional:
                                      data-test-ids + data-rotation-key (the
                                      page's rotation for full access),
                                      data-full-label, data-full-href.
     [data-trial-note="reading"]      the plain line under it, filled here.
     [data-access-copy="trial"|"full"] shown to a trial student (or anyone
                                      signed out) / to full access. The trial
                                      copy is the build's default, so nothing
                                      broader flashes before the account is
                                      known.

   Where each action leads is decided by trialTestDestination
   (./test-destination), from the same testAccess and hasPaidAccess the test
   page and Today use. This file only draws the answer. */

import { withBase } from '../url';
import { t } from '../i18n/translate';
import { onLocaleChange } from '../i18n/locale';
import { nextInRotation } from '../rotation';
import { activeSession, secondsLeft } from '../test-session';
import { onTrialChange, serverNow, trialView, type TrialView } from './client';
import { ACCESS_MODE } from './mode';
import { isTrialSection, type TrialSection } from './offer';
import { seesFullAccessCopy, trialTestDestination, type TestDestination } from './test-destination';

/** Paper names stay English in every language, like the exam paper. */
const SECTION_NAME: Record<TrialSection, string> = {
  reading: 'Reading',
  listening: 'Listening',
  writing: 'Writing',
  speaking: 'Speaking',
};

function destinationFor(view: TrialView, section: TrialSection): TestDestination {
  return trialTestDestination({ mode: ACCESS_MODE, phase: view.phase, status: view.status, now: serverNow(), section });
}

function rotationIds(el: HTMLElement): string[] {
  try {
    const ids = JSON.parse(el.dataset.testIds ?? '[]');
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

/** An unfinished timed sitting on this device, for one of `ids`. */
function localSitting(ids: string[]): { testId: string; minutes: number } | null {
  const session = activeSession();
  if (!session || !ids.includes(session.testId)) return null;
  const left = secondsLeft(session);
  return left > 0 ? { testId: session.testId, minutes: Math.ceil(left / 60) } : null;
}

/** The action's label, and where a click goes (null: do nothing yet). */
function describe(el: HTMLElement, section: TrialSection, dest: TestDestination): { label: string; href: string | null } {
  const name = SECTION_NAME[section];
  switch (dest.kind) {
    case 'rotation': {
      const ids = rotationIds(el);
      if (ids.length > 0) {
        const resume = localSitting(ids);
        if (resume) return { label: t('Resume your test: {min} min left', { min: resume.minutes }), href: `/tests/${resume.testId}` };
        return { label: t(el.dataset.fullLabel ?? 'Start a test'), href: null };
      }
      return { label: t(el.dataset.fullLabel ?? 'Start a test'), href: el.dataset.fullHref ?? null };
    }
    case 'wait':
      return { label: t('Start your {section} test', { section: name }), href: null };
    case 'join':
      return { label: t('Start your 3-day trial'), href: dest.href };
    case 'start':
    case 'check-failed':
      return { label: t('Start your {section} test', { section: name }), href: dest.href };
    case 'resume': {
      const local = localSitting([dest.testId]);
      return {
        label: local ? t('Resume your test: {min} min left', { min: local.minutes }) : t('Continue test'),
        href: dest.href,
      };
    }
    case 'used':
      return { label: t('See my results'), href: dest.href };
    case 'ended':
      return { label: t('View plans'), href: dest.href };
    case 'unavailable':
      return { label: t('Not open yet'), href: null };
  }
}

/** The line under the action, or null for none. */
function noteFor(section: TrialSection, dest: TestDestination): { text: string; link?: { label: string; href: string } } | null {
  const name = SECTION_NAME[section];
  switch (dest.kind) {
    case 'join':
      return {
        text: dest.signedIn
          ? t('Start your trial to use your included {section} test.', { section: name })
          : t('Sign in or create a free account to use your included {section} test.', { section: name }),
      };
    case 'start':
      return { text: t('Included in your trial. Starting it uses your one {section} test.', { section: name }) };
    case 'resume':
      return { text: t('You have started your trial {section} test. It is still yours to finish.', { section: name }) };
    case 'used':
      return {
        text: t('You have used your trial’s {section} test. More tests come with full access.', { section: name }),
        link: { label: t('View plans'), href: dest.plansHref },
      };
    case 'ended':
      return { text: t('Your trial has ended. Your results stay saved.') };
    case 'unavailable':
      return { text: t('This test is not open yet.') };
    default:
      return null;
  }
}

function renderNote(note: HTMLElement, content: ReturnType<typeof noteFor>): void {
  if (!content) {
    note.hidden = true;
    note.replaceChildren();
    return;
  }
  const parts: Node[] = [document.createTextNode(content.text)];
  if (content.link) {
    const a = document.createElement('a');
    a.href = withBase(content.link.href);
    a.textContent = content.link.label;
    a.className = 'font-semibold underline underline-offset-2';
    parts.push(document.createTextNode(' '), a);
  }
  note.replaceChildren(...parts);
  note.hidden = false;
}

let bound = false;

/** Draws every action and description for the current account, and keeps
    them current as the account or the language changes. */
export function initTrialHub(): void {
  if (ACCESS_MODE !== 'trial' || typeof document === 'undefined') return;
  let view = trialView();

  const draw = () => {
    const full = seesFullAccessCopy(ACCESS_MODE, view.phase, view.status, serverNow());
    /* Read by page styles, e.g. the Tests catalogue hides its "Unseen"
       badges on papers a trial student cannot open. */
    document.body.dataset.accessView = full ? 'full' : 'trial';
    document.querySelectorAll<HTMLElement>('[data-access-copy]').forEach((el) => {
      el.hidden = el.dataset.accessCopy === 'full' ? !full : full;
    });
    document.querySelectorAll<HTMLElement>('[data-trial-section]').forEach((el) => {
      const section = el.dataset.trialSection;
      if (!isTrialSection(section)) return;
      const dest = destinationFor(view, section);
      const { label, href } = describe(el, section, dest);
      el.textContent = label;
      el.dataset.trialDestination = dest.kind;
      if (el instanceof HTMLAnchorElement && href) el.href = withBase(href);
      if (dest.kind === 'unavailable') el.setAttribute('aria-disabled', 'true');
      else el.removeAttribute('aria-disabled');
      if (dest.kind === 'wait') el.setAttribute('aria-busy', 'true');
      else el.removeAttribute('aria-busy');
      const note = document.querySelector<HTMLElement>(`[data-trial-note="${section}"]`);
      if (note) renderNote(note, noteFor(section, dest));
    });
  };

  /* A click decides from the account as it is AT the click, so a stale
     label can never send anyone to a locked paper. While the account is
     still being checked, the click waits for the answer. */
  let pending: { el: HTMLElement; section: TrialSection } | null = null;
  const go = (el: HTMLElement, section: TrialSection): boolean => {
    const dest = destinationFor(view, section);
    if (dest.kind === 'wait') {
      pending = { el, section };
      return true;
    }
    if (dest.kind === 'unavailable') return true;
    const { href } = describe(el, section, dest);
    if (href) {
      window.location.href = withBase(href);
      return true;
    }
    if (dest.kind === 'rotation') {
      const ids = rotationIds(el);
      const key = el.dataset.rotationKey;
      if (ids.length > 0 && key) {
        window.location.href = withBase(`/tests/${nextInRotation(key, ids)}`);
        return true;
      }
    }
    return false;
  };

  if (!bound) {
    bound = true;
    document.addEventListener('click', (event) => {
      const target = event.target as Element | null;
      const el = target?.closest<HTMLElement>('[data-trial-section]');
      if (!el || event.defaultPrevented) return;
      if (event instanceof MouseEvent && (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return;
      const section = el.dataset.trialSection;
      if (!isTrialSection(section)) return;
      if (go(el, section)) event.preventDefault();
    });
    onTrialChange((next) => {
      view = next;
      draw();
      if (pending && destinationFor(view, pending.section).kind !== 'wait') {
        const { el, section } = pending;
        pending = null;
        go(el, section);
      }
    });
    onLocaleChange(draw);
  }
  draw();
}
