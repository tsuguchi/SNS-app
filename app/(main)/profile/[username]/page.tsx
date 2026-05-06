'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, doc, documentId, getDoc, getDocs, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppUser, Post } from '@/lib/types';
import { PostCard } from '@/components/PostCard';
import { useAuth } from '@/components/AuthProvider';
import { useUserLikes } from '@/lib/useUserLikes';
import { deletePost, toggleLike } from '@/lib/posts';
import { getUserByUsername } from '@/lib/users';

type Params = { username: string };

export default function ProfilePage({ params }: { params: Promise<Params> }) {
  const { username } = use(params);
  const { firebaseUser } = useAuth();
  const likedSet = useUserLikes(firebaseUser?.uid);
  const [user, setUser] = useState<AppUser | null | undefined>(undefined);
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<Record<string, AppUser>>({});
  const [quotedPosts, setQuotedPosts] = useState<Record<string, Post>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      const u = await getUserByUsername(username);
      setUser(u);
      if (!u) {
        setLoading(false);
        return;
      }
      const q = query(
        collection(db(), 'posts'),
        where('authorId', '==', u.uid),
        orderBy('createdAt', 'desc')
      );
      unsub = onSnapshot(q, async (snap) => {
        const list = snap.docs.map((d) => ({ ...(d.data() as Omit<Post, 'postId'>), postId: d.id }));
        setPosts(list);

        // 引用元投稿を取得
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

        const cache: Record<string, AppUser> = { [u.uid]: u, ...users };
        const needAuthors = new Set<string>();
        for (const id of quotedIds) {
          const qp = quotedById[id];
          if (qp) needAuthors.add(qp.authorId);
        }
        await Promise.all(
          Array.from(needAuthors)
            .filter((uid) => !cache[uid])
            .map(async (uid) => {
              const ds = await getDoc(doc(db(), 'users', uid));
              if (ds.exists()) cache[uid] = ds.data() as AppUser;
            })
        );
        setUsers(cache);
        setLoading(false);
      });
    })();
    return () => unsub?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  if (user === undefined) {
    return <div className="p-10 text-center text-text-secondary">読み込み中...</div>;
  }
  if (user === null) {
    return (
      <div>
        <header className="sticky top-0 backdrop-blur bg-background/80 px-4 py-3 border-b border-border z-10">
          <h2 className="text-xl font-bold">プロフィール</h2>
        </header>
        <div className="p-10 text-center text-text-secondary">ユーザーが見つかりません。</div>
      </div>
    );
  }

  const isMe = firebaseUser?.uid === user.uid;

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
        <h2 className="text-xl font-bold">{user.displayName}</h2>
      </header>
      <section className="p-4 border-b border-border">
        <div className="flex justify-between items-start mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={user.photoURL} alt="" className="w-24 h-24 rounded-full" />
          {isMe && (
            <Link
              href="/profile/edit"
              className="border border-border hover:bg-bg-hover rounded-full px-4 py-1.5 font-bold text-sm"
            >
              プロフィール編集
            </Link>
          )}
        </div>
        <div className="text-xl font-extrabold">{user.displayName}</div>
        <div className="text-text-secondary">@{user.username}</div>
        {user.bio && <div className="mt-3 whitespace-pre-wrap">{user.bio}</div>}
      </section>
      {loading ? (
        <div className="p-10 text-center text-text-secondary">読み込み中...</div>
      ) : posts.length === 0 ? (
        <div className="p-10 text-center text-text-secondary">まだ投稿がありません。</div>
      ) : (
        posts.map((p) => {
          const qp = p.quotedPostId ? quotedPosts[p.quotedPostId] ?? null : null;
          const qa = qp ? users[qp.authorId] ?? null : null;
          return (
            <PostCard
              key={p.postId}
              post={p}
              author={users[p.authorId] ?? user}
              quotedPost={qp}
              quotedAuthor={qa}
              liked={likedSet.has(p.postId)}
              isOwn={firebaseUser?.uid === p.authorId}
              onToggleLike={handleToggleLike}
              onDelete={handleDelete}
            />
          );
        })
      )}
    </div>
  );
}
