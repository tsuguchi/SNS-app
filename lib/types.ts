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
  likeCount: number;
  createdAt: Timestamp;
};

export type Like = {
  postId: string;
  userId: string;
  createdAt: Timestamp;
};
