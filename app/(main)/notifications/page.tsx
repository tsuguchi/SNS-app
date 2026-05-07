'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, doc, documentId, getDoc, getDocs, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AppUser, Notification, Post } from '@/lib/types';
import { useAuth } from '@/components/AuthProvider';
import { markAllAsRead, markAsRead } from '@/lib/notifications';
import { fetchUsersByUids } from '@/lib/users';

function timeAgo(ts: { toMillis(): number } | null | undefined) {
  if (!ts) return '';
  const diff = Date.now() - ts.toMillis();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'たった今';
  if (m < 60) return `${m}分前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}時間前`;
  return `${Math.floor(h / 24)}日前`;
}

const TYPE_LABEL: Record<Notification['type'], string> = {
  like: 'があなたの投稿にいいねしました',
  follow: 'があなたをフォローしました',
  reply: 'があなたの投稿に返信しました',
};

export default function NotificationsPage() {
  const { firebaseUser } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [users, setUsers] = useState<Record<string, AppUser>>({});
  const [posts, setPosts] = useState<Record<string, Post>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) return;
    const q = query(
      collection(db(), 'notifications'),
      where('recipientId', '==', firebaseUser.uid),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    const unsub = onSnapshot(q, async (snap) => {
      const list = snap.docs.map((d) => ({ ...(d.data() as Omit<Notification, 'notificationId'>), notificationId: d.id }));
      setItems(list);

      // 関連ユーザーをまとめて取得
      const senderIds = Array.from(new Set(list.map((n) => n.senderId)));
      const userCache: Record<string, AppUser> = { ...users };
      const missingUsers = senderIds.filter((u) => !userCache[u]);
      if (missingUsers.length) {
        const fetched = await fetchUsersByUids(missingUsers);
        Object.assign(userCache, fetched);
      }
      setUsers(userCache);

      // 関連投稿をまとめて取得
      const postIds = Array.from(new Set(list.map((n) => n.postId).filter((x): x is string => !!x)));
      const postCache: Record<string, Post> = { ...posts };
      const needPosts = postIds.filter((p) => !postCache[p]);
      if (needPosts.length) {
        const ref = collection(db(), 'posts');
        for (let i = 0; i < needPosts.length; i += 30) {
          const chunk = needPosts.slice(i, i + 30);
          const ps = await getDocs(query(ref, where(documentId(), 'in', chunk)));
          ps.forEach((d) => {
            postCache[d.id] = { ...(d.data() as Omit<Post, 'postId'>), postId: d.id };
          });
        }
      }
      setPosts(postCache);

      setLoading(false);
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser]);

  // 表示時に全件既読化
  useEffect(() => {
    if (!firebaseUser || loading || items.length === 0) return;
    const hasUnread = items.some((n) => !n.read);
    if (hasUnread) markAllAsRead(firebaseUser.uid).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser, loading, items.length]);

  function linkFor(n: Notification): string {
    if (n.type === 'follow') {
      const u = users[n.senderId];
      return u ? `/profile/${u.username}` : '/';
    }
    if (n.postId) return `/post/${n.postId}`;
    return '/';
  }

  return (
    <div>
      <header className="sticky top-0 backdrop-blur bg-background/80 px-4 py-3 border-b border-border z-10">
        <h2 className="text-xl font-bold">通知</h2>
      </header>
      {loading ? (
        <div className="p-10 text-center text-text-secondary">読み込み中...</div>
      ) : items.length === 0 ? (
        <div className="p-10 text-center text-text-secondary">通知はありません。</div>
      ) : (
        items.map((n) => {
          const sender = users[n.senderId];
          if (!sender) return null;
          const post = n.postId ? posts[n.postId] : null;
          return (
            <Link
              key={n.notificationId}
              href={linkFor(n)}
              onClick={() => !n.read && markAsRead(n.notificationId).catch(() => {})}
              className={`block p-3 border-b border-border hover:bg-bg-hover transition-colors ${
                !n.read ? 'bg-bg-elev' : ''
              }`}
            >
              <div className="flex gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sender.photoURL} alt="" className="w-10 h-10 rounded-full" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm">
                    <span className="font-bold">{sender.displayName}</span>
                    <span>{TYPE_LABEL[n.type]}</span>
                    <span className="text-text-secondary"> · {timeAgo(n.createdAt)}</span>
                  </div>
                  {post && (
                    <div className="text-text-secondary text-sm mt-1 line-clamp-2">
                      {post.content}
                    </div>
                  )}
                </div>
                {!n.read && <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0"></span>}
              </div>
            </Link>
          );
        })
      )}
    </div>
  );
}
