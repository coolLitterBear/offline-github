'use strict';

const $ = s => document.querySelector(s);
const view = $('#view');
const titleEl = $('#title');

// ---------- 工具 ----------
const esc = s => String(s ?? '').replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const fmtTime = t => {
  if (!t) return '';
  const d = new Date(t);
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
  if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
  if (diff < 86400 * 30) return Math.floor(diff / 86400) + ' 天前';
  return d.toLocaleDateString();
};

const authorLogin = a => (a && typeof a === 'object') ? (a.login || '') : String(a || '');
const repoName    = r => (r && typeof r === 'object') ? (r.nameWithOwner || r.name || '') : String(r || '');

function md(s) {
  if (!s) return '';
  let h = esc(s);
  h = h.replace(/```([\s\S]*?)```/g, (_, c) => `<pre><code>${c}</code></pre>`);
  h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
  h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  h = h.replace(/\n/g, '<br>');
  return h;
}

// ---------- API ----------
async function API(action, ...args) {
  const r = await fetch('/api/invoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, args })
  });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || 'unknown error');
  return j.data;
}

function setLoading() { view.className = 'loading'; view.textContent = '加载中…'; }
function setError(msg) { view.className = 'error'; view.textContent = msg; }

// ---------- 用户 ----------
function showUser() {
  API('me')
    .then(u => { $('#user').textContent = '@' + (u.login || '?'); })
    .catch(() => { $('#user').textContent = '未登录'; });
}

// ---------- Dashboard ----------
async function showDashboard() {
  setLoading();
  titleEl.textContent = 'Better GitHub';
  try {
    const d = await API('dashboard');
    const { prs = [], issues = [], repos = [] } = d || {};

    view.className = '';
    view.innerHTML = `
      <div class="dash">
        <div class="dash-col">
          <h3>我的 Pull Requests</h3>
          ${prs.length ? prs.map(p => `
            <a class="dash-item" data-kind="pr" data-repo="${esc(repoName(p.repository))}" data-num="${p.number}">
              <div class="t">${esc(p.title)}</div>
              <div class="s">
                ${p.isDraft ? 'Draft · ' : ''}${esc(repoName(p.repository))} #${p.number} · ${fmtTime(p.updatedAt)}
              </div>
            </a>
          `).join('') : '<div class="dash-empty">没有开着的 PR</div>'}
        </div>

        <div class="dash-col">
          <h3>我的 Issues</h3>
          ${issues.length ? issues.map(i => `
            <a class="dash-item" data-kind="issue" data-repo="${esc(repoName(i.repository))}" data-num="${i.number}">
              <div class="t">${esc(i.title)}</div>
              <div class="s">${esc(repoName(i.repository))} #${i.number} · ${fmtTime(i.updatedAt)}</div>
            </a>
          `).join('') : '<div class="dash-empty">没有开着的 Issue</div>'}
        </div>

        <div class="dash-col">
          <h3>最近更新的仓库</h3>
          ${repos.length ? repos.map(r => `
            <a class="dash-item" data-kind="repo" data-repo="${esc(r.nameWithOwner)}">
              <div class="t">${esc(r.nameWithOwner)}</div>
              <div class="s">
                ${r.primaryLanguage ? esc(r.primaryLanguage.name) + ' · ' : ''}★ ${r.stargazerCount} · ${fmtTime(r.updatedAt)}
              </div>
            </a>
          `).join('') : '<div class="dash-empty">没有仓库</div>'}
        </div>
      </div>
    `;

    view.querySelectorAll('.dash-item').forEach(el => {
      el.onclick = e => {
        e.preventDefault();
        const repo = el.dataset.repo, num = el.dataset.num, kind = el.dataset.kind;
        if (kind === 'repo')      showRepo(repo, 'issues');
        else if (kind === 'pr')   showPR(repo, num);
        else                      showIssue(repo, num);
      };
    });
  } catch (e) {
    setError(e.message);
  }
}

// ---------- 仓库列表 ----------
async function showRepos() {
  setLoading();
  titleEl.textContent = '所有仓库';
  try {
    const repos = await API('repos');
    if (!repos.length) { setError('没有仓库'); return; }
    view.className = '';
    view.innerHTML = `
      <div class="back"><a href="#" id="back">← 返回 Dashboard</a></div>
    ` + repos.map(r => `
      <div class="item" data-slug="${esc(r.nameWithOwner)}">
        <div class="title">${esc(r.nameWithOwner)}</div>
        ${r.description ? `<div class="desc">${esc(r.description)}</div>` : ''}
        <div class="meta">
          ${r.primaryLanguage ? `<span class="badge">${esc(r.primaryLanguage.name)}</span>` : ''}
          ★ ${r.stargazerCount} · 更新于 ${fmtTime(r.updatedAt)}
          ${r.isPrivate ? ' · 🔒 私有' : ''}
        </div>
      </div>
    `).join('');
    $('#back').onclick = e => { e.preventDefault(); showDashboard(); };
    view.querySelectorAll('.item').forEach(el => {
      el.onclick = () => showRepo(el.dataset.slug, 'issues');
    });
  } catch (e) {
    setError(e.message);
  }
}

