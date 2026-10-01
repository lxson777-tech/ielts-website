/* The invitation above a free page's list (the lesson library) for a visitor
   who is not signed in, in the gated build. Nothing for anyone signed in,
   and nothing while the account is still being checked. */

import { useAccessTier } from '../../lib/access/tier';
import LessonInvite from './LessonInvite';

export default function SignedOutInvite({ title }: { title: string }) {
  const tier = useAccessTier();
  if (tier !== 'signed-out') return null;
  return <LessonInvite title={title} what="page" />;
}
