'use client';

import { useEffect, useState } from 'react';
import { collection, doc, documentId, getDoc, getDocs, onSnapshot, orderBy, query, limit, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppUser, Post } from '@/lib/types';
import { PostCard } from '@/components/PostCard';
import { useAuth } from '@/components/AuthProvider';
import { useUserLikes } from '@/lib/useUserLikes';
import { deletePost, toggleLike } from '@/lib/posts';

export default function HomePage() {
  const { firebaseUser } = useAuth();
  const likedSet = useUserLikes(firebaseUser?.uid);
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<Record<string, AppUser>>({});
  const [quotedPosts, setQuotedPosts] = useState<Record<string, Post>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db(), 'posts'), orderBy('createdAt', 'desc'), limit(50));
    const unsub = onSnapshot(q, async (snap) => {
      const list = snap.docs.map((d) => ({ ...(d.data() as Omit<Post, 'postId'>), postId: d.id }));
      setPosts(list);

      // 引用元投稿
      const quotedIds = Array.from(new Set(list.map((p) => p.quotedPostId).filter((x): x is string => !!x)));
      const quotedById: Record<string, Post> = { ...quotedPosts };
      const missing = quotedIds.filter((id) => !quotedById[id]);
      if (missing.length) {
        for (let i = 0; i < missing.length; i += 10) {
          const chunk = missing.slice(i, i + 10);
          const qs = await getDocs(query(collection(db(), 'posts'), where(documentId(), 'in', chunk)));
          qs.forEach((d) => {
            quotedById[d.id] = { ...(d.data() as Omit<Post, 'postId'>), postId: d.id };
          });
        }
      }
      setQuotedPosts(quotedById);

      const needed = new Set<string>();
      for (const p of list) needed.add(p.authorId);
      for (const id of quotedIds) {
        const qp = quotedById[id];
        if (qp) needed.add(qp.authorId);
      }
      const cache: Record<string, AppUser> = { ...users };
      await Promise.all(
        Array.from(needed)
          .filter((uid) => !cache[uid])
          .map(async (uid) => {
            const ds = await getDoc(doc(db(), 'users', uid));
            if (ds.exists()) cache[uid] = ds.data() as AppUser;
          })
      );
      setUsers(cache);
      setLoading(false);
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleToggleLike(postId: string) {
    if (!firebaseUser) return;
    await toggleLike(postId, firebaseUser.uid);
  }
  async function handleDelete(postId: string) {
    await deletePost(postId);
  }

  return (
    <div>
      <header className="sticky top-0 backdrop-blur bg-background/80 px-4 py-3 border-b border-border z-10">
        <h2 className="text-xl font-bold">ホーム</h2>
      </header>
      {loading ? (
        <div className="p-10 text-center text-text-secondary">読み込み中...</div>
      ) : posts.length === 0 ? (
        <div className="p-10 text-center text-text-secondary">まだ投稿がありません。</div>
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
        </div>
      )}
    </div>
  );
}
