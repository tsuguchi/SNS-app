'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await sendPasswordResetEmail(auth(), email);
      setSent(true);
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
        <p className="text-text-secondary text-center mb-6">パスワードを忘れた方</p>
        {sent ? (
          <div className="text-center">
            <p className="text-text mb-4">
              パスワード再設定メールを送信しました。受信トレイをご確認ください。
              <br />
              (迷惑メールフォルダもご確認ください)
            </p>
            <Link href="/login" className="text-primary hover:underline">
              ログイン画面に戻る
            </Link>
          </div>
        ) : (
          <>
            <p className="text-text-secondary text-sm mb-4">
              登録済みのメールアドレスを入力してください。再設定用のリンクをお送りします。
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
              {error && <p className="text-danger text-sm">{error}</p>}
              <button
                type="submit"
                disabled={submitting}
                className="bg-primary hover:bg-primary-hover text-white font-bold rounded-full py-2.5 transition-colors disabled:opacity-50"
              >
                {submitting ? '...' : '再設定メールを送信'}
              </button>
            </form>
            <Link
              href="/login"
              className="block text-center mt-4 text-primary text-sm hover:underline"
            >
              ログイン画面に戻る
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
