import { User } from '@supabase/supabase-js';

import { supabase } from '@/src/shared/supabase-client';

export type Profile = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string | null;
};

const resolveDisplayName = (user: User) => {
  const metadataName = typeof user.user_metadata?.full_name === 'string'
    ? user.user_metadata.full_name.trim()
    : '';
  if (metadataName) {
    return metadataName;
  }
  const emailHandle = user.email?.split('@')[0];
  if (emailHandle && emailHandle.length > 0) {
    return emailHandle;
  }
  return 'Player';
};

export async function ensureProfile(user: User) {
  const profileId = user.id;

  const { error: upsertError } = await supabase
    .from('profiles')
    .upsert(
      {
        user_id: profileId,
        display_name: resolveDisplayName(user),
        avatar_url: user.user_metadata?.avatar_url ?? null,
      },
      { onConflict: 'user_id' },
    );

  if (upsertError) {
    throw upsertError;
  }
}

export async function fetchCurrentProfile() {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  const userId = session?.user?.id;
  if (!userId) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle<Profile>();

  if (error) {
    throw error;
  }

  return data;
}
