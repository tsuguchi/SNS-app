'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  documentId,
  getDocs,
  limit as fLimit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  where,
  type DocumentSnapshot,
  type Query,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppUser, Post } from '@/lib/types';
import { PostCard } from '@/components/PostCard';
import { useAuth } from '@/components/AuthProvider';
import { useUserLikes } from '@/lib/useUserLikes';
import { useFollowing } from '@/lib/useFollowing';
import { deletePost, toggleLike } from '@/lib/posts';
import { fetchUsersByUids } from '@/lib/users';

type Tab = 'all' | 'following';
const PAGE_SIZE = 20;

export default function HomePage() {
  const { firebaseUser } = useAuth();
  const likedSet = useUserLikes(firebaseUser?.uid);
  const followingSet = useFollowing(firebaseUser?.uid);
  const [tab, setTab] = useState<Tab>('all');
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<Record<string, AppUser>>({});
  const [quotedPosts, setQuotedPosts] = useState<Record<string, Post>>({});
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const lastDocRef = useRef<DocumentSnapshot | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const followingIds = useMemo(() => {
    if (!firebaseUser) return [] as string[];
    return [firebaseUser.uid, ...Array.from(followingSet)].slice(0, 30);
  }, [firebaseUser, followingSet]);

  const baseQuery = useCallback((): Query | null => {
    if (!firebaseUser) return null;
    const coll = collection(db(), 'posts');
    if (tab === 'following') {
      if (followingIds.length === 0) return null;
      return query(coll, where('authorId', 'in', followingIds), orderBy('createdAt', 'desc'));
    }
    return query(coll, orderBy('createdAt', 'desc'));
  }, [firebaseUser, tab, followingIds]);

  // タブまたは認証ユーザー切替時に先頭ページを購読
  useEffect(() => {
    const q = baseQuery();
    if (!q) {
      setPosts([]);
      setLoading(false);
      lastDocRef.current = null;
      setHasMore(false);
      return;
    }
    setLoading(true);
    const firstPage = query(q, fLimit(PAGE_SIZE));
    const unsub = onSnapshot(firstPage, async (snap) => {
      const list = snap.docs.map((d) => ({ ...(d.data() as Omit<Post, 'postId'>), postId: d.id }));
      setPosts(list);
      lastDocRef.current = snap.docs[snap.docs.length - 1] ?? null;
      setHasMore(snap.docs.length === PAGE_SIZE);
      await hydratePostMeta(list);
      setLoading(false);
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseQuery]);

  // 引用元投稿 + 著者を一括取得して state を補完
  async function hydratePostMeta(list: Post[]) {
    const quotedIds = Array.from(new Set(list.map((p) => p.quotedPostId).filter((x): x is string => !!x)));
    let quotedById: Record<string, Post> = {};
    if (quotedIds.length) {
      const ref = collection(db(), 'posts');
      for (let i = 0; i < quotedIds.length; i += 30) {
        const chunk = quotedIds.slice(i, i + 30);
        const qs = await getDocs(query(ref, where(documentId(), 'in', chunk)));
        qs.forEach((d) => {
          quotedById[d.id] = { ...(d.data() as Omit<Post, 'postId'>), postId: d.id };
        });
      }
      setQuotedPosts((prev) => {
        quotedById = { ...prev, ...quotedById };
        return quotedById;
      });
    }
    const needAuthors = new Set<string>();
    for (const p of list) needAuthors.add(p.authorId);
    for (const id of quotedIds) {
      const qp = quotedById[id];
      if (qp) needAuthors.add(qp.authorId);
    }
    setUsers((prev) => {
      const missing = Array.from(needAuthors).filter((u) => !prev[u]);
      if (!missing.length) return prev;
      // 非同期だが副作用としてはOK(下のIIFE)
      void (async () => {
        const fetched = await fetchUsersByUids(missing);
        setUsers((curr) => ({ ...curr, ...fetched }));
      })();
      return prev;
    });
  }

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    const q = baseQuery();
    if (!q || !lastDocRef.current) return;
    setLoadingMore(true);
    try {
      const nextPage = query(q, startAfter(lastDocRef.current), fLimit(PAGE_SIZE));
      const snap = await getDocs(nextPage);
      const more = snap.docs.map((d) => ({ ...(d.data() as Omit<Post, 'postId'>), postId: d.id }));
      setPosts((prev) => [...prev, ...more]);
      lastDocRef.current = snap.docs[snap.docs.length - 1] ?? lastDocRef.current;
      setHasMore(snap.docs.length === PAGE_SIZE);
      await hydratePostMeta(more);
    } finally {
      setLoadingMore(false);
    }
  }, [baseQuery, hasMore, loadingMore]);

  // 無限スクロール用 IntersectionObserver
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: '400px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  async function handleToggleLike(postId: string) {
    if (!firebaseUser) return;
    await toggleLike(postId, firebaseUser.uid);
  }
  async function handleDelete(postId: string) {
    await deletePost(postId);
  }

  return (
    <div>
      <header className="sticky top-0 backdrop-blur bg-background/80 border-b border-border z-10">
        <div className="px-4 py-3"><h2 className="text-xl font-bold">ホーム</h2></div>
        <div className="flex border-t border-border">
          <button
            onClick={() => setTab('all')}
            className={`flex-1 py-3 font-bold text-sm transition-colors ${
              tab === 'all'
                ? 'border-b-2 border-primary text-text'
                : 'text-text-secondary hover:bg-bg-hover'
            }`}
          >
            おすすめ
          </button>
          <button
            onClick={() => setTab('following')}
            className={`flex-1 py-3 font-bold text-sm transition-colors ${
              tab === 'following'
                ? 'border-b-2 border-primary text-text'
                : 'text-text-secondary hover:bg-bg-hover'
            }`}
          >
            フォロー中
          </button>
        </div>
      </header>
      {loading ? (
        <div className="p-10 text-center text-text-secondary">読み込み中...</div>
      ) : posts.length === 0 ? (
        <div className="p-10 text-center text-text-secondary">
          {tab === 'following'
            ? 'フォロー中のユーザーの投稿がありません。誰かをフォローするとここに表示されます。'
            : 'まだ投稿がありません。'}
        </div>
      ) : (
        <div>
          {posts.map((p) => {
            const qp = p.quotedPostId ? quotedPosts[p.quotedPostId] ?? null : null;
            const qa = qp ? users[qp.authorId] ?? null : null;
            return (
              <PostCard
                key={p.postId}
                post={p}
                author={users[p.authorId] ?? null}
                quotedPost={qp}
                quotedAuthor={qa}
                liked={likedSet.has(p.postId)}
                isOwn={firebaseUser?.uid === p.authorId}
                onToggleLike={handleToggleLike}
                onDelete={handleDelete}
              />
            );
          })}
          <div ref={sentinelRef} className="h-10" />
          {loadingMore && (
            <div className="p-4 text-center text-text-secondary text-sm">読み込み中...</div>
          )}
          {!hasMore && posts.length > 0 && (
            <div className="p-4 text-center text-text-secondary text-sm">これ以上の投稿はありません</div>
          )}
        </div>
      )}
    </div>
  );
}

