import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { NotificationType } from '@/lib/types';

/**
 * 通知を作成する。自分自身へのアクションでは作成しない。
 * 失敗してもアプリ全体は壊さない(コンソールに出すだけ)。
 */
export async function createNotification(opts: {
  recipientId: string;
  senderId: string;
  type: NotificationType;
  postId?: string;
}) {
  if (opts.recipientId === opts.senderId) return;
  try {
    const data: Record<string, unknown> = {
      recipientId: opts.recipientId,
      senderId: opts.senderId,
      type: opts.type,
      read: false,
      createdAt: serverTimestamp(),
    };
    if (opts.postId) data.postId = opts.postId;
    await addDoc(collection(db(), 'notifications'), data);
  } catch (e) {
    console.warn('Failed to create notification:', e);
  }
}

export async function markAsRead(notificationId: string) {
  await updateDoc(doc(db(), 'notifications', notificationId), { read: true });
}

export async function markAllAsRead(userId: string) {
  const q = query(
    collection(db(), 'notifications'),
    where('recipientId', '==', userId),
    where('read', '==', false),
    limit(500)
  );
  const snap = await getDocs(q);
  if (snap.empty) return;
  const batch = writeBatch(db());
  snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
  await batch.commit();
}

export async function deleteNotification(notificationId: string) {
  await deleteDoc(doc(db(), 'notifications', notificationId));
}