// ---------- 仓库详情 ----------
async function showRepo(slug, tab) {
  setLoading();
  titleEl.textContent = slug;
  try {
    const [issues, pulls] = await Promise.all([
      API('issues', slug).catch(() => []),
      API('pulls', slug).catch(() => [])
    ]);
    const list = tab === 'pulls' ? pulls : issues;
    view.className = '';
    view.innerHTML = `
      <div class="back"><a href="#" id="back">← 返回 Dashboard</a></div>
      <div class="tabs">
        <button data-tab="issues" class="${tab === 'issues' ? 'active' : ''}">Issues (${issues.length})</button>
        <button data-tab="pulls"  class="${tab === 'pulls'  ? 'active' : ''}">Pull Requests (${pulls.length})</button>
      </div>
      <div id="list"></div>
    `;
    $('#back').onclick = e => { e.preventDefault(); showDashboard(); };
    view.querySelectorAll('.tabs button').forEach(b => {
      b.onclick = () => showRepo(slug, b.dataset.tab);
    });
    const listEl = $('#list');
    if (!list.length) {
      listEl.className = 'loading';
      listEl.textContent = tab === 'pulls' ? '这个仓库没有开着的 PR' : '这个仓库没有开着的 Issue';
      return;
    }
    listEl.innerHTML = list.map(it => `
      <div class="item" data-num="${it.number}" data-kind="${tab}">
        <div class="title">
          <span class="badge ${it.state === 'OPEN' ? 'open' : ''}">${esc(it.state)}</span>
          ${it.isDraft ? '<span class="badge draft">Draft</span>' : ''}
          ${esc(it.title)}
        </div>
        <div class="meta">
          #${it.number} · ${esc(authorLogin(it.author))} · ${fmtTime(it.updatedAt)}
          ${it.comments ? ` · 💬 ${it.comments}` : ''}
        </div>
      </div>
    `).join('');
    listEl.querySelectorAll('.item').forEach(el => {
      el.onclick = () => {
        const n = el.dataset.num;
        if (el.dataset.kind === 'pulls') showPR(slug, n);
        else showIssue(slug, n);
      };
    });
  } catch (e) {
    setError(e.message);
  }
}

// ---------- Issue 详情 ----------
async function showIssue(slug, num) {
  setLoading();
  titleEl.textContent = `${slug} #${num}`;
  try {
    const it = await API('issue', slug, String(num));
    const comments = it.comments || [];
    view.className = '';
    view.innerHTML = `
      <div class="back"><a href="#" id="back">← 返回</a></div>
      <div class="detail">
        <h2>
          <span class="badge ${it.state === 'OPEN' ? 'open' : ''}">${esc(it.state)}</span>
          ${esc(it.title)}
        </h2>
        <div class="meta">
          #${it.number} · ${esc(authorLogin(it.author))} · 开启于 ${fmtTime(it.createdAt)}
        </div>
        <div class="body">${md(it.body)}</div>
        <h3>评论 (${comments.length})</h3>
        ${comments.map(c => `
          <div class="comment">
            <div class="meta">${esc(authorLogin(c.author))} · ${fmtTime(c.createdAt)}</div>
            <div>${md(c.body)}</div>
          </div>
        `).join('')}
      </div>
    `;
    $('#back').onclick = e => { e.preventDefault(); showRepo(slug, 'issues'); };
  } catch (e) {
    setError(e.message);
  }
}

// ---------- PR 详情 ----------
async function showPR(slug, num) {
  setLoading();
  titleEl.textContent = `${slug} #${num}`;
  try {
    const it = await API('pr', slug, String(num));
    const comments = it.comments || [];
    const files = it.files || [];
    view.className = '';
    view.innerHTML = `
      <div class="back"><a href="#" id="back">← 返回</a></div>
      <div class="detail">
        <h2>
          <span class="badge ${it.state === 'OPEN' ? 'open' : ''}">${esc(it.state)}</span>
          ${esc(it.title)}
        </h2>
        <div class="meta">
          #${it.number} · ${esc(authorLogin(it.author))} · 开启于 ${fmtTime(it.createdAt)}
        </div>
        <div class="diffstat">
          <span class="add">+${it.additions ?? 0}</span>
          <span class="del">−${it.deletions ?? 0}</span>
          · ${files.length} 个文件
        </div>
        <div class="body">${md(it.body)}</div>
        <h3>评论 (${comments.length})</h3>
        ${comments.map(c => `
          <div class="comment">
            <div class="meta">${esc(authorLogin(c.author))} · ${fmtTime(c.createdAt)}</div>
            <div>${md(c.body)}</div>
          </div>
        `).join('')}
      </div>
    `;
    $('#back').onclick = e => { e.preventDefault(); showRepo(slug, 'pulls'); };
  } catch (e) {
    setError(e.message);
  }
}

// ---------- 启动 ----------
titleEl.onclick = () => showDashboard();

showUser();
showDashboard();