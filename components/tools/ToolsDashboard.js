'use client';

import Link from 'next/link';
import { Code2, Database, Sparkles } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';
import { useAuth } from '@/components/auth/AuthGate';
import { getAvatar } from '@/lib/userProfile';

function ToolCard({ href, icon, title, description, cta, badge }) {
  return (
    <Link href={href} className="group rounded-2xl p-6 sm:p-8 card-hover glass flex flex-col" style={{ boxShadow: 'var(--shadow-lg)' }}>
      <div className="mb-5 flex items-center gap-3">
        <div className="h-14 w-14 flex items-center justify-center rounded-2xl accent-bg text-white transition-transform group-hover:scale-105 flex-shrink-0">
          {icon}
        </div>
        {badge && (
          <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: 'var(--accent-soft)', color: 'var(--accent-red)' }}>
            {badge}
          </span>
        )}
      </div>
      <h2 className="font-heading text-2xl sm:text-3xl mb-2">{title}</h2>
      <p className="text-sm leading-6 mb-6 flex-1" style={{ color: 'var(--text-muted)' }}>{description}</p>
      <span className="inline-flex self-start rounded-xl px-4 py-2 text-sm font-semibold text-white accent-bg">{cta}</span>
    </Link>
  );
}

export default function ToolsDashboard() {
  const { user, profile } = useAuth();
  const name = profile?.display_name
    || user?.user_metadata?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'Creator';
  const av = getAvatar(profile?.avatar_style);

  return (
    <AppShell title="XPro">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:py-14">

        {/* Hero */}
        <section className="mb-8 rounded-2xl p-6 sm:p-10 glass" style={{ boxShadow: 'var(--shadow-lg)' }}>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0" style={{ background: av.bg }}>
              {av.emoji}
            </div>
            <div>
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-1" style={{ background: 'var(--accent-soft)', color: 'var(--accent-red)' }}>
                <Sparkles size={12} /> Single Sign-On Workspace
              </div>
              <h1 className="font-heading text-3xl sm:text-5xl">Welcome, {name}</h1>
            </div>
          </div>
          <p className="max-w-2xl text-sm sm:text-base leading-7 mt-2" style={{ color: 'var(--text-muted)' }}>
            One login, two powerful tools — CodeForge for building and VaultX for organizing.
          </p>
        </section>

        {/* Tools grid */}
        <section className="grid gap-5 sm:grid-cols-2">
          <ToolCard
            href="/tools/codeforge"
            icon={<Code2 size={28} />}
            title="CodeForge"
            description="Build, preview, format, and export front-end projects — HTML, CSS, and JavaScript editor with live preview, auto-save, recent projects, and keyboard shortcuts."
            cta="Open CodeForge"
          />
          <ToolCard
            href="/tools/vaultx"
            icon={<Database size={28} />}
            title="VaultX"
            description="Organize your files, media, and knowledge. Nested folders, image & video viewers, search, tags, themes, and 5 GB of secure cloud storage."
            cta="Open VaultX"
          />
        </section>
      </main>
    </AppShell>
  );
}
