import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppUser, Post } from '@/lib/types';

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;
const PREFIX_END = ''; // Firestore 範囲クエリ用の Unicode 高位文字

/**
 * username の前方一致検索(Firestore 範囲クエリ)。
 * 半角英数字 + アンダースコアのみ受け付ける。
 */
export async function searchUsersByUsername(q: string, max = 20): Promise<AppUser[]> {
  if (!q || !USERNAME_PATTERN.test(q)) return [];
  const ref = collection(db(), 'users');
  const snap = await getDocs(
    query(ref, where('username', '>=', q), where('username', '<=', q + PREFIX_END), limit(max))
  );
  return snap.docs.map((d) => d.data() as AppUser);
}

/**
 * displayName のサーバ側前方一致検索。
 */
export async function searchUsersByDisplayName(q: string, max = 20): Promise<AppUser[]> {
  if (!q) return [];
  const ref = collection(db(), 'users');
  const snap = await getDocs(
    query(ref, where('displayName', '>=', q), where('displayName', '<=', q + PREFIX_END), limit(max))
  );
  return snap.docs.map((d) => d.data() as AppUser);
}

/**
 * ユーザー検索のラッパ。username と displayName 両方を検索して重複排除。
 */
export async function searchUsers(q: string, max = 20): Promise<AppUser[]> {
  const [byUsername, byDisplay] = await Promise.all([
    searchUsersByUsername(q, max),
    searchUsersByDisplayName(q, max),
  ]);
  const seen = new Set<string>();
  const merged: AppUser[] = [];
  for (const u of [...byUsername, ...byDisplay]) {
    if (!seen.has(u.uid)) {
      seen.add(u.uid);
      merged.push(u);
    }
  }
  return merged.slice(0, max);
}

/**
 * 最新200件の投稿からクライアントサイドで content 部分一致検索。
 * Firestore は全文検索を持たないため、データ量が増えたら Algolia 等の併用が必要。
 */
export async function searchPostsByContent(q: string, max = 50): Promise<Post[]> {
  if (!q) return [];
  const ref = collection(db(), 'posts');
  const snap = await getDocs(query(ref, orderBy('createdAt', 'desc'), limit(200)));
  const lower = q.toLowerCase();
  return snap.docs
    .map((d) => ({ ...(d.data() as Omit<Post, 'postId'>), postId: d.id }))
    .filter((p) => p.content.toLowerCase().includes(lower))
    .slice(0, max);
}
