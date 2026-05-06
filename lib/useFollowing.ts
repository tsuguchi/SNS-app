'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * 現在のユーザーがフォロー中の followingId 集合をリアルタイム購読する。
 */
export function useFollowing(userId: string | undefined) {
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) {
      setFollowingSet(new Set());
      return;
    }
    const q = query(collection(db(), 'follows'), where('followerId', '==', userId));
    const unsub = onSnapshot(q, (snap) => {
      const s = new Set<string>();
      snap.forEach((d) => s.add(d.data().followingId as string));
      setFollowingSet(s);
    });
    return () => unsub();
  }, [userId]);

  return followingSet;
}
