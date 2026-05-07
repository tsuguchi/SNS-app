import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createNotification } from '@/lib/notifications';

function followId(followerId: string, followingId: string) {
  return `${followerId}__${followingId}`;
}

export async function followUser(followerId: string, followingId: string) {
  if (followerId === followingId) throw new Error('自分自身はフォローできません');
  const ref = doc(db(), 'follows', followId(followerId, followingId));
  await setDoc(ref, {
    followerId,
    followingId,
    createdAt: serverTimestamp(),
  });
  await createNotification({
    recipientId: followingId,
    senderId: followerId,
    type: 'follow',
  });
}

export async function unfollowUser(followerId: string, followingId: string) {
  const ref = doc(db(), 'follows', followId(followerId, followingId));
  await deleteDoc(ref);
}

export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const ref = doc(db(), 'follows', followId(followerId, followingId));
  const snap = await getDoc(ref);
  return snap.exists();
}

export async function getFollowingCount(uid: string): Promise<number> {
  const q = query(collection(db(), 'follows'), where('followerId', '==', uid));
  const snap = await getCountFromServer(q);
  return snap.data().count;
}

export async function getFollowerCount(uid: string): Promise<number> {
  const q = query(collection(db(), 'follows'), where('followingId', '==', uid));
  const snap = await getCountFromServer(q);
  return snap.data().count;
}
