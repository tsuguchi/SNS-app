'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { AppUser, Post } from '@/lib/types';
import { searchPostsByContent, searchUsers } from '@/lib/search';
import { PostCard } from '@/components/PostCard';
import { useAuth } from '@/components/AuthProvider';
import { useUserLikes } from '@/lib/useUserLikes';
import { deletePost, toggleLike } from '@/lib/posts';
import { fetchUsersByUids } from '@/lib/users';

type Tab = 'users' | 'posts';

export default function SearchPage() {
  const { firebaseUser } = useAuth();
  const likedSet = useUserLikes(firebaseUser?.uid);
  const params = useSearchParams();
  const initialQ = params.get('q') ?? '';
  const [tab, setTab] = useState<Tab>('users');
  const [q, setQ] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [postAuthors, setPostAuthors] = useState<Record<string, AppUser>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // URL ?q= が変わったら入力欄に反映
  useEffect(() => {
    const next = params.get('q') ?? '';
    setQ(next);
    setDebouncedQ(next);
  }, [params]);

  useEffect(() => {
    if (!debouncedQ) {
      setUsers([]);
      setPosts([]);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        if (tab === 'users') {
          const list = await searchUsers(debouncedQ, 30);
          setUsers(list);
        } else {
          const list = await searchPostsByContent(debouncedQ, 50);
          setPosts(list);
          const cache: Record<string, AppUser> = { ...postAuthors };
          const need = Array.from(new Set(list.map((p) => p.authorId))).filter((u) => !cache[u]);
          if (need.length) {
            const fetched = await fetchUsersByUids(need);
            Object.assign(cache, fetched);
          }
          setPostAuthors(cache);
        }
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, tab]);

  const empty = useMemo(() => {
    if (!debouncedQ) return null;
    if (loading) return null;
    if (tab === 'users' && users.length === 0)
      return '一致するユーザーはいません。(username/displayName の前方一致)';
    if (tab === 'posts' && posts.length === 0)
      return '一致する投稿はいません。(最新200件から部分一致検索)';
    return null;
  }, [debouncedQ, loading, tab, users.length, posts.length]);

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
        <div className="px-4 py-3">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="検索"
            className="w-full bg-bg-elev border border-border rounded-full px-4 py-2 outline-none focus:border-primary text-text"
          />
        </div>
        <div className="flex border-t border-border">
          <button
            onClick={() => setTab('users')}
            className={`flex-1 py-3 font-bold text-sm transition-colors ${
              tab === 'users' ? 'border-b-2 border-primary text-text' : 'text-text-secondary hover:bg-bg-hover'
            }`}
          >
            ユーザー
          </button>
          <button
            onClick={() => setTab('posts')}
            className={`flex-1 py-3 font-bold text-sm transition-colors ${
              tab === 'posts' ? 'border-b-2 border-primary text-text' : 'text-text-secondary hover:bg-bg-hover'
            }`}
          >
            投稿
          </button>
        </div>
      </header>
      {!debouncedQ ? (
        <div className="p-10 text-center text-text-secondary">検索ワードを入力してください。</div>
      ) : loading ? (
        <div className="p-10 text-center text-text-secondary">検索中...</div>
      ) : empty ? (
        <div className="p-10 text-center text-text-secondary">{empty}</div>
      ) : tab === 'users' ? (
        <div>
          {users.map((u) => (
            <Link
              key={u.uid}
              href={`/profile/${u.username}`}
              className="flex items-center gap-3 p-3 border-b border-border hover:bg-bg-hover transition-colors"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u.photoURL} alt="" className="w-12 h-12 rounded-full" />
              <div className="min-w-0 flex-1">
                <div className="font-bold truncate">{u.displayName}</div>
                <div className="text-text-secondary text-sm truncate">@{u.username}</div>
                {u.bio && <div className="text-text text-sm mt-1 line-clamp-2">{u.bio}</div>}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div>
          {posts.map((p) => (
            <PostCard
              key={p.postId}
              post={p}
              author={postAuthors[p.authorId] ?? null}
              liked={likedSet.has(p.postId)}
              isOwn={firebaseUser?.uid === p.authorId}
              onToggleLike={handleToggleLike}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
