'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { PostComposer } from '@/components/PostComposer';

type Mode = 'new' | 'quote' | 'reply';

type ComposerContextValue = {
  openComposer: (opts?: { quotedPostId?: string | null; parentPostId?: string | null }) => void;
};

const ComposerContext = createContext<ComposerContextValue>({
  openComposer: () => {},
});

export function ComposerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [quotedPostId, setQuotedPostId] = useState<string | null>(null);
  const [parentPostId, setParentPostId] = useState<string | null>(null);

  function openComposer(opts?: { quotedPostId?: string | null; parentPostId?: string | null }) {
    setQuotedPostId(opts?.quotedPostId ?? null);
    setParentPostId(opts?.parentPostId ?? null);
    setOpen(true);
  }
  function closeComposer() {
    setOpen(false);
  }

  const mode: Mode = parentPostId ? 'reply' : quotedPostId ? 'quote' : 'new';

  return (
    <ComposerContext.Provider value={{ openComposer }}>
      {children}
      <PostComposer
        open={open}
        onClose={closeComposer}
        quotedPostId={quotedPostId}
        parentPostId={parentPostId}
        mode={mode}
      />
    </ComposerContext.Provider>
  );
}

export function useComposer() {
  return useContext(ComposerContext);
}
