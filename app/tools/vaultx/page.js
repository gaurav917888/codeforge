'use client';

import AuthGate from '@/components/auth/AuthGate';
import VaultXTool from '@/components/vaultx/VaultXApp';

export default function VaultXPage() {
  return <AuthGate>{({ session }) => <VaultXTool session={session} />}</AuthGate>;
}