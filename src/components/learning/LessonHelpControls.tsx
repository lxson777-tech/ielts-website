/* The small, quiet help controls that sit at a teaching point.
 *
 * One line of text buttons, nothing revealed until it is asked for, and
 * never three loud buttons under every paragraph. What they offer depends
 * on where they are: a hint before an answer, an explanation or an example
 * after one, and nothing at all while a check is running.
 *
 * Everything about what the reply MEANS is in ./lesson-help.ts: which kind
 * was really given, what the student's assistance level becomes, and
 * whether the words came from the tutor, from a local stand-in or from the
 * lesson itself. This file is the buttons.
 *
 * WHOSE HELP IS ON SCREEN (the follow-up to R2E-02)
 * Every press is bound to the student on the page at that moment
 * (requestOwnedLessonHelp in ./lesson-help.ts). A reply is shown, and
 * handed to `onHelp`, only while that student has been on the page
 * throughout; `keepHelp` records it for them whatever has happened since.
 * When the page changes hands the buttons let go of the previous student's
 * replies at once, so the next student starts with none of them and never
 * sends them along as hints already given.
 */

import { useEffect, useRef, useState } from 'react';
import { useT } from '../../lib/i18n/react';
import { getLocale } from '../../lib/i18n/locale';
import type { LessonHelpKind } from '../../lib/learning/contracts/ai';
import { MAX_HINTS_PER_ITEM } from '../../lib/learning/contracts/ai';
import type { AssistanceLevel } from '../../lib/learning/contracts/evidence';
import type { CacheOwner } from '../../lib/learning/contracts/sync';
import type { LessonHelpItemRef } from '../../lib/tutor/schema';
import {
  bindToCurrentOwner,
  currentOwner,
  onOwnerChange,
  ownerNamespace,
  type OwnerBinding,
} from '../../lib/store-owner';
import { askContext } from './learning-versions';
import { HELP_SOURCE_NOTE, requestOwnedLessonHelp, type HelpResult } from './lesson-help';

const KIND_LABEL: Readonly<Record<LessonHelpKind, string>> = {
  hint: 'Give me a hint',
  explain: 'Explain this differently',
  example: 'Show me an example',
};

interface Props {
  lessonKey: string;
  blockId: string;
  lessonTitle?: string;
  blockHeading: string;
  blockText: string;
  item?: LessonHelpItemRef;
  question?: string;
  officialExplanation?: string;
  /** Whether the student has actually answered this yet. An explanation
      before an attempt is served as a hint, which is the teaching rule:
      guide toward the answer, never hand it over first. */
  attempted: boolean;
  /** Which kinds to offer here. Order is kept. */
  kinds: readonly LessonHelpKind[];
  assistance: AssistanceLevel;
  /** Told what the reply moved this item to, so the surface can record it.
      Only while the student who pressed has been on the page throughout:
      after an account change it is never called, so a surface that records
      against whoever is on the page cannot put one student's help on
      another's work. */
  onHelp?: (result: HelpResult) => void;
  /** Keep the reply for `owner`, the student who pressed, whoever is on the
      page by the time it lands. Runs for every reply. A surface that keeps
      help across an account change writes it here, through a writer that
      takes that owner. */
  keepHelp?: (result: HelpResult, owner: CacheOwner) => void;
  /** True while a timed check is running: the controls are not rendered. */
  underAssessment?: boolean;
  /** A quieter row, for a control sitting inside a question card. */
  inline?: boolean;
}

export default function LessonHelpControls({
  lessonKey,
  blockId,
  lessonTitle,
  blockHeading,
  blockText,
  item,
  question,
  officialExplanation,
  attempted,
  kinds,
  assistance,
  onHelp,
  keepHelp,
  underAssessment,
  inline,
}: Props) {
  const { t } = useT();
  const [replies, setReplies] = useState<HelpResult[]>([]);
  const [busy, setBusy] = useState<LessonHelpKind | null>(null);
  /* The request on its way, and whose replies are on screen (as
     ownerNamespace spells an owner). Refs, so the owner-change listener,
     which is subscribed once, can read them. */
  const asking = useRef<OwnerBinding | null>(null);
  const repliesFor = useRef<string | null>(null);

  /* The page changed hands, here or in another tab. The replies on screen,
     and a request still on its way, were the previous student's: none of
     it stays. A request let go of here is still kept for its own student
     (keepHelp), it is just never shown. The same owner being told its
     stores changed replaces nothing. */
  useEffect(() => {
    const stop = onOwnerChange(() => {
      const held = repliesFor.current;
      if (held === null || held === ownerNamespace(currentOwner())) return;
      asking.current?.cancel();
      asking.current = null;
      repliesFor.current = null;
      setReplies([]);
      setBusy(null);
    });
    return () => {
      stop();
    };
  }, []);

  /* No help inside a timed check. The Worker refuses as well; this is the
     door the student never sees. */
  if (underAssessment) return null;

  const hintsGiven = replies.filter((reply) => reply.kind === 'hint').length;
  const previousHints = replies.map((reply) => reply.text);
  const offered = kinds.filter((kind) => (kind === 'hint' ? hintsGiven < MAX_HINTS_PER_ITEM : true));

  async function ask(kind: LessonHelpKind) {
    if (busy) return;
    /* Bound to the student on the page NOW, before anything is sent. */
    const binding = bindToCurrentOwner();
    const mine = ownerNamespace(binding.owner);
    /* Replies left from somebody else (an account change this screen was
       never told about) are not this student's hints to send along. */
    const hints = repliesFor.current === null || repliesFor.current === mine ? previousHints : [];
    if (repliesFor.current !== null && repliesFor.current !== mine) setReplies([]);
    repliesFor.current = mine;
    asking.current = binding;
    setBusy(kind);
    const context = askContext();
    try {
      await requestOwnedLessonHelp(
        binding,
        {
          kind,
          lessonKey,
          blockId,
          lessonTitle,
          blockHeading,
          blockText,
          item,
          question,
          officialExplanation,
          attempted,
          previousHints: hints,
          assistanceSoFar: assistance,
          versions: context.versions,
          sessionId: context.sessionId,
          locale: getLocale(),
        },
        {
          keep: (result, owner) => keepHelp?.(result, owner),
          show: (result) => {
            setReplies((held) => [...held, result]);
            onHelp?.(result);
          },
          hide: () => {
            repliesFor.current = null;
            setReplies([]);
          },
        },
      );
    } finally {
      /* The request is over, whatever its outcome: stop watching for owner
         changes on its behalf. Busy is cleared only by the request the
         buttons are still waiting for; one let go of at an account change
         has already cleared it. */
      binding.cancel();
      if (asking.current === binding) {
        asking.current = null;
        setBusy(null);
      }
    }
  }

  return (
    <div className={`help-controls${inline ? ' is-inline' : ''}`}>
      <div className="help-controls-row">
        {offered.map((kind) => (
          <button
            key={kind}
            type="button"
            className="help-control"
            disabled={busy !== null}
            onClick={() => void ask(kind)}
          >
            {busy === kind ? t('Asking Mr EZ...') : t(KIND_LABEL[kind])}
          </button>
        ))}
      </div>
      {replies.length > 0 && (
        <div className="help-replies" aria-live="polite">
          {replies.map((reply, index) => (
            <div key={index} className={`help-reply is-${reply.source}`}>
              <p className="help-reply-text">{reply.text}</p>
              {HELP_SOURCE_NOTE[reply.source] && (
                <p className="help-reply-note">
                  {t(HELP_SOURCE_NOTE[reply.source])}
                  {reply.unavailableReason ? ` ${reply.unavailableReason}` : ''}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
