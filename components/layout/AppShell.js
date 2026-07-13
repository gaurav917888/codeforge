'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Code2, Database, Home } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthGate';
import { getAvatar } from '@/lib/userProfile';

function AvatarBtn({ profile, user }) {
  const name = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'You';
  const av = getAvatar(profile?.avatar_style);
  return (
    <Link
      href="/profile"
      className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full transition-all hover:opacity-85"
      style={{ border: '1.5px solid var(--border-color)', background: 'var(--bg-surface)' }}
      title="Profile"
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0"
        style={{ background: av.bg }}
      >
        {av.emoji}
      </div>
      <span className="hidden sm:inline text-sm font-semibold truncate max-w-[100px]">{name}</span>
    </Link>
  );
}

export default function AppShell({ children, title = 'XPro' }) {
  const { user, profile } = useAuth();
  const pathname = usePathname();

  const navLinks = [
    { href: '/', icon: <Home size={15} />, label: 'Dashboard' },
    { href: '/tools/codeforge', icon: <Code2 size={15} />, label: 'CodeForge' },
    { href: '/tools/vaultx', icon: <Database size={15} />, label: 'VaultX' },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-main)', color: 'var(--text-main)' }}>
      <header className="sticky top-0 z-50 glass-strong">
        <div className="mx-auto flex max-w-7xl items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5">
          <Link href="/" className="font-heading text-xl sm:text-2xl flex-shrink-0" style={{ color: 'var(--accent-red)' }}>
            {title}
          </Link>

          {/* Desktop nav */}
          <nav className="ml-2 hidden items-center gap-1 sm:flex">
            {navLinks.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className="xpro-nav-btn"
                  style={active ? { color: 'var(--accent-red)', borderColor: 'var(--accent-red)', background: 'var(--accent-soft)' } : {}}
                >
                  {l.icon}{l.label}
                </Link>
              );
            })}
          </nav>

          {/* Mobile nav icons */}
          <nav className="ml-2 flex items-center gap-1 sm:hidden">
            {navLinks.slice(1).map((l) => (
              <Link key={l.href} href={l.href} className="xpro-icon-btn" aria-label={l.label}>{l.icon}</Link>
            ))}
          </nav>

          {/* Avatar — always far right, links to /profile */}
          <div className="ml-auto">
            <AvatarBtn profile={profile} user={user} />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
