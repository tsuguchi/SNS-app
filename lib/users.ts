import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppUser } from '@/lib/types';

export async function getUserByUsername(username: string): Promise<AppUser | null> {
  const q = query(collection(db(), 'users'), where('username', '==', username));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data() as AppUser;
}

export async function getUserByUid(uid: string): Promise<AppUser | null> {
  const ds = await getDoc(doc(db(), 'users', uid));
  return ds.exists() ? (ds.data() as AppUser) : null;
}

export async function updateProfile(
  uid: string,
  patch: Partial<Pick<AppUser, 'displayName' | 'username' | 'bio' | 'photoURL'>>
) {
  await updateDoc(doc(db(), 'users', uid), patch);
}

export async function isUsernameTaken(username: string, exceptUid?: string): Promise<boolean> {
  const q = query(collection(db(), 'users'), where('username', '==', username));
  const snap = await getDocs(q);
  if (snap.empty) return false;
  if (exceptUid && snap.docs.every((d) => d.id === exceptUid)) return false;
  return true;
}
