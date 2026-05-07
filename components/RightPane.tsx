'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppUser } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';
import { useFollowing } from '@/lib/useFollowing';
import { followUser } from '@/lib/follows';

const SUGGESTION_LIMIT = 5;

export function RightPane() {
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const followingSet = useFollowing(firebaseUser?.uid);
  const [q, setQ] = useState('');
  const [candidates, setCandidates] = useState<AppUser[] | null>(null);

  // 候補ユーザーを最新10人取得し、自分とフォロー済みを除いて先頭5件表示
  useEffect(() => {
    if (!firebaseUser) return;
    (async () => {
      const snap = await getDocs(query(collection(db(), 'users'), orderBy('createdAt', 'desc'), limit(20)));
      const list = snap.docs.map((d) => d.data() as AppUser);
      setCandidates(list);
    })();
  }, [firebaseUser]);

  const suggested = (candidates ?? [])
    .filter((u) => u.uid !== firebaseUser?.uid && !followingSet.has(u.uid))
    .slice(0, SUGGESTION_LIMIT);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const v = q.trim();
    if (!v) return;
    router.push(`/search?q=${encodeURIComponent(v)}`);
  }

  async function handleFollow(targetUid: string) {
    if (!firebaseUser) return;
    try {
      await followUser(firebaseUser.uid, targetUid);
    } catch (e) {
      console.warn(e);
    }
  }

  return (
    <aside className="hidden lg:block sticky top-0 h-screen overflow-y-auto p-3 space-y-4">
      <form onSubmit={handleSubmit} className="sticky top-0 bg-background pt-1 pb-2">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="検索"
          className="w-full bg-bg-elev border border-border rounded-full px-4 py-2 outline-none focus:border-primary text-text"
        />
      </form>
      <section className="bg-bg-elev rounded-2xl p-4">
        <h3 className="font-extrabold text-lg mb-3">おすすめユーザー</h3>
        {candidates === null ? (
          <p className="text-text-secondary text-sm">読み込み中...</p>
        ) : suggested.length === 0 ? (
          <p className="text-text-secondary text-sm">候補がありません。</p>
        ) : (
          <ul className="space-y-3">
            {suggested.map((u) => (
              <li key={u.uid} className="flex items-center gap-2">
                <Link href={`/profile/${u.username}`} className="flex items-center gap-2 min-w-0 flex-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u.photoURL} alt="" className="w-10 h-10 rounded-full" />
                  <div className="min-w-0">
                    <div className="font-bold truncate">{u.displayName}</div>
                    <div className="text-text-secondary text-xs truncate">@{u.username}</div>
                  </div>
                </Link>
                <button
                  onClick={() => handleFollow(u.uid)}
                  className="bg-text text-background hover:opacity-90 text-xs font-bold rounded-full px-3 py-1.5"
                >
                  フォロー
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
