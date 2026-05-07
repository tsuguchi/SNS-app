'use client';

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * 現在ユーザー宛の未読通知件数をリアルタイム購読する。
 */
export function useUnreadNotifications(userId: string | undefined) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!userId) {
      setUnread(0);
      return;
    }
    const q = query(
      collection(db(), 'notifications'),
      where('recipientId', '==', userId),
      where('read', '==', false)
    );
    const unsub = onSnapshot(q, (snap) => {
      setUnread(snap.size);
    });
    return () => unsub();
  }, [userId]);

  return unread;
}
