'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Sidebar } from '@/components/Sidebar';
import { PostComposer } from '@/components/PostComposer';

export default function MainLayout({ children }: { children: ReactNode }) {
  const { firebaseUser, loading } = useAuth();
  const router = useRouter();
  const [composerOpen, setComposerOpen] = useState(false);

  useEffect(() => {
    if (!loading && !firebaseUser) router.replace('/login');
  }, [loading, firebaseUser, router]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-text-secondary">読み込み中...</div>;
  }
  if (!firebaseUser) return null;

  return (
    <div className="grid grid-cols-[260px_1fr] max-w-[1100px] mx-auto min-h-screen">
      <Sidebar onCompose={() => setComposerOpen(true)} />
      <main className="border-r border-border min-w-0">{children}</main>
      <PostComposer open={composerOpen} onClose={() => setComposerOpen(false)} />
    </div>
  );
}
