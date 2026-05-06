/**
 * Firebase Emulator にシードデータを投入するスクリプト
 *   実行: npm run seed
 *   前提: Firebase Emulator (auth/firestore) が稼働していること
 */
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';

import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const PROJECT_ID = 'demo-sns-app';

initializeApp({ projectId: PROJECT_ID });
const auth = getAuth();
const db = getFirestore();

type SeedUser = {
  uid: string;
  email: string;
  password: string;
  displayName: string;
  username: string;
  bio: string;
};

const colors = ['#1d9bf0', '#f91880', '#00ba7c'];
function avatarFor(seed: string, idx: number) {
  const initial = seed.charAt(0).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" fill="${colors[idx % colors.length]}"/><text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle" font-family="-apple-system,sans-serif" font-size="48" font-weight="700" fill="#fff">${initial}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

const seedUsers: SeedUser[] = [
  { uid: 'u_alice', email: 'alice@example.com', password: 'password', displayName: 'Alice', username: 'alice', bio: 'プロトタイプの主役です。' },
  { uid: 'u_bob', email: 'bob@example.com', password: 'password', displayName: 'Bob', username: 'bob_dev', bio: 'エンジニア / 個人開発' },
  { uid: 'u_carol', email: 'carol@example.com', password: 'password', displayName: 'Carol', username: 'carol', bio: 'ねこ好き 🐱' },
];

async function ensureUser(u: SeedUser) {
  try {
    await auth.getUser(u.uid);
    await auth.updateUser(u.uid, { email: u.email, password: u.password, displayName: u.displayName });
  } catch {
    await auth.createUser({ uid: u.uid, email: u.email, password: u.password, displayName: u.displayName });
  }
}

async function main() {
  console.log(`Seeding ${PROJECT_ID} ...`);

  // Users
  for (let i = 0; i < seedUsers.length; i++) {
    const u = seedUsers[i];
    await ensureUser(u);
    await db.collection('users').doc(u.uid).set({
      uid: u.uid,
      displayName: u.displayName,
      username: u.username,
      bio: u.bio,
      photoURL: avatarFor(u.displayName, i),
      createdAt: FieldValue.serverTimestamp(),
    });
    console.log(`  ✓ user ${u.username} (${u.email} / password: "${u.password}")`);
  }

  // Posts
  const posts = [
    { postId: 'p_1', authorId: 'u_alice', content: 'はじめての投稿!プロトタイプ動いてる?', quotedPostId: null },
    { postId: 'p_2', authorId: 'u_bob', content: 'Next.js + Firebase でSNS作る予定。\nまずはUIから固める。', quotedPostId: null },
    { postId: 'p_3', authorId: 'u_carol', content: 'タイムラインに表示されるかな?', quotedPostId: 'p_1' },
  ];
  for (const p of posts) {
    await db.collection('posts').doc(p.postId).set({
      authorId: p.authorId,
      content: p.content,
      imageUrls: [],
      quotedPostId: p.quotedPostId,
      likeCount: 0,
      createdAt: FieldValue.serverTimestamp(),
    });
    console.log(`  ✓ post ${p.postId}`);
  }

  // Likes
  await db.collection('likes').doc('p_1__u_bob').set({
    postId: 'p_1',
    userId: 'u_bob',
    createdAt: FieldValue.serverTimestamp(),
  });
  await db.collection('posts').doc('p_1').update({ likeCount: FieldValue.increment(1) });
  console.log('  ✓ like p_1 by u_bob');

  console.log('Done.');
  console.log('\nテスト用ログイン情報:');
  for (const u of seedUsers) {
    console.log(`  ${u.email} / ${u.password}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
