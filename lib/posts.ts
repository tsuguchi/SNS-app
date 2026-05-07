import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  increment,
  runTransaction,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createNotification } from '@/lib/notifications';

export async function createPost(opts: {
  authorId: string;
  content: string;
  imageUrls?: string[];
  quotedPostId?: string | null;
  parentPostId?: string | null;
}): Promise<string> {
  const postsColl = collection(db(), 'posts');
  const newRef = doc(postsColl);
  const batch = writeBatch(db());
  batch.set(newRef, {
    authorId: opts.authorId,
    content: opts.content,
    imageUrls: opts.imageUrls ?? [],
    quotedPostId: opts.quotedPostId ?? null,
    parentPostId: opts.parentPostId ?? null,
    likeCount: 0,
    replyCount: 0,
    createdAt: serverTimestamp(),
  });
  if (opts.parentPostId) {
    batch.update(doc(db(), 'posts', opts.parentPostId), {
      replyCount: increment(1),
    });
  }
  await batch.commit();

  // リプライなら親投稿の作者に通知
  if (opts.parentPostId) {
    const parentSnap = await getDoc(doc(db(), 'posts', opts.parentPostId));
    if (parentSnap.exists()) {
      const parentAuthorId = parentSnap.data().authorId as string;
      await createNotification({
        recipientId: parentAuthorId,
        senderId: opts.authorId,
        type: 'reply',
        postId: newRef.id,
      });
    }
  }
  return newRef.id;
}

export async function deletePost(postId: string) {
  await deleteDoc(doc(db(), 'posts', postId));
  // 注: 紐付くいいね/リプライ/通知は Cloud Functions の onDelete で削除する想定。
}

export async function toggleLike(postId: string, userId: string) {
  const likeId = `${postId}__${userId}`;
  const likeRef = doc(db(), 'likes', likeId);
  const postRef = doc(db(), 'posts', postId);
  let added = false;
  let postAuthorId: string | undefined;
  await runTransaction(db(), async (tx) => {
    const likeSnap = await tx.get(likeRef);
    const postSnap = await tx.get(postRef);
    if (!postSnap.exists()) return;
    postAuthorId = postSnap.data().authorId as string;
    if (likeSnap.exists()) {
      tx.delete(likeRef);
      tx.update(postRef, { likeCount: increment(-1) });
      added = false;
    } else {
      tx.set(likeRef, {
        postId,
        userId,
        createdAt: serverTimestamp(),
      });
      tx.update(postRef, { likeCount: increment(1) });
      added = true;
    }
  });

  if (added && postAuthorId) {
    await createNotification({
      recipientId: postAuthorId,
      senderId: userId,
      type: 'like',
      postId,
    });
  }
}
