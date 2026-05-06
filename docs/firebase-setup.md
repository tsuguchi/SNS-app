# 本番 Firebase 接続手順

エミュレーターから実際の Firebase プロジェクトへ切り替える手順。

## 前提

- Google アカウントを持っていること(Google Workspace アカウントの場合、組織ポリシーで Firebase が許可されているか確認)
- Node.js / npm がインストール済み

---

## 1. Firebase プロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com) にログイン
2. 「プロジェクトを追加」→ プロジェクト名(例: `sns-app-tsuguchi`)を入力
3. Google アナリティクスは任意(個人開発なら無効でOK)
4. 作成完了

## 2. サービスの有効化

### Authentication
1. 左メニュー > Authentication > 「始める」
2. Sign-in method タブ > **メール/パスワード** を有効化

### Cloud Firestore
1. 左メニュー > Firestore Database > 「データベースの作成」
2. **本番モード** で開始(Security Rules はあとで CLI からデプロイ)
3. ロケーション: `asia-northeast1`(東京)推奨

### Cloud Storage
1. 左メニュー > Storage > 「始める」
2. **Blaze プランへのアップグレード** が必要な場合あり(現Firebase仕様。クレジットカード登録が必要)
3. ロケーション: Firestore と同じ `asia-northeast1`

> 💡 Storage は Spark プラン(無料)では新規プロジェクトで使えなくなりました。利用するには Blaze プラン(従量課金)へのアップグレードが必要です。無料枠は維持されるので、想定外の高額請求を防ぐため **予算アラート** の設定を強く推奨。

---

## 3. Web アプリの登録と設定値の取得

1. プロジェクト概要(歯車アイコン) > 「マイアプリ」 > **Web (`</>`)** アイコンをクリック
2. アプリ名を入力(例: `sns-app-web`)
3. Firebase Hosting は不要(チェックを外す)
4. 表示される `firebaseConfig` の値をコピー:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123..."
};
```

## 4. ローカル設定の更新

### `.env.local` を実値に書き換え

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abc123...
NEXT_PUBLIC_USE_FIREBASE_EMULATOR=false
```

### `.firebaserc` を実プロジェクトIDに書き換え

```json
{
  "projects": {
    "default": "your-project"
  }
}
```

---

## 5. Firebase CLI でのログインとデプロイ

```bash
# Firebase CLI ログイン(ブラウザで認証)
npx firebase login

# プロジェクトを確認
npx firebase projects:list

# Firestore Rules / Indexes / Storage Rules をデプロイ
npx firebase deploy --only firestore:rules,firestore:indexes,storage:rules
```

---

## 6. シードデータ(任意)

エミュレーター用のシードスクリプトは本番には流せません(`createUser` は管理API経由で本番に対しても可能ですが、本番用パスワードを書きたくないため)。
本番では通常、**サインアップ画面から手動でアカウントを作成** します。

---

## 7. 動作確認

```bash
npm run dev
# http://localhost:3000 で本番Firebaseに接続して動作するはず
```

ブラウザの DevTools > Network で Firestore へのリクエストが `firestore.googleapis.com` に飛んでいることを確認(`127.0.0.1:8080` に飛んでいたらエミュレーター接続のままなので `.env.local` を確認)。

---

## 開発・本番の切替

開発時はエミュレーター、本番接続時は実 Firebase に切り替えるには `.env.local` の `NEXT_PUBLIC_USE_FIREBASE_EMULATOR` を変更:

| 値 | 接続先 |
|---|---|
| `true` | ローカルエミュレーター(`npm run emulators` で起動が必要) |
| `false` | 本番 Firebase(`.env.local` の他の値も実値が必要) |

---

## トラブルシューティング

### `Error: Cannot run login in non-interactive mode`
- `firebase login` は対話的シェルで実行する必要があります(VSCode 統合ターミナル等で)。

### Workspace 組織で `Access blocked: 認証エラー`
- Google Workspace 管理者によって Firebase が許可されていない可能性。
- 個人 Gmail で別途プロジェクトを作るか、管理者に許可を依頼してください。

### `auth/operation-not-allowed`
- Authentication でメール/パスワード方式が有効化されていません。手順 2 を再確認。

### Storage アップロードが `403`
- Storage Rules がデプロイされていない、または Blaze プランへのアップグレードが必要。
