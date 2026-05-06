// ============================================================
// SNS-app プロトタイプ (UIモック / localStorage 永続化)
// ============================================================

const STORAGE_KEY = 'sns-app-state-v1';
const SESSION_KEY = 'sns-app-session-v1';
const MAX_TEXT = 280;
const MAX_IMAGES = 4;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// ---------- アバター(SVG DataURL)生成 ----------
function makeAvatarDataUrl(seed, color) {
  const initial = (seed || '?').charAt(0).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
    <rect width="96" height="96" fill="${color}"/>
    <text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle"
      font-family="-apple-system,sans-serif" font-size="48" font-weight="700" fill="#fff">${initial}</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

// ---------- 初期シードデータ ----------
function seedState() {
  const users = [
    { uid: 'u_alice', displayName: 'Alice', username: 'alice', bio: 'プロトタイプの主役です。', photoURL: makeAvatarDataUrl('A', '#1d9bf0'), createdAt: Date.now() - 86400000 * 10 },
    { uid: 'u_bob', displayName: 'Bob', username: 'bob_dev', bio: 'エンジニア / 個人開発', photoURL: makeAvatarDataUrl('B', '#f91880'), createdAt: Date.now() - 86400000 * 5 },
    { uid: 'u_carol', displayName: 'Carol', username: 'carol', bio: 'ねこ好き 🐱', photoURL: makeAvatarDataUrl('C', '#00ba7c'), createdAt: Date.now() - 86400000 * 3 }
  ];
  const posts = [
    { postId: 'p_1', authorId: 'u_alice', content: 'はじめての投稿!プロトタイプ動いてる?', imageUrls: [], quotedPostId: null, likeCount: 1, createdAt: Date.now() - 3600000 * 5 },
    { postId: 'p_2', authorId: 'u_bob', content: 'Next.js + Firebase でSNS作る予定。\nまずはUIから固める。', imageUrls: [], quotedPostId: null, likeCount: 0, createdAt: Date.now() - 3600000 * 3 },
    { postId: 'p_3', authorId: 'u_carol', content: 'タイムラインに表示されるかな?', imageUrls: [], quotedPostId: 'p_1', likeCount: 0, createdAt: Date.now() - 3600000 * 1 }
  ];
  const likes = [
    { postId: 'p_1', userId: 'u_bob', createdAt: Date.now() - 3600000 * 4 }
  ];
  return { users, posts, likes };
}

// ---------- State 管理 ----------
let state = loadState();
let session = loadSession();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  const seeded = seedState();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
  return seeded;
}
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || null; } catch (_) { return null; }
}
function saveSession(uid) {
  if (uid) localStorage.setItem(SESSION_KEY, JSON.stringify({ uid }));
  else localStorage.removeItem(SESSION_KEY);
  session = uid ? { uid } : null;
}

// ---------- ユーティリティ ----------
function $(sel, root = document) { return root.querySelector(sel); }
function $$(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
function uid(prefix) { return prefix + '_' + Math.random().toString(36).slice(2, 10); }
function findUser(id) { return state.users.find(u => u.uid === id); }
function findPost(id) { return state.posts.find(p => p.postId === id); }
function currentUser() { return session ? findUser(session.uid) : null; }
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'たった今';
  if (m < 60) return m + '分前';
  const h = Math.floor(m / 60);
  if (h < 24) return h + '時間前';
  const d = Math.floor(h / 24);
  return d + '日前';
}
function isLikedByMe(postId) {
  if (!session) return false;
  return state.likes.some(l => l.postId === postId && l.userId === session.uid);
}
function getLikeCount(postId) {
  return state.likes.filter(l => l.postId === postId).length;
}

// ---------- ログイン画面 ----------
function renderLogin() {
  const list = $('#login-user-list');
  list.innerHTML = state.users.map(u => `
    <button class="login-user-btn" data-uid="${u.uid}">
      <span class="avatar small" style="background-image:url('${u.photoURL}')"></span>
      <span>
        <div style="font-weight:700">${escapeHtml(u.displayName)}</div>
        <div style="color:var(--text-secondary); font-size:13px">@${escapeHtml(u.username)}</div>
      </span>
    </button>
  `).join('');
  list.onclick = e => {
    const btn = e.target.closest('.login-user-btn');
    if (!btn) return;
    saveSession(btn.dataset.uid);
    showMain();
  };
}

// ---------- 画面切替 ----------
function showLogin() {
  $('#screen-login').classList.remove('hidden');
  $('#screen-main').classList.add('hidden');
  renderLogin();
}
function showMain() {
  $('#screen-login').classList.add('hidden');
  $('#screen-main').classList.remove('hidden');
  renderCurrentUser();
  if (!location.hash) location.hash = '#home';
  else handleRoute();
}

