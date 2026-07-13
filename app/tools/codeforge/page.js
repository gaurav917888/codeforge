'use client';

import AuthGate from '@/components/auth/AuthGate';
import CodeForgeApp from '@/components/codeforge/CodeForgeApp';

export default function CodeForgePage() {
  return <AuthGate>{() => <CodeForgeApp />}</AuthGate>;
}