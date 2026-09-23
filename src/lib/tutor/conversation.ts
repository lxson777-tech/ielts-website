/* Keeping a conversation alive, and being able to end it for good.

   Two layers, on purpose:

   - sessionStorage holds the turns for THIS browsing session, so opening the
     panel on a lesson page shows the conversation that started on the
     dashboard. The workspace already navigates client-side with the panel
     persisted, so this layer mostly matters for a hard reload or a page
     opened in a new tab.
   - Supabase holds the durable copy. The browser reads it back under
     row-level security (a student can only ever select their own rows), so
     restoring a conversation costs nothing and involves no AI.

   Clearing removes BOTH, plus the rolling summary on the conversation row,
   the cached dashboard welcome, and every note Mr EZ has written about a week
   or a course unit. Anything that is his words about the student goes; the
   student's own record stays. It does not touch a single result: bands,
   essays and test attempts live in `user_state.progress` and are a separate
   record with a separate lifetime. The UI says so in those words, because a
   student who clears a chat and loses their score history would never trust
   the button again.

   ONE STUDENT'S CONVERSATION PER KEY (follow-up to Codex R2E-02, 23
   September 2026). The session copy used to sit under one key with nobody's
   name on it, so after an account change in this tab, or in another one,
   the next student opened the panel on the last student's conversation,
   and a reload served it back to them. It now lives under the owner's own
   key (scopedKeyFor in src/lib/store-owner.ts, the same shape every other
   store uses), and every read and write here names the owner it is for,
   defaulting to the current one. The old unowned key is never read again:
   there is no way to know whose it was, and the durable copy in the
   account restores a signed-in student's conversation anyway. Clearing
   removes it as well. The durable copy is restored only for the student it
   belongs to (restoreLatestConversation below). */

import { getSupabase } from '../auth/supabase';
import { t, tn } from '../i18n/translate';
import { currentOwner, scopedKeyFor } from '../store-owner';
import type { CacheOwner } from '../learning/contracts/sync';
import type { TutorMood, TutorRecommendation } from './schema';

/** The base key. Never used on its own any more: see conversationKey. */
export const CONVERSATION_SESSION_KEY = 'ielts.mrez.conversation.v1';

/** Where one student's conversation is kept in this tab's session storage. */
export function conversationKey(owner: CacheOwner): string {
  return scopedKeyFor(CONVERSATION_SESSION_KEY, owner);
}

export interface ChatTurn {
  id: string;
  role: 'student' | 'tutor';
  text: string;
  at: string;
  recommendation?: TutorRecommendation | null;
  mood?: TutorMood;
  /** False for a clearly-labelled simulated reply. */
  live?: boolean;
  /** Set on a turn that failed, so the panel can offer a retry in place. */
  failed?: boolean;
}

export interface ConversationState {
  conversationId: string | null;
  turns: ChatTurn[];
}

export const EMPTY_CONVERSATION: ConversationState = { conversationId: null, turns: [] };

/** `owner`'s conversation in this tab, the current owner's when left out. */
export function loadConversation(owner?: CacheOwner): ConversationState {
  if (typeof window === 'undefined') return { ...EMPTY_CONVERSATION };
  try {
    const raw = window.sessionStorage.getItem(conversationKey(owner ?? currentOwner()));
    if (!raw) return { ...EMPTY_CONVERSATION };
    const parsed = JSON.parse(raw) as ConversationState;
    if (!Array.isArray(parsed?.turns)) return { ...EMPTY_CONVERSATION };
    return { conversationId: parsed.conversationId ?? null, turns: parsed.turns };
  } catch {
    return { ...EMPTY_CONVERSATION };
  }
}

/** Keep `state` as `owner`'s conversation. The panel always names the
    owner the conversation on its screen belongs to, never "whoever is
    current by the time this runs": a save can run a moment after the
    account changed. Left out, the current owner. */
export function saveConversation(state: ConversationState, owner?: CacheOwner): void {
  try {
    // A turn that failed is a question that was never answered. Its retry
    // button lives in the panel's in-memory error state, which a reload
    // throws away, so persisting the turn itself would leave a greyed-out
    // ghost message with no explanation beside it and no way to send it
    // again. Drop it: the student's draft is gone either way, and a clean
    // conversation is more honest than a dead one.
    const durable: ConversationState = { ...state, turns: state.turns.filter((t) => !t.failed) };
    window.sessionStorage.setItem(conversationKey(owner ?? currentOwner()), JSON.stringify(durable));
  } catch {
    /* storage blocked — the conversation just won't survive a reload */
  }
}

/** Forget `owner`'s conversation in this tab (the current owner's when left
    out), and the old unowned copy with it, which nothing reads any more. */
