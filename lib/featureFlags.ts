/**
 * 機能フラグ。環境変数経由でON/OFFを切り替える。
 * Storage を使う機能(画像投稿・アバター画像アップロード)は Blaze プランが必要なため、
 * Spark プランで運用するときは false にしておく。
 */
export const STORAGE_ENABLED = process.env.NEXT_PUBLIC_STORAGE_ENABLED === 'true';
