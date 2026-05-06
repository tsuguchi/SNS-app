'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * 現在のユーザーがいいねした postId の集合をリアルタイム購読する。
 * 個人開発の前提では likes は数十〜数百件想定で許容範囲。
 */
export function useUserLikes(userId: string | undefined) {
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) {
      setLikedSet(new Set());
      return;
    }
    const q = query(collection(db(), 'likes'), where('userId', '==', userId));
    const unsub = onSnapshot(q, (snap) => {
      const s = new Set<string>();
      snap.forEach((d) => s.add(d.data().postId as string));
      setLikedSet(s);
    });
    return () => unsub();
  }, [userId]);

  return likedSet;
}
