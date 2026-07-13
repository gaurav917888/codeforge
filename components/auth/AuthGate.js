'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Settings, X, Check } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { AVATARS, getAvatar, loadProfile, upsertProfile, resolveDark } from '@/lib/userProfile';
import { THEME_LIST, applyTheme, THEMES } from '@/lib/themes';

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthGate');
  return ctx;
}

/* ── helper: get system dark preference ───────────────────── */
function getSystemDark() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/* ── read / write pre-auth preferences from localStorage ─── */
function readPreAuthPrefs() {
  try {
    return JSON.parse(localStorage.getItem('xpro_preauth') || '{}');
  } catch { return {}; }
}
function writePreAuthPrefs(obj) {
  try { localStorage.setItem('xpro_preauth', JSON.stringify(obj)); } catch { /* noop */ }
}

/* ════════════════ CONFIG MISSING SCREEN ═══════════════════ */
function ConfigMissing() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg-main)' }}>
      <div className="w-full max-w-lg rounded-2xl p-8 glass" style={{ boxShadow: 'var(--shadow-lg)' }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6 mx-auto accent-bg">
          <span style={{ fontSize: 28 }}>⚙️</span>
        </div>
        <h1 className="text-3xl font-heading text-center mb-3">XPro setup needed</h1>
        <p className="text-sm text-center mb-6" style={{ color: 'var(--text-muted)' }}>
          Add these Supabase environment variables before using the app.
        </p>
        <div className="rounded-xl p-4 text-sm font-mono space-y-2" style={{ background: 'var(--bg-main)', border: '1px solid var(--border-color)' }}>
          <div>NEXT_PUBLIC_SUPABASE_URL=https://YOUR_REF.supabase.co</div>
          <div>NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY</div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════ LOGIN SCREEN ════════════════════════════ */
function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  /* pre-auth prefs (applied immediately, synced to DB after login) */
  const prefs = readPreAuthPrefs();
  const [themeMode, setThemeModeState] = useState(prefs.themeMode || 'system');
  const [themeId, setThemeIdState] = useState(prefs.themeId || 'terra');
  const sysDark = getSystemDark();
  const dark = resolveDark({ theme_mode: themeMode }, sysDark);

  useEffect(() => {
    applyTheme(themeId, dark);
  }, [themeId, dark]);

  const setThemeMode = (v) => {
    setThemeModeState(v);
    writePreAuthPrefs({ ...readPreAuthPrefs(), themeMode: v });
  };
  const setThemeId = (v) => {
    setThemeIdState(v);
    writePreAuthPrefs({ ...readPreAuthPrefs(), themeId: v });
  };

  const signIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) { setLoading(false); alert(error.message); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative" style={{ background: 'var(--bg-main)' }}>
      {/* Settings button — top right */}
      <button
        onClick={() => setSettingsOpen((p) => !p)}
        className="absolute top-4 right-4 p-2.5 rounded-xl transition-all"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}
        title="Appearance settings"
      >
        <Settings size={18} />
      </button>

      {/* Settings Panel */}
      {settingsOpen && (
        <div
          className="absolute top-16 right-4 w-80 rounded-2xl p-5 fade-in z-50"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-lg)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-lg">Appearance</h3>
            <button onClick={() => setSettingsOpen(false)} style={{ color: 'var(--text-muted)' }}><X size={16} /></button>
          </div>

          {/* Theme mode */}
          <label className="text-xs font-semibold uppercase tracking-wide mb-2 block" style={{ color: 'var(--text-muted)' }}>Display</label>
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[{ id: 'light', label: '☀️ Light' }, { id: 'dark', label: '🌙 Dark' }, { id: 'system', label: '💻 System' }].map((m) => (
              <button
                key={m.id}
                onClick={() => setThemeMode(m.id)}
                className="py-2 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: themeMode === m.id ? 'var(--accent-soft)' : 'var(--bg-main)',
                  border: `1.5px solid ${themeMode === m.id ? 'var(--accent-red)' : 'var(--border-color)'}`,
                  color: themeMode === m.id ? 'var(--accent-red)' : 'var(--text-muted)',
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Accent theme */}
          <label className="text-xs font-semibold uppercase tracking-wide mb-2 block" style={{ color: 'var(--text-muted)' }}>Accent Color</label>
          <div className="grid grid-cols-3 gap-2">
            {THEME_LIST.map((t) => (
              <button
                key={t.id}
                onClick={() => setThemeId(t.id)}
                className="flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: 'var(--bg-main)',
                  border: `1.5px solid ${themeId === t.id ? t.accent : 'var(--border-color)'}`,
                }}
              >
                <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: t.gradient || t.accent }} />
                <span className="truncate">{t.name}</span>
                {themeId === t.id && <Check size={10} style={{ color: t.accent, flexShrink: 0 }} />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Login Card */}
      <div className="w-full max-w-md rounded-2xl p-8 sm:p-10 fade-in glass" style={{ boxShadow: 'var(--shadow-lg)' }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto accent-bg">
          <span style={{ fontSize: 32 }}>✨</span>
        </div>
        <h1 className="text-4xl font-heading text-center mb-2">XPro Tool</h1>
        <p className="text-center mb-8 text-sm" style={{ color: 'var(--text-muted)' }}>
          Sign in once to access CodeForge and VaultX.
        </p>
        <button
          onClick={signIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl font-semibold accent-bg text-white transition-all hover:opacity-90 disabled:opacity-60"
        >
          {loading ? (
            <div className="spinner" style={{ borderTopColor: 'white' }} />
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </>
          )}
        </button>
        <p className="text-xs text-center mt-6" style={{ color: 'var(--text-muted)' }}>
          Secured by Supabase · All data private & encrypted
        </p>
      </div>
    </div>
  );
}

/* ════════════════ LOGOUT CONFIRM ══════════════════════════ */
export function LogoutConfirm({ onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 fade-in" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={onCancel}>
      <div className="w-full max-w-sm rounded-2xl p-6 slide-up" style={{ background: 'var(--bg-surface)', boxShadow: 'var(--shadow-lg)' }} onClick={(e) => e.stopPropagation()}>
        <h2 className="font-heading text-xl mb-2">Are you sure you want to log out?</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
          You&apos;ll need to sign in again with Google to access your workspace.
        </p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-semibold" style={{ background: 'var(--bg-hover)', color: 'var(--text-main)' }}>
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ background: '#dc2626' }}>
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════ AUTHGATE ════════════════════════════════ */
export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [profile, setProfile] = useState(null);
  const sysMQRef = useRef(null);

  /* apply theme from profile or pre-auth prefs */
  const applyFromProfile = useCallback((prof) => {
    applyTheme(prof?.app_theme_id || 'terra', resolveDark(prof, getSystemDark()));
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) { setChecking(false); return; }

    supabase.auth.getSession().then(async ({ data }) => {
      const sess = data.session;
      setSession(sess);
      if (sess?.user) {
        /* upsert user_profile on every login — prevents duplicate records */
        const preAuth = readPreAuthPrefs();
        await upsertProfile(supabase, sess.user.id, {
          app_theme_id: preAuth.themeId || 'terra',
          theme_mode: preAuth.themeMode || 'system',
        });
        const prof = await loadProfile(supabase, sess.user.id);
        setProfile(prof);
        applyFromProfile(prof);
      } else {
        /* apply pre-auth prefs */
        const prefs = readPreAuthPrefs();
        applyTheme(prefs.themeId || 'terra', resolveDark({ theme_mode: prefs.themeMode }, getSystemDark()));
      }
      setChecking(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user) {
        const prof = await loadProfile(supabase, nextSession.user.id);
        setProfile(prof);
        applyFromProfile(prof);
      } else {
        setProfile(null);
      }
    });

    /* watch system colour scheme changes */
    sysMQRef.current = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSysDark = () => {
      setProfile((prev) => {
        if (!prev || prev.theme_mode === 'system') applyTheme(prev?.app_theme_id || 'terra', getSystemDark());
        return prev;
      });
    };
    sysMQRef.current.addEventListener('change', handleSysDark);
    return () => {
      sub.subscription.unsubscribe();
      sysMQRef.current?.removeEventListener('change', handleSysDark);
    };
  }, [applyFromProfile]);

  const updateProfile = useCallback(async (updates) => {
    if (!session?.user) return;
    const { data } = await upsertProfile(supabase, session.user.id, updates);
    if (data) {
      setProfile(data);
      applyFromProfile(data);
    }
    return data;
  }, [session, applyFromProfile]);

  const signOut = useCallback(() => supabase.auth.signOut(), []);

  const value = useMemo(() => ({
    session,
    user: session?.user || null,
    profile,
    updateProfile,
    signOut,
  }), [session, profile, updateProfile, signOut]);

  if (!isSupabaseConfigured) return <ConfigMissing />;
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-main)' }}>
        <div className="spinner" />
      </div>
    );
  }
  if (!session) return <LoginScreen />;
  return <AuthContext.Provider value={value}>{children(value)}</AuthContext.Provider>;
}
