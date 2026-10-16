'use strict';

const $ = s => document.querySelector(s);
const view = $('#view');

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

function setLoading() { view.className = 'loading'; view.textContent = 'Loading…'; }
function setError(msg) { view.className = 'error'; view.textContent = msg; }

// ---------- SVG 图标 ----------
const ICON = {
  pr: `<svg class="row-icon" viewBox="0 0 16 16" fill="#3fb950"><path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z"/></svg>`,
  prDraft: `<svg class="row-icon" viewBox="0 0 16 16" fill="#9198a1"><path d="M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354ZM3.75 2.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm0 9.5a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm8.25.75a.75.75 0 1 0 1.5 0 .75.75 0 0 0-1.5 0Z"/></svg>`,
  issue: `<svg class="row-icon" viewBox="0 0 16 16" fill="#3fb950"><path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"/><path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"/></svg>`,
  repo: `<svg class="row-icon" viewBox="0 0 16 16" fill="#9198a1"><path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z"/></svg>`,
  sparkle: `<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M7.998 15.035c-4.562 0-7.873-2.914-7.998-3.749V9.338c.085-.628.677-1.686 1.588-2.065.013-.07.024-.143.036-.218.029-.183.06-.384.126-.612-.201-.508-.254-1.084-.254-1.656 0-.87.128-1.769.693-2.484.579-.733 1.494-1.124 2.724-1.261 1.206-.134 2.262.034 2.944.765.05.053.096.108.139.165.044-.057.094-.112.143-.165.682-.731 1.738-.899 2.944-.765 1.23.137 2.145.528 2.724 1.261.566.715.693 1.614.693 2.484 0 .572-.053 1.148-.254 1.656.066.228.098.429.126.612.012.076.024.148.037.218.924.385 1.522 1.471 1.591 2.095v1.872c0 .766-3.351 3.795-8.002 3.795Z"/></svg>`
};

// ---------- 用户 ----------
async function showUser() {
  try {
    const u = await API('me');
    const login = u.login || '?';
    const avatar = u.avatar_url || '';
    $('#avatar-img').src = avatar;
    $('#sb-avatar').src = avatar;
    $('#sb-login').textContent = login;
  } catch {
    $('#sb-login').textContent = '未登录';
  }
}

// ---------- 侧边栏仓库 ----------
async function showSidebarRepos() {
  try {
    const repos = await API('repos');
    const top = repos.slice(0, 8);
    $('#sb-repos').innerHTML = top.map(r => `
      <a class="sb-repo" data-slug="${esc(r.nameWithOwner)}">
        <img src="${esc($('#avatar-img').src)}" alt="">
        <span>${esc(r.nameWithOwner)}</span>
      </a>
    `).join('');
    $('#sb-repos').querySelectorAll('.sb-repo').forEach(el => {
      el.onclick = e => { e.preventDefault(); showRepo(el.dataset.slug, 'issues'); };
    });
  } catch {}
}

// ---------- Dashboard ----------
async function showDashboard() {
  setLoading();
  try {
    const d = await API('dashboard');
    const { prs = [], issues = [], repos = [] } = d || {};

    view.className = '';
    view.innerHTML = `
      <div class="dash">

        <div class="copilot-card">
          <h2 class="copilot-greeting">Good evening, ${esc($('#sb-login').textContent)}!</h2>
          <div class="copilot-input">
            ${ICON.sparkle}
            <span class="placeholder">Ask anything or type @ to add context</span>
          </div>
          <div class="copilot-tags">
            <button class="copilot-tag">Debug</button>
            <button class="copilot-tag">Agent</button>
            <button class="copilot-tag">Create issue</button>
            <button class="copilot-tag">Write code</button>
            <button class="copilot-tag">Git</button>
            <button class="copilot-tag">Pull requests</button>
          </div>
        </div>

        <div class="card">
          <div class="card-hdr">
            <h3>Pull requests</h3>
            <a href="#" id="view-all-prs">View all</a>
          </div>
          <div class="card-body">
            ${prs.length ? prs.map(p => `
              <div class="row" data-kind="pr" data-repo="${esc(repoName(p.repository))}" data-num="${p.number}">
                ${p.isDraft ? ICON.prDraft : ICON.pr}
                <div class="row-main">
                  <div class="row-title">${esc(p.title)}</div>
                  <div class="row-meta">
                    <span class="mono">${esc(repoName(p.repository))}</span>
                    <span class="sep">·</span>
                    <span>#${p.number}</span>
                    <span class="sep">·</span>
                    <span>${fmtTime(p.updatedAt)}</span>
                  </div>
                </div>
              </div>
            `).join('') : '<div class="card-empty">No pull requests found.</div>'}
          </div>
        </div>

        <div class="card">
          <div class="card-hdr">
            <h3>Issues</h3>
            <a href="#" id="view-all-issues">View all</a>
          </div>
          <div class="card-body">
            ${issues.length ? issues.map(i => `
              <div class="row" data-kind="issue" data-repo="${esc(repoName(i.repository))}" data-num="${i.number}">
                ${ICON.issue}
                <div class="row-main">
                  <div class="row-title">${esc(i.title)}</div>
                  <div class="row-meta">
                    <span class="mono">${esc(repoName(i.repository))}</span>
                    <span class="sep">·</span>
                    <span>#${i.number}</span>
                    <span class="sep">·</span>
                    <span>${fmtTime(i.updatedAt)}</span>
                  </div>
                </div>
              </div>
            `).join('') : '<div class="card-empty">No issues found, try a different filter.</div>'}
          </div>
        </div>

      </div>
    `;

    view.querySelectorAll('.row').forEach(el => {
      el.onclick = () => {
        const repo = el.dataset.repo, num = el.dataset.num;
        if (el.dataset.kind === 'pr') showPR(repo, num);
        else showIssue(repo, num);
      };
    });
  } catch (e) {
    setError(e.message);
  }
}

// ---------- 仓库详情 ----------
async function showRepo(slug, tab) {
  setLoading();
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
    $('#back').onclick = e => { e.preventDefault(); showDashboard(); };
  } catch (e) {
    setError(e.message);
  }
}

// ---------- PR 详情 ----------
async function showPR(slug, num) {
  setLoading();
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
    $('#back').onclick = e => { e.preventDefault(); showDashboard(); };
  } catch (e) {
    setError(e.message);
  }
}

// ---------- 启动 ----------
$('#home-btn').onclick = e => { e.preventDefault(); showDashboard(); };
$('#avatar-btn').onclick = () => showDashboard();

showUser().then(() => {
  showSidebarRepos();
  showDashboard();
});