'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, query, where, getDocs, collection } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

type Mode = 'signin' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'signin') {
        await signInWithEmailAndPassword(auth(), email, password);
      } else {
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
          throw new Error('ユーザー名は半角英数字とアンダースコアのみ・3〜20文字で入力してください');
        }
        // username 重複チェック
        const usernameQ = query(collection(db(), 'users'), where('username', '==', username));
        const snap = await getDocs(usernameQ);
        if (!snap.empty) throw new Error('このユーザー名は既に使われています');

        const cred = await createUserWithEmailAndPassword(auth(), email, password);
        const uid = cred.user.uid;
        await setDoc(doc(db(), 'users', uid), {
          uid,
          displayName: displayName || username,
          username,
          bio: '',
          photoURL: makeAvatarSvgDataUrl(displayName || username),
          createdAt: serverTimestamp(),
        });
      }
      router.push('/');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg.replace(/^Firebase: /, ''));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-bg-elev border border-border rounded-2xl p-8">
        <h1 className="text-3xl font-extrabold text-primary text-center mb-2">SNS-app</h1>
        <p className="text-text-secondary text-center mb-6">
          {mode === 'signin' ? 'ログイン' : 'アカウント作成'}
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-background border border-border rounded-lg px-3 py-2 outline-none focus:border-primary"
          />
          <input
            type="password"
            placeholder="パスワード(6文字以上)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="bg-background border border-border rounded-lg px-3 py-2 outline-none focus:border-primary"
          />
          {mode === 'signup' && (
            <>
              <input
                type="text"
                placeholder="表示名"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={50}
                className="bg-background border border-border rounded-lg px-3 py-2 outline-none focus:border-primary"
              />
              <input
                type="text"
                placeholder="ユーザー名(@handle, 半角英数_)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                pattern="[a-zA-Z0-9_]{3,20}"
                className="bg-background border border-border rounded-lg px-3 py-2 outline-none focus:border-primary"
              />
            </>
          )}
          {error && <p className="text-danger text-sm">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="bg-primary hover:bg-primary-hover text-white font-bold rounded-full py-2.5 transition-colors disabled:opacity-50"
          >
            {submitting ? '...' : mode === 'signin' ? 'ログイン' : '登録'}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setMode((m) => (m === 'signin' ? 'signup' : 'signin'))}
          className="w-full mt-4 text-primary text-sm hover:underline"
        >
          {mode === 'signin' ? 'アカウントを作成する' : 'すでにアカウントをお持ちの方'}
        </button>
      </div>
    </div>
  );
}

function makeAvatarSvgDataUrl(seed: string) {
  const initial = (seed || '?').charAt(0).toUpperCase();
  const colors = ['#1d9bf0', '#f91880', '#00ba7c', '#ffd400', '#7856ff'];
  const color = colors[seed.charCodeAt(0) % colors.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" fill="${color}"/><text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle" font-family="-apple-system,sans-serif" font-size="48" font-weight="700" fill="#fff">${initial}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
