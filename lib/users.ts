import { collection, doc, documentId, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppUser } from '@/lib/types';

/**
 * 複数の uid をまとめて取得する。
 * Firestore の where in は最大30件なので、それ以上は分割して並列実行。
 * 戻り値は uid -> AppUser のマップ。
 */
export async function fetchUsersByUids(uids: string[]): Promise<Record<string, AppUser>> {
  const uniq = Array.from(new Set(uids)).filter(Boolean);
  if (uniq.length === 0) return {};
  const chunks: string[][] = [];
  for (let i = 0; i < uniq.length; i += 30) chunks.push(uniq.slice(i, i + 30));
  const results = await Promise.all(
    chunks.map((chunk) =>
      getDocs(query(collection(db(), 'users'), where(documentId(), 'in', chunk)))
    )
  );
  const map: Record<string, AppUser> = {};
  for (const snap of results) {
    snap.forEach((d) => {
      map[d.id] = d.data() as AppUser;
    });
  }
  return map;
}

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