function renderCurrentUser() {
  const u = currentUser();
  if (!u) return;
  $('#current-user').innerHTML = `
    <span class="avatar small" style="background-image:url('${u.photoURL}')"></span>
    <span>
      <div style="font-weight:700; font-size:14px">${escapeHtml(u.displayName)}</div>
      <div style="color:var(--text-secondary); font-size:12px">@${escapeHtml(u.username)}</div>
    </span>
  `;
}

// ---------- ルーティング ----------
function handleRoute() {
  const hash = location.hash || '#home';
  const [route, ...args] = hash.replace('#', '').split('/');
  $$('.view').forEach(v => v.classList.add('hidden'));
  $$('.nav-item').forEach(n => n.classList.remove('active'));
  if (route === 'home') {
    $('#view-home').classList.remove('hidden');
    $$('.nav-item[data-route="home"]').forEach(n => n.classList.add('active'));
    renderTimeline();
  } else if (route === 'profile') {
    $('#view-profile').classList.remove('hidden');
    $$('.nav-item[data-route="profile"]').forEach(n => n.classList.add('active'));
    const targetUid = args[0] || session.uid;
    renderProfile(targetUid);
  } else if (route === 'profile-edit') {
    $('#view-profile-edit').classList.remove('hidden');
    renderProfileEdit();
  } else if (route === 'post') {
    $('#view-post-detail').classList.remove('hidden');
    renderPostDetail(args[0]);
  } else {
    location.hash = '#home';
  }
}

// ---------- 投稿カード描画 ----------
function renderPostCard(post, opts = {}) {
  const author = findUser(post.authorId);
  if (!author) return '';
  const liked = isLikedByMe(post.postId);
  const likeCount = getLikeCount(post.postId);
  const isOwn = session && post.authorId === session.uid;
  const images = (post.imageUrls && post.imageUrls.length)
    ? `<div class="post-images count-${post.imageUrls.length}">
        ${post.imageUrls.map(src => `<img src="${src}" alt="" />`).join('')}
       </div>` : '';
  const quoted = post.quotedPostId ? renderQuotedPost(post.quotedPostId) : '';
  return `
    <article class="post-card" data-post-id="${post.postId}">
      <a href="#profile/${author.uid}" class="avatar-link" onclick="event.stopPropagation()">
        <span class="avatar" style="background-image:url('${author.photoURL}')"></span>
      </a>
      <div class="post-body">
        <div class="post-meta">
          <span class="display-name" data-link-user="${author.uid}">${escapeHtml(author.displayName)}</span>
          <span>@${escapeHtml(author.username)}</span>
          <span>·</span>
          <span>${timeAgo(post.createdAt)}</span>
          ${isOwn ? `<button class="menu-btn" data-action="delete" title="削除">🗑</button>` : ''}
        </div>
        <div class="post-content">${escapeHtml(post.content)}</div>
        ${images}
        ${quoted}
        <div class="post-actions">
          <button class="action-btn quote" data-action="quote" title="引用">💬 <span>引用</span></button>
          <button class="action-btn like ${liked ? 'active' : ''}" data-action="like" title="いいね">
            ${liked ? '❤️' : '🤍'} <span>${likeCount}</span>
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderQuotedPost(quotedId) {
  const q = findPost(quotedId);
  if (!q) {
    return `<div class="quoted-post deleted">この投稿は削除されました</div>`;
  }
  const author = findUser(q.authorId);
  if (!author) return `<div class="quoted-post deleted">この投稿は削除されました</div>`;
  const images = (q.imageUrls && q.imageUrls.length)
    ? `<div class="post-images count-${Math.min(q.imageUrls.length, 4)}">
        ${q.imageUrls.slice(0, 4).map(src => `<img src="${src}" alt="" />`).join('')}
       </div>` : '';
  return `
    <div class="quoted-post" data-quoted-id="${q.postId}">
      <div class="post-meta">
        <span class="avatar small" style="background-image:url('${author.photoURL}'); width:20px; height:20px"></span>
        <span class="display-name">${escapeHtml(author.displayName)}</span>
        <span>@${escapeHtml(author.username)}</span>
        <span>·</span>
        <span>${timeAgo(q.createdAt)}</span>
      </div>
      <div class="post-content" style="font-size:14px">${escapeHtml(q.content)}</div>
      ${images}
    </div>
  `;
}

// ---------- タイムライン ----------
function renderTimeline() {
  const tl = $('#timeline');
  const sorted = [...state.posts].sort((a, b) => b.createdAt - a.createdAt);
  if (!sorted.length) {
    tl.innerHTML = `<div class="empty-state">まだ投稿がありません。最初の投稿をしてみましょう!</div>`;
    return;
  }
  tl.innerHTML = sorted.map(p => renderPostCard(p)).join('');
}

// ---------- 投稿詳細 ----------
function renderPostDetail(postId) {
  const post = findPost(postId);
  const c = $('#post-detail-content');
  if (!post) {
    c.innerHTML = `<div class="empty-state">この投稿は削除されたか見つかりません。</div>`;
    return;
  }
  c.innerHTML = renderPostCard(post);
}

// ---------- プロフィール ----------
function renderProfile(targetUid) {
  const user = findUser(targetUid);
  const c = $('#profile-content');
  if (!user) {
    c.innerHTML = `<div class="empty-state">ユーザーが見つかりません。</div>`;
    return;
  }
  const isMe = session && user.uid === session.uid;
  const userPosts = state.posts
    .filter(p => p.authorId === user.uid)
    .sort((a, b) => b.createdAt - a.createdAt);
  c.innerHTML = `
    <div class="profile-header">
      <div class="profile-top">
        <span class="avatar" style="background-image:url('${user.photoURL}'); width:100px; height:100px"></span>
        ${isMe ? `<a href="#profile-edit" class="btn-secondary" style="text-decoration:none">プロフィール編集</a>` : ''}
      </div>
      <div class="display-name">${escapeHtml(user.displayName)}</div>
      <div class="username">@${escapeHtml(user.username)}</div>
      <div class="bio">${escapeHtml(user.bio || '')}</div>
    </div>
    <div class="post-list">
      ${userPosts.length ? userPosts.map(p => renderPostCard(p)).join('') : '<div class="empty-state">まだ投稿がありません。</div>'}
    </div>
  `;
}

// ---------- プロフィール編集 ----------
function renderProfileEdit() {
  const u = currentUser();
  if (!u) return;
  const f = $('#profile-edit-form');
  f.displayName.value = u.displayName;
  f.username.value = u.username;
  f.bio.value = u.bio || '';
}
$('#profile-edit-form').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.currentTarget;
  const u = currentUser();
  u.displayName = f.displayName.value.trim() || u.displayName;
  u.username = f.username.value.trim() || u.username;
  u.bio = f.bio.value.trim();
  const file = f.avatar.files[0];
  if (file) {
    if (file.size > MAX_FILE_SIZE) { alert('画像が大きすぎます(5MBまで)'); return; }
    u.photoURL = await fileToDataUrl(file);
  }
  saveState();
  renderCurrentUser();
  location.hash = `#profile/${u.uid}`;
});

