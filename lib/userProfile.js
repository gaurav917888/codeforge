// User profile helpers – avatar definitions + Supabase CRUD

export const AVATARS = [
  { id: 'fox',      emoji: '🦊', label: 'Fox',       bg: 'linear-gradient(135deg,#FF6B35,#F7931E)' },
  { id: 'owl',      emoji: '🦉', label: 'Owl',       bg: 'linear-gradient(135deg,#5C4B99,#8B5CF6)' },
  { id: 'cat',      emoji: '🐱', label: 'Cat',       bg: 'linear-gradient(135deg,#FF9F43,#FECA57)' },
  { id: 'wolf',     emoji: '🐺', label: 'Wolf',      bg: 'linear-gradient(135deg,#576CBC,#60A5FA)' },
  { id: 'bear',     emoji: '🐻', label: 'Bear',      bg: 'linear-gradient(135deg,#8B5E3C,#A0785A)' },
  { id: 'dragon',   emoji: '🐉', label: 'Dragon',    bg: 'linear-gradient(135deg,#E74C3C,#FF6B6B)' },
  { id: 'rabbit',   emoji: '🐰', label: 'Rabbit',    bg: 'linear-gradient(135deg,#EC4899,#F472B6)' },
  { id: 'panda',    emoji: '🐼', label: 'Panda',     bg: 'linear-gradient(135deg,#374151,#6B7280)' },
  { id: 'tiger',    emoji: '🐯', label: 'Tiger',     bg: 'linear-gradient(135deg,#D97706,#F59E0B)' },
  { id: 'lion',     emoji: '🦁', label: 'Lion',      bg: 'linear-gradient(135deg,#D97706,#EF4444)' },
  { id: 'penguin',  emoji: '🐧', label: 'Penguin',   bg: 'linear-gradient(135deg,#2563EB,#0EA5E9)' },
  { id: 'koala',    emoji: '🐨', label: 'Koala',     bg: 'linear-gradient(135deg,#6B7280,#9CA3AF)' },
  { id: 'unicorn',  emoji: '🦄', label: 'Unicorn',   bg: 'linear-gradient(135deg,#7C3AED,#EC4899)' },
  { id: 'rocket',   emoji: '🚀', label: 'Rocket',    bg: 'linear-gradient(135deg,#0D9488,#06B6D4)' },
  { id: 'ninja',    emoji: '🥷', label: 'Ninja',     bg: 'linear-gradient(135deg,#111827,#374151)' },
];

export function getAvatar(id) {
  return AVATARS.find((a) => a.id === id) || AVATARS[0];
}

/** Load profile row for a user */
export async function loadProfile(supabase, userId) {
  const { data } = await supabase
    .from('user_profile')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return data;
}

/** Upsert profile (creates on first login, updates thereafter) */
export async function upsertProfile(supabase, userId, updates) {
  const { data, error } = await supabase
    .from('user_profile')
    .upsert(
      { user_id: userId, ...updates, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    )
    .select()
    .single();
  return { data, error };
}

/** Resolve effective dark mode from profile + system preference */
export function resolveDark(profile, systemDark) {
  const mode = profile?.theme_mode || 'system';
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return systemDark; // 'system'
}
