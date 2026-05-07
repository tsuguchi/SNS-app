'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, documentId, getDocs, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppUser, Post } from '@/lib/types';
import { PostCard } from '@/components/PostCard';
import { useAuth } from '@/components/AuthProvider';
import { useUserLikes } from '@/lib/useUserLikes';
import { useFollowing } from '@/lib/useFollowing';
import { deletePost, toggleLike } from '@/lib/posts';
import { followUser, getFollowerCount, getFollowingCount, unfollowUser } from '@/lib/follows';
import { fetchUsersByUids, getUserByUsername } from '@/lib/users';

type Params = { username: string };

export default function ProfilePage({ params }: { params: Promise<Params> }) {
  const { username } = use(params);
  const { firebaseUser } = useAuth();
  const likedSet = useUserLikes(firebaseUser?.uid);
  const followingSet = useFollowing(firebaseUser?.uid);
  const [user, setUser] = useState<AppUser | null | undefined>(undefined);
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<Record<string, AppUser>>({});
  const [quotedPosts, setQuotedPosts] = useState<Record<string, Post>>({});
  const [loading, setLoading] = useState(true);
  const [followingCount, setFollowingCount] = useState<number | null>(null);
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [followBusy, setFollowBusy] = useState(false);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    (async () => {
      const u = await getUserByUsername(username);
      setUser(u);
      if (!u) {
        setLoading(false);
        return;
      }
      // Counts
      const [fc, foc] = await Promise.all([
        getFollowingCount(u.uid),
        getFollowerCount(u.uid),
      ]);
      setFollowingCount(fc);
      setFollowerCount(foc);

      const q = query(
        collection(db(), 'posts'),
        where('authorId', '==', u.uid),
        orderBy('createdAt', 'desc')
      );
      unsub = onSnapshot(q, async (snap) => {
        const list = snap.docs.map((d) => ({ ...(d.data() as Omit<Post, 'postId'>), postId: d.id }));
        setPosts(list);

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
        const missingAuthors = Array.from(needAuthors).filter((uid) => !cache[uid]);
        if (missingAuthors.length) {
          const fetched = await fetchUsersByUids(missingAuthors);
          Object.assign(cache, fetched);
        }
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
  const isFollowing = followingSet.has(user.uid);

  async function handleToggleLike(postId: string) {
    if (!firebaseUser) return;
    await toggleLike(postId, firebaseUser.uid);
  }
  async function handleDelete(postId: string) {
    await deletePost(postId);
  }
  async function handleToggleFollow() {
    if (!firebaseUser || !user || followBusy) return;
    setFollowBusy(true);
    try {
      if (isFollowing) {
        await unfollowUser(firebaseUser.uid, user.uid);
        setFollowerCount((c) => (c ?? 0) - 1);
      } else {
        await followUser(firebaseUser.uid, user.uid);
        setFollowerCount((c) => (c ?? 0) + 1);
      }
    } finally {
      setFollowBusy(false);
    }
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
          {isMe ? (
            <Link
              href="/profile/edit"
              className="border border-border hover:bg-bg-hover rounded-full px-4 py-1.5 font-bold text-sm"
            >
              プロフィール編集
            </Link>
          ) : (
            <button
              onClick={handleToggleFollow}
              disabled={followBusy}
              className={`rounded-full px-4 py-1.5 font-bold text-sm transition-colors ${
                isFollowing
                  ? 'border border-border hover:bg-[rgba(244,33,46,0.1)] hover:text-danger hover:border-danger'
                  : 'bg-text text-background hover:opacity-90'
              } disabled:opacity-50`}
            >
              {isFollowing ? 'フォロー中' : 'フォロー'}
            </button>
          )}
        </div>
        <div className="text-xl font-extrabold">{user.displayName}</div>
        <div className="text-text-secondary">@{user.username}</div>
        {user.bio && <div className="mt-3 whitespace-pre-wrap">{user.bio}</div>}
        <div className="mt-3 flex gap-4 text-sm">
          <span><strong>{followingCount ?? '...'}</strong> <span className="text-text-secondary">フォロー中</span></span>
          <span><strong>{followerCount ?? '...'}</strong> <span className="text-text-secondary">フォロワー</span></span>
        </div>
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
