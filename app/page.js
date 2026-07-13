'use client';

import AuthGate from '@/components/auth/AuthGate';
import ToolsDashboard from '@/components/tools/ToolsDashboard';

export default function HomePage() {
  return <AuthGate>{() => <ToolsDashboard />}</AuthGate>;}