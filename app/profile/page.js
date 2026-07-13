'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Code2, Database, Home, LogOut, Mail } from 'lucide-react';
import AuthGate, { useAuth, LogoutConfirm } from '@/components/auth/AuthGate';
import AppShell from '@/components/layout/AppShell';
import { AVATARS, getAvatar } from '@/lib/userProfile';
import { THEME_LIST } from '@/lib/themes';

/* ── Avatar Picker ─────────────────────────────────────── */
function AvatarPicker({ current, onChange }) {
  return (
    <div className="grid grid-cols-5 gap-2 sm:gap-3">
      {AVATARS.map((av) => {
        const isActive = current === av.id;
        return (
          <button
            key={av.id}
            onClick={() => onChange(av.id)}
            title={av.label}
            className="flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all"
            style={{
              border: `2px solid ${isActive ? 'var(--accent-red)' : 'var(--border-color)'}`,
              background: isActive ? 'var(--accent-soft)' : 'var(--bg-main)',
            }}
          >
            <div
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xl sm:text-2xl"
              style={{ background: av.bg }}
            >
              {av.emoji}
            </div>
            <span className="text-xs font-medium truncate w-full text-center">{av.label}</span>
            {isActive && <Check size={10} style={{ color: 'var(--accent-red)' }} />}
          </button>
        );
      })}
    </div>
  );
}

/* ── Profile Content ───────────────────────────────────── */
function ProfileContent() {
  const { user, profile, updateProfile, signOut } = useAuth();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const name = profile?.display_name
    || user?.user_metadata?.full_name
    || user?.email?.split('@')[0]
    || 'XPro User';

  const currentAvatarId = profile?.avatar_style || 'fox';
  const currentAvatar = getAvatar(currentAvatarId);
  const themeMode = profile?.theme_mode || 'system';
  const themeId = profile?.app_theme_id || 'terra';

  const save = async (updates) => {
    setSaving(true);
    await updateProfile(updates);
    setSaving(false);
  };

  return (
    <AppShell title="XPro">
      <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12 space-y-6">

        {/* ── User Card ─────────────────────────────────── */}
        <div className="rounded-2xl p-6 glass" style={{ boxShadow: 'var(--shadow-lg)' }}>
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0"
              style={{ background: currentAvatar.bg, boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }}
            >
              {currentAvatar.emoji}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="font-heading text-3xl sm:text-4xl">{name}</h1>
              <p className="mt-1.5 flex items-center justify-center sm:justify-start gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                <Mail size={14} />{user?.email}
              </p>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                Avatar: {currentAvatar.label}
                {saving && <span className="ml-2 text-xs" style={{ color: 'var(--accent-red)' }}>Saving…</span>}
              </p>
            </div>
          </div>
        </div>

        {/* ── Avatar Picker ─────────────────────────────── */}
        <section className="rounded-2xl p-5 sm:p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
          <h2 className="font-heading text-xl mb-4">Choose Avatar</h2>
          <AvatarPicker
            current={currentAvatarId}
            onChange={(id) => save({ avatar_style: id })}
          />
        </section>

        {/* ── Display Mode ──────────────────────────────── */}
        <section className="rounded-2xl p-5 sm:p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
          <h2 className="font-heading text-xl mb-4">Display</h2>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'light', label: '☀️ Light' },
              { id: 'dark',  label: '🌙 Dark'  },
              { id: 'system',label: '💻 System' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => save({ theme_mode: m.id })}
                className="py-2.5 rounded-xl text-sm font-semibold transition-all"
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
        </section>

        {/* ── Accent Theme ──────────────────────────────── */}
        <section className="rounded-2xl p-5 sm:p-6" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
          <h2 className="font-heading text-xl mb-4">Accent Color</h2>
          <div className="grid grid-cols-3 gap-2">
            {THEME_LIST.map((t) => {
              const active = themeId === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => save({ app_theme_id: t.id })}
                  className="flex items-center gap-3 p-3 rounded-xl transition-all"
                  style={{
                    background: 'var(--bg-main)',
                    border: `2px solid ${active ? t.accent : 'var(--border-color)'}`,
                  }}
                >
                  <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ background: t.gradient || t.accent }} />
                  <div className="text-left flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{t.name}</div>
                    <div className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{t.kind}</div>
                  </div>
                  {active && <Check size={14} style={{ color: t.accent, flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        </section>

        {/* ── Quick Links ───────────────────────────────── */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link className="profile-link" href="/"><Home size={18} />Dashboard</Link>
          <Link className="profile-link" href="/tools/codeforge"><Code2 size={18} />CodeForge</Link>
          <Link className="profile-link" href="/tools/vaultx"><Database size={18} />VaultX</Link>
        </section>

        {/* ── Sign Out ──────────────────────────────────── */}
        <div className="pt-2">
          <button
            onClick={() => setLogoutOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
            style={{ background: '#fef2f2', border: '1.5px solid #fecaca', color: '#dc2626' }}
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </main>

      {logoutOpen && (
        <LogoutConfirm
          onCancel={() => setLogoutOpen(false)}
          onConfirm={() => { setLogoutOpen(false); signOut(); }}
        />
      )}
    </AppShell>
  );
}

export default function ProfilePage() {
  return <AuthGate>{() => <ProfileContent />}</AuthGate>;
}
