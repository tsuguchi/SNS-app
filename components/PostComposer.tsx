'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { createPost } from '@/lib/posts';

const MAX_TEXT = 280;

type Props = {
  open: boolean;
  onClose: () => void;
};

export function PostComposer({ open, onClose }: Props) {
  const { firebaseUser } = useAuth();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setText('');
      setError(null);
      setTimeout(() => textareaRef.current?.focus(), 30);
    }
  }, [open]);

  if (!open) return null;

  const trimmed = text.trim();
  const valid = trimmed.length > 0 && trimmed.length <= MAX_TEXT;
  const remaining = MAX_TEXT - text.length;

  async function handleSubmit() {
    if (!firebaseUser || !valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await createPost({
        authorId: firebaseUser.uid,
        content: trimmed,
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
          <h3 className="m-0 flex-1 font-bold">新規投稿</h3>
        </header>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="いまどうしてる?"
          className="bg-transparent border-0 outline-none p-4 text-lg resize-none min-h-[120px] text-text"
          maxLength={MAX_TEXT + 50}
        />
        {error && <p className="px-4 text-danger text-sm">{error}</p>}
        <footer className="flex items-center gap-3 px-4 py-3 border-t border-border">
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
            {submitting ? '...' : '投稿'}
          </button>
        </footer>
      </div>
    </div>
  );
}