// ---------- 投稿コンポーザー ----------
const composer = {
  modal: $('#composer-modal'),
  text: $('#composer-text'),
  counter: $('#composer-counter'),
  submit: $('#composer-submit'),
  imageInput: $('#composer-image-input'),
  preview: $('#composer-image-preview'),
  quotedBox: $('#composer-quoted'),
  title: $('#composer-title'),
  images: [],
  quotedId: null
};

function openComposer(quotedId = null) {
  composer.images = [];
  composer.quotedId = quotedId;
  composer.text.value = '';
  composer.preview.innerHTML = '';
  composer.imageInput.value = '';
  composer.title.textContent = quotedId ? '引用ポスト' : '新規投稿';
  if (quotedId) {
    composer.quotedBox.innerHTML = renderQuotedPost(quotedId);
    composer.quotedBox.classList.remove('hidden');
  } else {
    composer.quotedBox.classList.add('hidden');
    composer.quotedBox.innerHTML = '';
  }
  updateComposerCounter();
  composer.modal.classList.remove('hidden');
  setTimeout(() => composer.text.focus(), 50);
}
function closeComposer() {
  composer.modal.classList.add('hidden');
}
function updateComposerCounter() {
  const len = composer.text.value.length;
  composer.counter.textContent = (MAX_TEXT - len);
  composer.counter.classList.toggle('warn', len > MAX_TEXT - 20);
  const valid = (composer.text.value.trim().length > 0 || composer.images.length > 0) && len <= MAX_TEXT;
  composer.submit.disabled = !valid;
}
composer.text.addEventListener('input', updateComposerCounter);
$('#open-composer').addEventListener('click', () => openComposer());

