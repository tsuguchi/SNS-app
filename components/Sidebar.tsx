'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';

export function Sidebar({ onCompose }: { onCompose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { appUser } = useAuth();

  async function handleLogout() {
    await signOut(auth());
    router.push('/login');
  }

  const navItem = (href: string, label: string) => {
    const active = pathname === href || (href !== '/' && pathname?.startsWith(href));
    return (
      <Link
        href={href}
        className={`block px-4 py-3 rounded-full font-semibold hover:bg-bg-hover transition-colors ${
          active ? 'bg-bg-hover' : ''
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <aside className="border-r border-border p-3 flex flex-col gap-2 sticky top-0 h-screen min-w-[220px]">
      <h1 className="text-xl font-extrabold text-primary px-4 pt-2">SNS-app</h1>
      <nav className="flex flex-col gap-1 mt-3">
        {navItem('/', '🏠 ホーム')}
        {appUser && navItem(`/profile/${appUser.username}`, '👤 プロフィール')}
      </nav>
      <button
        onClick={onCompose}
        className="bg-primary hover:bg-primary-hover text-white font-bold rounded-full py-3 mt-3 mx-2"
      >
        投稿する
      </button>
      {appUser && (
        <div className="mt-auto flex flex-col gap-2">
          <div className="bg-bg-elev rounded-xl p-3 flex items-center gap-2">
            {appUser.photoURL && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={appUser.photoURL} alt="" className="w-10 h-10 rounded-full" />
            )}
            <div className="min-w-0">
              <div className="font-bold text-sm truncate">{appUser.displayName}</div>
              <div className="text-text-secondary text-xs truncate">@{appUser.username}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="border border-border hover:bg-bg-hover rounded-full py-2 font-bold text-sm"
          >
            ログアウト
          </button>
        </div>
      )}
    </aside>
  );
}
