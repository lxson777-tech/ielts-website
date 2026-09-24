/* The signed-in student's name for the two account menus (WorkspaceMenu,
   AccountMenu): "Signed in as <name>" and the avatar's initials. */

import { useEffect, useState } from 'react';
import { cachedProfile, onProfileChange, type StudentProfile } from '../../lib/auth/profile';

/** Two letters for the avatar: from the student's name when their profile
    is known, otherwise from the email's local part (alex.p@x.com -> AP). */
export function initialsFor(
  email: string | undefined,
  profile?: Pick<StudentProfile, 'firstName' | 'lastName'> | null,
): string {
  const first = profile?.firstName.trim() ?? '';
  const last = profile?.lastName.trim() ?? '';
  if (first) return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase();
  if (!email) return '';
  const local = email.split('@')[0] ?? '';
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return local.slice(0, 2).toUpperCase();
}

/** The profile as this page knows it: the cached copy at once, then
    whatever the profile gate or a form loads or saves. A menu never asks
    the server itself; the gate already does on every ordinary page. The
    cache is keyed by user id, so a previous student's name on a shared
    computer is never shown to the next one. */
export function useKnownProfile(userId: string | null): StudentProfile | null {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  useEffect(() => {
    setProfile(userId ? cachedProfile(userId) : null);
    if (!userId) return;
    return onProfileChange((id, p) => {
      if (id === userId) setProfile(p);
    });
  }, [userId]);
  return profile;
}

export function fullNameOf(profile: StudentProfile | null): string {
  return profile ? `${profile.firstName} ${profile.lastName}`.trim() : '';
}
