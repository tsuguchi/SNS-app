'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { collection, doc, getDoc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppUser, Post } from '@/lib/types';
import { PostCard } from '@/components/PostCard';
import { useAuth } from '@/components/AuthProvider';
import { useUserLikes } from '@/lib/useUserLikes';
import { deletePost, toggleLike } from '@/lib/posts';
import { fetchUsersByUids } from '@/lib/users';

type Params = { id: string };

export default function PostDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = use(params);
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const likedSet = useUserLikes(firebaseUser?.uid);
  const [post, setPost] = useState<Post | null | undefined>(undefined);
  const [author, setAuthor] = useState<AppUser | null>(null);
  const [quotedPost, setQuotedPost] = useState<Post | null>(null);
  const [quotedAuthor, setQuotedAuthor] = useState<AppUser | null>(null);
  const [parentPost, setParentPost] = useState<Post | null>(null);
  const [parentAuthor, setParentAuthor] = useState<AppUser | null>(null);
  const [replies, setReplies] = useState<Post[]>([]);
  const [replyAuthors, setReplyAuthors] = useState<Record<string, AppUser>>({});

  useEffect(() => {
    const unsub = onSnapshot(doc(db(), 'posts', id), async (snap) => {
      if (!snap.exists()) {
        setPost(null);
        return;
      }
      const p = { ...(snap.data() as Omit<Post, 'postId'>), postId: snap.id };
      setPost(p);
      const us = await getDoc(doc(db(), 'users', p.authorId));
      setAuthor(us.exists() ? (us.data() as AppUser) : null);

      // 引用元
      if (p.quotedPostId) {
        const qs = await getDoc(doc(db(), 'posts', p.quotedPostId));
        if (qs.exists()) {
          const qp = { ...(qs.data() as Omit<Post, 'postId'>), postId: qs.id };
          setQuotedPost(qp);
          const qus = await getDoc(doc(db(), 'users', qp.authorId));
          setQuotedAuthor(qus.exists() ? (qus.data() as AppUser) : null);
        } else {
          setQuotedPost(null);
          setQuotedAuthor(null);
        }
      } else {
        setQuotedPost(null);
        setQuotedAuthor(null);
      }

      // 親(リプライ元)
      if (p.parentPostId) {
        const ps = await getDoc(doc(db(), 'posts', p.parentPostId));
        if (ps.exists()) {
          const pp = { ...(ps.data() as Omit<Post, 'postId'>), postId: ps.id };
          setParentPost(pp);
          const pus = await getDoc(doc(db(), 'users', pp.authorId));
          setParentAuthor(pus.exists() ? (pus.data() as AppUser) : null);
        } else {
          setParentPost(null);
          setParentAuthor(null);
        }
      } else {
        setParentPost(null);
        setParentAuthor(null);
      }
    });
    return () => unsub();
  }, [id]);

  // この投稿への返信を購読
  useEffect(() => {
    const q = query(
      collection(db(), 'posts'),
      where('parentPostId', '==', id),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, async (snap) => {
      const list = snap.docs.map((d) => ({ ...(d.data() as Omit<Post, 'postId'>), postId: d.id }));
      setReplies(list);
      const cache: Record<string, AppUser> = { ...replyAuthors };
      const need = Array.from(new Set(list.map((p) => p.authorId))).filter((u) => !cache[u]);
      if (need.length) {
        const fetched = await fetchUsersByUids(need);
        Object.assign(cache, fetched);
        setReplyAuthors(cache);
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleToggleLike(postId: string) {
    if (!firebaseUser) return;
    await toggleLike(postId, firebaseUser.uid);
  }
  async function handleDelete(postId: string) {
    await deletePost(postId);
    router.back();
  }

  return (
    <div>
      <header className="sticky top-0 backdrop-blur bg-background/80 px-4 py-3 border-b border-border z-10 flex items-center gap-3">
        <Link href="/" className="text-xl px-2 hover:bg-bg-hover rounded-full">
          ←
        </Link>
        <h2 className="text-xl font-bold">投稿</h2>
      </header>
      {post === undefined ? (
        <div className="p-10 text-center text-text-secondary">読み込み中...</div>
      ) : post === null ? (
        <div className="p-10 text-center text-text-secondary">この投稿は削除されたか見つかりません。</div>
      ) : (
        <>
          {parentPost && (
            <PostCard
              post={parentPost}
              author={parentAuthor}
              liked={likedSet.has(parentPost.postId)}
              isOwn={firebaseUser?.uid === parentPost.authorId}
              onToggleLike={handleToggleLike}
              onDelete={handleDelete}
            />
          )}
          <PostCard
            post={post}
            author={author}
            quotedPost={quotedPost}
            quotedAuthor={quotedAuthor}
            liked={likedSet.has(post.postId)}
            isOwn={firebaseUser?.uid === post.authorId}
            onToggleLike={handleToggleLike}
            onDelete={handleDelete}
          />
          {replies.length > 0 && (
            <div>
              <div className="px-4 py-2 text-sm text-text-secondary border-b border-border">
                {replies.length} 件の返信
              </div>
              {replies.map((r) => (
                <PostCard
                  key={r.postId}
                  post={r}
                  author={replyAuthors[r.authorId] ?? null}
                  liked={likedSet.has(r.postId)}
                  isOwn={firebaseUser?.uid === r.authorId}
                  onToggleLike={handleToggleLike}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
