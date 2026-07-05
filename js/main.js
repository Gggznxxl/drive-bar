// ============================================
//  开车吧 — 主逻辑
//  数据获取 / 分层渲染 / 视频弹窗
// ============================================

const app = document.getElementById('app');

// --- 视频播放弹窗 ---
const modal = document.getElementById('videoModal');
const modalIframe = document.getElementById('modalIframe');
const modalTitle = document.getElementById('modalTitle');
const modalDesc = document.getElementById('modalDesc');
const modalClose = document.getElementById('modalClose');
const modalBackdrop = document.getElementById('modalBackdrop');

// B站BV号格式：BV + 10位字母数字
function isValidBvid(bvid) {
  return typeof bvid === 'string' && /^BV[a-zA-Z0-9]{10}$/.test(bvid);
}

function openVideo({ bvid, title, desc }) {
  if (!isValidBvid(bvid)) {
    console.warn('无效的BV号，拒绝加载:', bvid);
    return;
  }
  modalIframe.src = `https://player.bilibili.com/player.html?bvid=${bvid}&page=1&danmaku=0&high_quality=1&autoplay=0`;
  modalTitle.textContent = title;
  modalDesc.textContent = desc || '';
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeVideo() {
  modalIframe.src = '';
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

modalClose.addEventListener('click', closeVideo);
modalBackdrop.addEventListener('click', closeVideo);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal.classList.contains('active')) closeVideo();
});

// --- 工具函数 ---
function createVideoButton(video, className, dotClass) {
  return `
    <button class="${className}" data-bvid="${video.bvid}" data-title="${escapeHtml(video.title)}" data-desc="${escapeHtml(video.desc || '')}">
      <span class="${dotClass}"></span>
      <span class="grid-video-title">${escapeHtml(video.title)}</span>
      <span class="grid-video-duration">${escapeHtml(video.duration || '')}</span>
    </button>
  `;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// --- 委托事件：所有视频按钮点击 → 弹窗 ---
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-bvid]');
  if (!btn) return;
  openVideo({
    bvid: btn.dataset.bvid,
    title: btn.dataset.title,
    desc: btn.dataset.desc,
  });
});

// --- 渲染 ---
function render(data) {
  const high = data.filter((c) => c.priority === 'high');
  const medium = data.filter((c) => c.priority === 'medium');
  const low = data.filter((c) => c.priority === 'low');

  app.innerHTML = `
    ${renderCore(high)}
    ${renderGrid(medium)}
    ${renderCompact(low)}
  `;
}

// --- 核心区 (high) — 大幅卡片 + 标签 ---
function renderCore(categories) {
  if (!categories.length) return '';

  return `
    <section class="core-section">
      <h2 class="section-title">🔰 核心痛点</h2>
      <div class="core-cards">
        ${categories
          .map(
            (cat) => `
          <div class="core-card">
            <div class="core-card-header">
              <span class="core-card-icon">${cat.icon}</span>
              <h3 class="core-card-title">${escapeHtml(cat.title)}</h3>
            </div>
            <p class="core-card-desc">${escapeHtml(cat.description)}</p>
            <div class="core-card-tags">
              ${(cat.tags || [])
                .map((tag, i) => {
                  const video = cat.videos[i];
                  if (!video) return '';
                  return `
                  <button
                    class="core-tag"
                    data-bvid="${video.bvid}"
                    data-title="${escapeHtml(tag + ' — ' + video.title)}"
                    data-desc="${escapeHtml(video.desc || '')}"
                  >${escapeHtml(tag)}</button>
                `;
                })
                .join('')}
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    </section>
  `;
}

// --- 进阶区 (medium) — 3列网格 + 视频列表 ---
function renderGrid(categories) {
  if (!categories.length) return '';

  return `
    <section class="grid-section">
      <h2 class="section-title">📂 进阶路况</h2>
      <div class="category-grid">
        ${categories
          .map(
            (cat) => `
          <div class="grid-card">
            <div class="grid-card-header">
              <span class="grid-card-icon">${cat.icon}</span>
              <h3 class="grid-card-title">${escapeHtml(cat.title)}</h3>
            </div>
            <p class="grid-card-desc">${escapeHtml(cat.description)}</p>
            <div class="grid-card-videos">
              ${cat.videos
                .map((v) => createVideoButton(v, 'grid-video-item', 'grid-video-dot'))
                .join('')}
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    </section>
  `;
}

// --- 应急区 (low) — 紧凑卡片 ---
function renderCompact(categories) {
  if (!categories.length) return '';

  return `
    <section class="compact-section">
      <h2 class="section-title">💡 基础与应急锦囊</h2>
      <div class="compact-list">
        ${categories
          .map(
            (cat) => `
          <div class="compact-card">
            <div class="compact-card-header">
              <span class="compact-card-icon">${cat.icon}</span>
              <h3 class="compact-card-title">${escapeHtml(cat.title)}</h3>
            </div>
            <p class="compact-card-desc">${escapeHtml(cat.description)}</p>
            <div class="compact-video-list">
              ${cat.videos
                .map((v) => createVideoButton(v, 'compact-video-item', 'compact-video-dot'))
                .join('')}
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    </section>
  `;
}

// --- 欢迎弹窗（首次访问 + localStorage 记忆）---
function initWelcome() {
  const overlay = document.getElementById('welcomeOverlay');
  const dismissBtn = document.getElementById('welcomeDismiss');
  if (!overlay || !dismissBtn) return;

  // 7天内不再弹出
  const seen = localStorage.getItem('drivebar_welcome_seen');
  if (seen) {
    const seenTime = parseInt(seen, 10);
    if (Date.now() - seenTime < 7 * 24 * 60 * 60 * 1000) {
      overlay.classList.add('hidden');
      return;
    }
  }

  dismissBtn.addEventListener('click', () => {
    overlay.classList.add('hidden');
    localStorage.setItem('drivebar_welcome_seen', String(Date.now()));
  });
}

// --- 启动 ---
async function init() {
  initWelcome();
  try {
    const response = await fetch('/data/videos.json');
    if (!response.ok) throw new Error('数据加载失败');
    const data = await response.json();
    render(data);
  } catch (err) {
    app.innerHTML = `
      <div class="empty-state" style="text-align:center;padding:80px 20px;color:var(--text-muted);">
        <p style="font-size:3rem;margin-bottom:12px;">😵</p>
        <p>内容加载失败，请刷新页面重试</p>
      </div>
    `;
    console.error('加载数据失败:', err);
  }
}

document.addEventListener('DOMContentLoaded', init);