export function clearLocalConversation(owner?: CacheOwner): void {
  try {
    window.sessionStorage.removeItem(conversationKey(owner ?? currentOwner()));
    window.sessionStorage.removeItem(CONVERSATION_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/** `owner`'s most recent conversation (the current owner's when left out),
    read straight from Supabase under RLS. Returns null when accounts are
    off, nobody is signed in, or there is nothing stored, all of which are
    "start fresh", not errors.
 *
 * Also null when the session this browser holds is not `owner`'s, before
 * the rows are read or after: the rows come back for whoever the session
 * belongs to at that moment, and another tab can change that. A student is
 * only ever given their own conversation back. */
export async function restoreLatestConversation(owner?: CacheOwner): Promise<ConversationState | null> {
  const forOwner = owner ?? currentOwner();
  if (forOwner.kind !== 'user') return null;
  const sb = getSupabase();
  if (!sb) return null;
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user || auth.user.id !== forOwner.userId) return null;

  const { data: conversations, error } = await sb
    .from('mr_ez_conversations')
    .select('id')
    .order('updated_at', { ascending: false })
    .limit(1);
  if (error || !conversations?.length) return null;

  const conversationId = conversations[0].id as string;
  const { data: messages } = await sb
    .from('mr_ez_messages')
    .select('id, role, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(60);

  /* Read again, from this browser's own copy (no network): if the session
     changed hands while the rows were being read, they may not be this
     student's. */
  const { data: held } = await sb.auth.getSession();
  if (held.session?.user.id !== forOwner.userId) return null;

  return {
    conversationId,
    turns: (messages ?? []).map((m) => ({
      id: m.id as string,
      role: m.role === 'tutor' ? 'tutor' : 'student',
      text: m.content as string,
      at: m.created_at as string,
    })),
  };
}

export interface ClearResult {
  ok: boolean;
  /** What was actually removed, for the confirmation line. */
  conversations: number;
  message: string;
}

/** Delete every conversation, every message in them, the rolling summaries,
    and the cached dashboard welcome. Deletes run under the student's own
    session, so this is enforced by row-level security rather than by us
    remembering to filter — a student can only ever delete their own. */
export async function clearTutorMemory(): Promise<ClearResult> {
  clearLocalConversation();

  const sb = getSupabase();
  if (!sb) {
    return { ok: true, conversations: 0, message: t('Cleared on this device. Nothing was stored in the cloud.') };
  }
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) {
    return { ok: true, conversations: 0, message: t('Cleared on this device.') };
  }

  // Messages first: the cascade would take them anyway, but deleting them
  // explicitly means a partial failure leaves no orphaned message rows.
  const messages = await sb.from('mr_ez_messages').delete().eq('user_id', auth.user.id);
  const conversations = await sb.from('mr_ez_conversations').delete().eq('user_id', auth.user.id).select('id');
  // The cached welcome is Mr EZ's own words about this student, so it goes
  // with the rest of his memory rather than surviving as a stale greeting.
  const recommendations = await sb.from('mr_ez_recommendations').delete().eq('user_id', auth.user.id);
  // His weekly reviews and unit notes are the same kind of thing as the
  // welcome: Mr EZ's own words about this student, saved so re-opening a page
  // costs nothing. They go with the rest of his memory rather than surviving
  // as an old opinion the student thought they had deleted.
  const notes = await sb.from('mr_ez_notes').delete().eq('user_id', auth.user.id);
  // The usage rows stay: they are what the daily spending limit is counted
  // from, and letting a student delete them would let them reset their own
  // cap. What does NOT stay is the copy of Mr EZ's reply each one carries as
  // a repeat-send cache, because that is conversation content. A
  // column-scoped grant in supabase/schema.sql lets a student blank exactly
  // that one column on exactly their own rows, and nothing else.
  const replies = await sb.from('mr_ez_turns').update({ reply: null }).eq('user_id', auth.user.id);

  const failed = messages.error || conversations.error || recommendations.error || notes.error || replies.error;
  if (failed) {
    return {
      ok: false,
      conversations: 0,
      message: t('Some of it could not be cleared just now. Try again in a moment.'),
    };
  }

  const count = conversations.data?.length ?? 0;
  return {
    ok: true,
    conversations: count,
    message:
      count > 0
        ? tn(count, {
            one: 'Cleared {count} conversation, everything Mr EZ had summarised from it, his saved welcome, and his weekly reviews and unit notes. Your lessons, test scores and marked work are untouched.',
            other:
              'Cleared {count} conversations, everything Mr EZ had summarised from them, his saved welcome, and his weekly reviews and unit notes. Your lessons, test scores and marked work are untouched.',
          }, { count })
        : t(
            'Cleared his saved welcome and any weekly reviews and unit notes. There were no conversations stored. Your lessons, test scores and marked work are untouched.',
          ),
  };
}
