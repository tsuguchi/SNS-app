'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { PostComposer } from '@/components/PostComposer';

type ComposerContextValue = {
  openComposer: (quotedPostId?: string | null) => void;
};

const ComposerContext = createContext<ComposerContextValue>({
  openComposer: () => {},
});

export function ComposerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [quotedPostId, setQuotedPostId] = useState<string | null>(null);

  function openComposer(qid?: string | null) {
    setQuotedPostId(qid ?? null);
    setOpen(true);
  }
  function closeComposer() {
    setOpen(false);
  }

  return (
    <ComposerContext.Provider value={{ openComposer }}>
      {children}
      <PostComposer open={open} onClose={closeComposer} quotedPostId={quotedPostId} />
    </ComposerContext.Provider>
  );
}

export function useComposer() {
  return useContext(ComposerContext);
}
