'use client';

import Link from 'next/link';
import type { AppUser, Post } from '@/lib/types';

type Props = {
  post: Post;
  author: AppUser | null;
  quotedPost?: Post | null;
  quotedAuthor?: AppUser | null;
};

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

export function PostCard({ post, author, quotedPost, quotedAuthor }: Props) {
  if (!author) return null;
  return (
    <article className="grid grid-cols-[48px_1fr] gap-3 p-3 border-b border-border hover:bg-bg-hover/50 transition-colors">
      <Link href={`/profile/${author.username}`} className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={author.photoURL} alt="" className="w-12 h-12 rounded-full" />
      </Link>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1 text-sm text-text-secondary">
          <Link href={`/profile/${author.username}`} className="font-bold text-text hover:underline">
            {author.displayName}
          </Link>
          <span>@{author.username}</span>
          <span>·</span>
          <span>{timeAgo(post.createdAt)}</span>
        </div>
        <div className="mt-1 whitespace-pre-wrap break-words">{post.content}</div>
        {post.imageUrls.length > 0 && (
          <div
            className={`grid gap-1 mt-2 rounded-2xl overflow-hidden border border-border ${
              post.imageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
            }`}
          >
            {post.imageUrls.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt="" className="w-full max-h-[280px] object-cover" />
            ))}
          </div>
        )}
        {post.quotedPostId &&
          (quotedPost && quotedAuthor ? (
            <Link
              href={`/post/${quotedPost.postId}`}
              className="block border border-border rounded-xl p-3 mt-2 hover:bg-bg-hover transition-colors"
            >
              <div className="flex flex-wrap items-center gap-1 text-xs text-text-secondary">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={quotedAuthor.photoURL} alt="" className="w-5 h-5 rounded-full" />
                <span className="font-bold text-text">{quotedAuthor.displayName}</span>
                <span>@{quotedAuthor.username}</span>
                <span>·</span>
                <span>{timeAgo(quotedPost.createdAt)}</span>
              </div>
              <div className="text-sm mt-1 whitespace-pre-wrap break-words">{quotedPost.content}</div>
            </Link>
          ) : (
            <div className="border border-border rounded-xl p-3 mt-2 text-text-secondary italic">
              この投稿は削除されました
            </div>
          ))}
        <div className="flex gap-6 mt-2">
          <button className="text-text-secondary hover:text-primary text-xs flex items-center gap-1 px-2 py-1 rounded-full">
            🤍 <span>{post.likeCount}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