composer.imageInput.addEventListener('change', async e => {
  const files = Array.from(e.target.files);
  for (const f of files) {
    if (composer.images.length >= MAX_IMAGES) { alert(`画像は最大${MAX_IMAGES}枚まで`); break; }
    if (f.size > MAX_FILE_SIZE) { alert(`${f.name} は5MBを超えています`); continue; }
    const url = await fileToDataUrl(f);
    composer.images.push(url);
  }
  renderComposerPreview();
  composer.imageInput.value = '';
  updateComposerCounter();
});
function renderComposerPreview() {
  composer.preview.innerHTML = composer.images.map((src, i) => `
    <div class="preview-item">
      <img src="${src}" alt="" />
      <button class="remove-img" data-remove-img="${i}">×</button>
    </div>
  `).join('');
}
composer.preview.addEventListener('click', e => {
  const btn = e.target.closest('[data-remove-img]');
  if (!btn) return;
  composer.images.splice(Number(btn.dataset.removeImg), 1);
  renderComposerPreview();
  updateComposerCounter();
});

composer.submit.addEventListener('click', () => {
  const text = composer.text.value.trim();
  if (!text && composer.images.length === 0) return;
  const post = {
    postId: uid('p'),
    authorId: session.uid,
    content: text,
    imageUrls: [...composer.images],
    quotedPostId: composer.quotedId,
    likeCount: 0,
    createdAt: Date.now()
  };
  state.posts.push(post);
  saveState();
  closeComposer();
  if ((location.hash || '#home').startsWith('#home')) renderTimeline();
  else location.hash = '#home';
});

document.addEventListener('click', e => {
  if (e.target.closest('[data-close-modal]')) closeComposer();
});

// ---------- 投稿アクション(委譲) ----------
document.addEventListener('click', e => {
  // 引用元プレビューのクリック → 投稿詳細へ
  const quoted = e.target.closest('.quoted-post[data-quoted-id]');
  if (quoted && !e.target.closest('.post-card .post-actions')) {
    e.stopPropagation();
    location.hash = `#post/${quoted.dataset.quotedId}`;
    return;
  }
  // ユーザー名 → プロフィール
  const userLink = e.target.closest('[data-link-user]');
  if (userLink) {
    e.stopPropagation();
    location.hash = `#profile/${userLink.dataset.linkUser}`;
    return;
  }
  // アバターリンク
  const avatarLink = e.target.closest('.avatar-link');
  if (avatarLink) {
    e.stopPropagation();
    return;
  }
  // 投稿アクション
  const actionBtn = e.target.closest('[data-action]');
  if (actionBtn) {
    e.stopPropagation();
    const card = actionBtn.closest('[data-post-id]');
    if (!card) return;
    const postId = card.dataset.postId;
    const action = actionBtn.dataset.action;
    if (action === 'like') toggleLike(postId);
    else if (action === 'delete') deletePost(postId);
    else if (action === 'quote') openComposer(postId);
    return;
  }
  // 投稿カード本体 → 詳細へ
  const card = e.target.closest('.post-card');
  if (card && !e.target.closest('.post-actions') && !e.target.closest('[data-action]')) {
    location.hash = `#post/${card.dataset.postId}`;
  }
});

// 戻るボタン
document.addEventListener('click', e => {
  if (e.target.closest('[data-back]')) history.back();
});

// ---------- いいね ----------
function toggleLike(postId) {
  if (!session) return;
  const idx = state.likes.findIndex(l => l.postId === postId && l.userId === session.uid);
  if (idx >= 0) state.likes.splice(idx, 1);
  else state.likes.push({ postId, userId: session.uid, createdAt: Date.now() });
  saveState();
  rerenderCurrentView();
}

// ---------- 削除 ----------
function deletePost(postId) {
  const post = findPost(postId);
  if (!post || post.authorId !== session.uid) return;
  if (!confirm('この投稿を削除しますか?')) return;
  state.posts = state.posts.filter(p => p.postId !== postId);
  state.likes = state.likes.filter(l => l.postId !== postId);
  saveState();
  // 投稿詳細から削除した場合は戻る
  if ((location.hash || '').startsWith('#post/')) {
    history.back();
  } else {
    rerenderCurrentView();
  }
}

function rerenderCurrentView() {
  const route = (location.hash || '#home').replace('#', '').split('/')[0];
  if (route === 'home') renderTimeline();
  else if (route === 'profile') {
    const args = (location.hash || '').replace('#profile', '').replace('/', '');
    renderProfile(args || session.uid);
  } else if (route === 'post') {
    const id = (location.hash || '').replace('#post/', '');
    renderPostDetail(id);
  }
}

// ---------- ログアウト ----------
$('#logout-btn').addEventListener('click', () => {
  saveSession(null);
  location.hash = '';
  showLogin();
});

// ---------- 起動 ----------
window.addEventListener('hashchange', handleRoute);
if (session && findUser(session.uid)) showMain();
else showLogin();
