'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { isUsernameTaken, updateProfile } from '@/lib/users';
import { uploadAvatar } from '@/lib/storage';

export default function ProfileEditPage() {
  const router = useRouter();
  const { firebaseUser, appUser, loading } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (appUser) {
      setDisplayName(appUser.displayName);
      setUsername(appUser.username);
      setBio(appUser.bio || '');
    }
  }, [appUser]);

  if (loading || !appUser || !firebaseUser) {
    return <div className="p-10 text-center text-text-secondary">読み込み中...</div>;
  }

  function handleAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!firebaseUser || !appUser) return;
    setError(null);
    setSubmitting(true);
    try {
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        throw new Error('ユーザー名は半角英数字とアンダースコアのみ・3〜20文字');
      }
      if (username !== appUser.username) {
        const taken = await isUsernameTaken(username, firebaseUser.uid);
        if (taken) throw new Error('このユーザー名は既に使われています');
      }
      let photoURL: string | undefined;
      if (avatarFile) {
        photoURL = await uploadAvatar(firebaseUser.uid, avatarFile);
      }
      await updateProfile(firebaseUser.uid, {
        displayName: displayName.trim() || appUser.displayName,
        username,
        bio: bio.trim(),
        ...(photoURL ? { photoURL } : {}),
      });
      router.push(`/profile/${username}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <header className="sticky top-0 backdrop-blur bg-background/80 px-4 py-3 border-b border-border z-10 flex items-center gap-3">
        <Link href={`/profile/${appUser.username}`} className="text-xl px-2 hover:bg-bg-hover rounded-full">
          ←
        </Link>
        <h2 className="text-xl font-bold">プロフィール編集</h2>
      </header>
      <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
        <label className="flex flex-col gap-2 text-sm text-text-secondary">
          アバター画像
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarPreview ?? appUser.photoURL}
              alt=""
              className="w-20 h-20 rounded-full"
            />
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleAvatar}
            />
          </div>
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-text-secondary">
          表示名
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
            required
            className="bg-background border border-border rounded-lg px-3 py-2 outline-none focus:border-primary text-text"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-text-secondary">
          ユーザー名(@handle)
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            pattern="[a-zA-Z0-9_]{3,20}"
            required
            className="bg-background border border-border rounded-lg px-3 py-2 outline-none focus:border-primary text-text"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-text-secondary">
          自己紹介
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={160}
            rows={3}
            className="bg-background border border-border rounded-lg px-3 py-2 outline-none focus:border-primary text-text resize-y"
          />
        </label>
        {error && <p className="text-danger text-sm">{error}</p>}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-bold px-5 py-2 rounded-full"
          >
            {submitting ? '...' : '保存'}
          </button>
        </div>
      </form>
    </div>
  );
}
