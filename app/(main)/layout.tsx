'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Sidebar } from '@/components/Sidebar';
import { ComposerProvider } from '@/components/ComposerProvider';

export default function MainLayout({ children }: { children: ReactNode }) {
  const { firebaseUser, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !firebaseUser) router.replace('/login');
  }, [loading, firebaseUser, router]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-text-secondary">読み込み中...</div>;
  }
  if (!firebaseUser) return null;

  return (
    <ComposerProvider>
      <div className="grid grid-cols-[260px_1fr] max-w-[1100px] mx-auto min-h-screen">
        <Sidebar />
        <main className="border-r border-border min-w-0">{children}</main>
      </div>
    </ComposerProvider>
  );
}
