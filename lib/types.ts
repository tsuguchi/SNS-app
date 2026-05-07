import type { Timestamp } from 'firebase/firestore';

export type AppUser = {
  uid: string;
  displayName: string;
  username: string;
  bio: string;
  photoURL: string;
  createdAt: Timestamp;
};

export type Post = {
  postId: string;
  authorId: string;
  content: string;
  imageUrls: string[];
  quotedPostId: string | null;
  parentPostId: string | null; // リプライ元の postId(リプライでない場合は null)
  likeCount: number;
  replyCount: number;
  createdAt: Timestamp;
};

export type Like = {
  postId: string;
  userId: string;
  createdAt: Timestamp;
};

export type Follow = {
  followerId: string;
  followingId: string;
  createdAt: Timestamp;
};

export type NotificationType = 'like' | 'follow' | 'reply';

export type Notification = {
  notificationId: string;
  recipientId: string; // 通知を受け取る側(自分)
  senderId: string;    // アクションをした側
  type: NotificationType;
  postId?: string;     // like/reply で対象投稿の ID
  read: boolean;
  createdAt: Timestamp;
};
