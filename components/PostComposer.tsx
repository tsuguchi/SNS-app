'use client';

import { useEffect, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/components/AuthProvider';
import { createPost } from '@/lib/posts';
import { uploadPostImage, ACCEPTED_TYPES, MAX_FILE_SIZE } from '@/lib/storage';
import { db } from '@/lib/firebase';
import { STORAGE_ENABLED } from '@/lib/featureFlags';
import type { AppUser, Post } from '@/lib/types';

const MAX_TEXT = 280;
const MAX_IMAGES = 4;

type Props = {
  open: boolean;
  onClose: () => void;
  quotedPostId?: string | null;
  parentPostId?: string | null;
  mode?: 'new' | 'quote' | 'reply';
};

export function PostComposer({ open, onClose, quotedPostId, parentPostId, mode = 'new' }: Props) {
  const { firebaseUser } = useAuth();
  const [text, setText] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referencedPost, setReferencedPost] = useState<Post | null>(null);
  const [referencedAuthor, setReferencedAuthor] = useState<AppUser | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const referencedPostId = mode === 'reply' ? parentPostId : quotedPostId;

  useEffect(() => {
    if (open) {
      setText('');
      setImages([]);
      setPreviews([]);
      setError(null);
      setTimeout(() => textareaRef.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !referencedPostId) {
      setReferencedPost(null);
      setReferencedAuthor(null);
      return;
    }
    (async () => {
      const ds = await getDoc(doc(db(), 'posts', referencedPostId));
      if (!ds.exists()) {
        setReferencedPost(null);
        setReferencedAuthor(null);
        return;
      }
      const p = { ...(ds.data() as Omit<Post, 'postId'>), postId: ds.id };
      setReferencedPost(p);
      const us = await getDoc(doc(db(), 'users', p.authorId));
      setReferencedAuthor(us.exists() ? (us.data() as AppUser) : null);
    })();
  }, [open, referencedPostId]);

  if (!open) return null;

  const trimmed = text.trim();
  const valid = (trimmed.length > 0 || images.length > 0) && trimmed.length <= MAX_TEXT;
  const remaining = MAX_TEXT - text.length;

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    const next: File[] = [...images];
    for (const f of files) {
      if (next.length >= MAX_IMAGES) {
        setError(`画像は最大${MAX_IMAGES}枚まで`);
        break;
      }
      if (f.size > MAX_FILE_SIZE) {
        setError(`${f.name} は5MBを超えています`);
        continue;
      }
      if (!ACCEPTED_TYPES.includes(f.type)) {
        setError(`${f.name} は対応形式(JPEG/PNG/GIF/WebP)ではありません`);
        continue;
      }
      next.push(f);
    }
    setImages(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
  }

  function removeImage(i: number) {
    const next = images.slice();
    next.splice(i, 1);
    setImages(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
  }

  async function handleSubmit() {
    if (!firebaseUser || !valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const uploaded: string[] = [];
      for (let i = 0; i < images.length; i++) {
        uploaded.push(await uploadPostImage(firebaseUser.uid, images[i], i));
      }
      await createPost({
        authorId: firebaseUser.uid,
        content: trimmed,
        imageUrls: uploaded,
        quotedPostId: mode === 'quote' ? quotedPostId ?? null : null,
        parentPostId: mode === 'reply' ? parentPostId ?? null : null,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[60px]">
      <div
        className="absolute inset-0 bg-[rgba(91,112,131,0.4)]"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-[min(600px,92vw)] max-h-[90vh] flex flex-col bg-background border border-border rounded-2xl">
        <header className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <button
            onClick={onClose}
            className="text-xl px-2 py-0.5 rounded-full hover:bg-bg-hover"
            aria-label="閉じる"
          >
            ×
          </button>
          <h3 className="m-0 flex-1 font-bold">
            {mode === 'reply' ? 'リプライ' : mode === 'quote' ? '引用ポスト' : '新規投稿'}
          </h3>
        </header>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={mode === 'reply' ? '返信を投稿' : 'いまどうしてる?'}
          className="bg-transparent border-0 outline-none p-4 text-lg resize-none min-h-[120px] text-text"
          maxLength={MAX_TEXT + 50}
        />
        {previews.length > 0 && (
          <div className="grid gap-2 px-4 pb-2 grid-cols-[repeat(auto-fill,minmax(120px,1fr))]">
            {previews.map((src, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white text-sm flex items-center justify-center"
                  aria-label="画像を削除"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        {referencedPostId && (
          <div className="mx-4 mb-2">
            {mode === 'reply' && (
              <div className="text-xs text-text-secondary mb-1">返信先:</div>
            )}
            {referencedPost && referencedAuthor ? (
              <div className="border border-border rounded-xl p-3">
                <div className="flex flex-wrap items-center gap-1 text-xs text-text-secondary">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={referencedAuthor.photoURL} alt="" className="w-5 h-5 rounded-full" />
                  <span className="font-bold text-text">{referencedAuthor.displayName}</span>
                  <span>@{referencedAuthor.username}</span>
                </div>
                <div className="text-sm mt-1 whitespace-pre-wrap break-words">{referencedPost.content}</div>
              </div>
            ) : (
              <div className="border border-border rounded-xl p-3 text-text-secondary italic">
                この投稿は削除されました
              </div>
            )}
          </div>
        )}
        {error && <p className="px-4 text-danger text-sm">{error}</p>}
        <footer className="flex items-center gap-3 px-4 py-3 border-t border-border">
          {STORAGE_ENABLED && (
            <label className="cursor-pointer text-2xl px-2 py-0.5 rounded-full hover:bg-bg-hover" title="画像を追加">
              🖼️
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                onChange={handleFiles}
                hidden
              />
            </label>
          )}
          <span
            className={`ml-auto text-sm ${
              remaining < 20 ? 'text-danger' : 'text-text-secondary'
            }`}
          >
            {remaining}
          </span>
          <button
            onClick={handleSubmit}
            disabled={!valid || submitting}
            className="bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-5 py-2 rounded-full"
          >
            {submitting ? '...' : mode === 'reply' ? '返信' : '投稿'}
          </button>
        </footer>
      </div>
    </div>
  );
}
