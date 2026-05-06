import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  increment,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function createPost(opts: {
  authorId: string;
  content: string;
  imageUrls?: string[];
  quotedPostId?: string | null;
}) {
  const ref = await addDoc(collection(db(), 'posts'), {
    authorId: opts.authorId,
    content: opts.content,
    imageUrls: opts.imageUrls ?? [],
    quotedPostId: opts.quotedPostId ?? null,
    likeCount: 0,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deletePost(postId: string) {
  await deleteDoc(doc(db(), 'posts', postId));
  // 注: 紐付くいいねドキュメントは Cloud Functions の onDelete で削除する想定。
  // 現状は Security Rules により他ユーザーのいいねは削除できないため、orphan として残るが
  // タイムラインは posts コレクションを起点に表示するため UI 上は問題なし。
}

export async function toggleLike(postId: string, userId: string) {
  const likeId = `${postId}__${userId}`;
  const likeRef = doc(db(), 'likes', likeId);
  const postRef = doc(db(), 'posts', postId);
  await runTransaction(db(), async (tx) => {
    const likeSnap = await tx.get(likeRef);
    if (likeSnap.exists()) {
      tx.delete(likeRef);
      tx.update(postRef, { likeCount: increment(-1) });
    } else {
      tx.set(likeRef, {
        postId,
        userId,
        createdAt: serverTimestamp(),
      });
      tx.update(postRef, { likeCount: increment(1) });
    }
  });
}
