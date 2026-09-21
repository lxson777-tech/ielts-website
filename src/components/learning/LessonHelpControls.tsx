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
 */

import { useState } from 'react';
import { useT } from '../../lib/i18n/react';
import { getLocale } from '../../lib/i18n/locale';
import type { LessonHelpKind } from '../../lib/learning/contracts/ai';
import { MAX_HINTS_PER_ITEM } from '../../lib/learning/contracts/ai';
import type { AssistanceLevel } from '../../lib/learning/contracts/evidence';
import type { LessonHelpItemRef } from '../../lib/tutor/schema';
import { askContext } from './learning-versions';
import { HELP_SOURCE_NOTE, requestLessonHelp, type HelpResult } from './lesson-help';

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
  /** Told what the reply moved this item to, so the surface can record it. */
  onHelp?: (result: HelpResult) => void;
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
  underAssessment,
  inline,
}: Props) {
  const { t } = useT();
  const [replies, setReplies] = useState<HelpResult[]>([]);
  const [busy, setBusy] = useState<LessonHelpKind | null>(null);

  /* No help inside a timed check. The Worker refuses as well; this is the
     door the student never sees. */
  if (underAssessment) return null;

  const hintsGiven = replies.filter((reply) => reply.kind === 'hint').length;
  const previousHints = replies.map((reply) => reply.text);
  const offered = kinds.filter((kind) => (kind === 'hint' ? hintsGiven < MAX_HINTS_PER_ITEM : true));

  async function ask(kind: LessonHelpKind) {
    if (busy) return;
    setBusy(kind);
    const context = askContext();
    try {
      const result = await requestLessonHelp({
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
        previousHints,
        assistanceSoFar: assistance,
        versions: context.versions,
        sessionId: context.sessionId,
        locale: getLocale(),
      });
      setReplies((held) => [...held, result]);
      onHelp?.(result);
    } finally {
      setBusy(null);
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
