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
  const codes = [];
  let h = esc(s);
  // 代码块 → 占位符
  h = h.replace(/```[\w]*\n?([\s\S]*?)```/g, (_, c) => {
    codes.push(c);
    return `\x00CB${codes.length - 1}\x00`;
  });
  // 标题
  h = h.replace(/^###### (.+)$/gm, '<h6>$1</h6>');
  h = h.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
  h = h.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  h = h.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  h = h.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  h = h.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  // 行内代码
  h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
  // 加粗
  h = h.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // 链接
  h = h.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  // 列表项
  h = h.replace(/^[*-] (.+)$/gm, '<li>$1</li>');
  // 换行（跳过紧跟块标签后的）
  h = h.replace(/(?<![>])\n/g, '<br>');
  // 还原代码块
  h = h.replace(/\x00CB(\d+)\x00/g, (_, i) => `<pre><code>${codes[+i]}</code></pre>`);
  return h;
}

function b64decode(s) {
  try {
    const bin = atob(String(s).replace(/\s/g, ''));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder('utf-8').decode(bytes);
  } catch { return ''; }
}

function fmtBytes(n) {
  if (!n) return '';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(1) + ' MB';
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
  sparkle: `<svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M7.998 15.035c-4.562 0-7.873-2.914-7.998-3.749V9.338c.085-.628.677-1.686 1.588-2.065.013-.07.024-.143.036-.218.029-.183.06-.384.126-.612-.201-.508-.254-1.084-.254-1.656 0-.87.128-1.769.693-2.484.579-.733 1.494-1.124 2.724-1.261 1.206-.134 2.262.034 2.944.765.05.053.096.108.139.165.044-.057.094-.112.143-.165.682-.731 1.738-.899 2.944-.765 1.23.137 2.145.528 2.724 1.261.566.715.693 1.614.693 2.484 0 .572-.053 1.148-.254 1.656.066.228.098.429.126.612.012.076.024.148.037.218.924.385 1.522 1.471 1.591 2.095v1.872c0 .766-3.351 3.795-8.002 3.795Z"/></svg>`,
  folder: `<svg viewBox="0 0 16 16" width="16" height="16" fill="#54aeff"><path d="M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75Z"/></svg>`,
  file: `<svg viewBox="0 0 16 16" width="16" height="16" fill="#9198a1"><path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z"/></svg>`,
  branch: `<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="M9.5 3.25a2.25 2.25 0 1 1 3 2.122V6A2.5 2.5 0 0 1 10 8.5H6a1 1 0 0 0-1 1v1.128a2.251 2.251 0 1 1-1.5 0V5.372a2.25 2.25 0 1 1 1.5 0v1.836A2.493 2.493 0 0 1 6 7h4a1 1 0 0 0 1-1v-.628A2.25 2.25 0 0 1 9.5 3.25Z"/></svg>`,
  caret: `<svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor"><path d="m4.427 7.427 3.396 3.396a.25.25 0 0 0 .354 0l3.396-3.396A.25.25 0 0 0 11.396 7H4.604a.25.25 0 0 0-.177.427Z"/></svg>`,
  code: `<svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor"><path d="m11.28 3.22 4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L13.94 8l-3.72-3.72a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .734.215Zm-6.56 0a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L2.06 8l3.72 3.72a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L.47 8.53a.75.75 0 0 1 0-1.06Z"/></svg>`,
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
      el.onclick = e => { e.preventDefault(); showRepo(el.dataset.slug, 'code'); };
    });
  } catch {}
}

// ---------- Dashboard ----------
async function showDashboard() {
  document.body.dataset.page = 'dashboard';
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

// ---------- 仓库页（统一入口，tab = code | issues | pulls）----------
async function showRepo(slug, tab = 'code', path = '') {
  document.body.dataset.page = 'repo';
  setLoading();

  let repo;
  try {
    repo = await API('repo', slug);
  } catch (e) {
    setError(e.message);
    return;
  }

  const branch  = repo.default_branch || 'main';
  const htmlUrl = repo.html_url || `https://github.com/${slug}`;

  view.className = '';
  view.innerHTML = `
    <div class="back"><a href="#" id="back-dash">← Dashboard</a></div>
    <div class="repo-header">
      <img class="avatar" src="${esc(repo.owner?.avatar_url || '')}" alt="">
      <div class="repo-title">
        <span class="owner">${esc(repo.owner?.login || '')}</span>
        <span class="slash">/</span>
        <strong class="name">${esc(repo.name || '')}</strong>
        <span class="badge-public">${repo.private ? 'Private' : 'Public'}</span>
      </div>
      <div class="repo-actions">
        <button>Pin</button>
        <button>Watch</button>
        <button>Fork</button>
        <button>Star</button>
      </div>
    </div>
    <nav class="repo-tabs">
      <a class="repo-tab ${tab === 'code'   ? 'active' : ''}" data-tab="code">Code</a>
      <a class="repo-tab ${tab === 'issues' ? 'active' : ''}" data-tab="issues">Issues</a>
      <a class="repo-tab ${tab === 'pulls'  ? 'active' : ''}" data-tab="pulls">Pull requests</a>
    </nav>
    <div id="repo-body"></div>
  `;

  $('#back-dash').onclick = e => { e.preventDefault(); showDashboard(); };
  view.querySelectorAll('.repo-tab').forEach(t => {
    t.onclick = e => {
      e.preventDefault();
      showRepo(slug, t.dataset.tab, '');
    };
  });

  const body = $('#repo-body');
  if (tab === 'code')       await renderRepoCode(body, slug, branch, path, htmlUrl);
  else if (tab === 'issues') await renderRepoIssues(body, slug);
  else                       await renderRepoPulls(body, slug);
}

// ---------- Code 页内容 ----------
async function renderRepoCode(body, slug, branch, path, htmlUrl) {
  body.innerHTML = '<div class="loading">加载中…</div>';

  const [contents, readme] = await Promise.all([
    API('contents', slug, path).catch(() => []),
    path === '' ? API('readme', slug).catch(() => null) : Promise.resolve(null)
  ]);

  const items = Array.isArray(contents) ? contents.slice() : [];
  items.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  // 面包屑
  const parts = path.split('/').filter(Boolean);
  const crumbs = [`<a href="#" data-path="">${esc(slug.split('/')[1] || 'root')}</a>`];
  let acc = '';
  parts.forEach(p => {
    acc = acc ? `${acc}/${p}` : p;
    crumbs.push(`<a href="#" data-path="${esc(acc)}">${esc(p)}</a>`);
  });

  const fileRows = items.map(it => {
    const isDir = it.type === 'dir';
    const icon  = isDir ? ICON.folder : ICON.file;
    const href  = isDir
      ? '#'
      : `${htmlUrl}/blob/${branch}/${it.path.split('/').map(encodeURIComponent).join('/')}`;
    const target = isDir ? '' : ' target="_blank" rel="noopener"';
    return `
      <div class="file-row" ${isDir ? `data-path="${esc(it.path)}"` : ''}>
        <a class="file-icon" href="${href}"${target}>${icon}</a>
        <a class="file-name" href="${href}"${target}>${esc(it.name)}</a>
        <span class="file-size">${isDir ? '' : fmtBytes(it.size || 0)}</span>
      </div>
    `;
  }).join('');

  const readmeHtml = (readme && readme.content)
    ? `<div class="readme-box">${md(b64decode(readme.content))}</div>`
    : '';

  body.innerHTML = `
    <div class="repo-toolbar">
      <button class="branch-btn">
        ${ICON.branch}<span>${esc(branch)}</span>${ICON.caret}
      </button>
      <div class="repo-toolbar-right">
        <a href="#" id="go-branches">Branches</a>
        <a href="#" id="go-tags">Tags</a>
        <a class="code-btn" href="${htmlUrl}" target="_blank" rel="noopener">
          ${ICON.code}<span>Code</span>
        </a>
      </div>
    </div>
    ${parts.length ? `<div class="breadcrumb">${crumbs.join(' / ')}</div>` : ''}
    <div class="file-list">
      ${fileRows || '<div class="card-empty">空仓库</div>'}
    </div>
    ${readmeHtml}
  `;

  body.querySelectorAll('.file-row[data-path]').forEach(el => {
    el.onclick = e => {
      if (e.target.closest('a')) return;
      e.preventDefault();
      showRepo(slug, 'code', el.dataset.path);
    };
  });

  body.querySelectorAll('.breadcrumb a').forEach(el => {
    el.onclick = e => {
      e.preventDefault();
      showRepo(slug, 'code', el.dataset.path || '');
    };
  });
}

// ---------- Issues 页内容 ----------
async function renderRepoIssues(body, slug) {
  body.innerHTML = '<div class="loading">加载中…</div>';
  try {
    const list = await API('issues', slug);
    if (!list.length) {
      body.innerHTML = '<div class="card-empty">这个仓库没有开着的 Issue</div>';
      return;
    }
    body.innerHTML = list.map(it => `
      <div class="item" data-num="${it.number}">
        <div class="title">
          <span class="badge ${it.state === 'OPEN' ? 'open' : ''}">${esc(it.state)}</span>
          ${esc(it.title)}
        </div>
        <div class="meta">
          #${it.number} · ${esc(authorLogin(it.author))} · ${fmtTime(it.updatedAt)}
        </div>
      </div>
    `).join('');
    body.querySelectorAll('.item').forEach(el => {
      el.onclick = () => showIssue(slug, el.dataset.num);
    });
  } catch (e) {
    body.innerHTML = `<div class="error">${esc(e.message)}</div>`;
  }
}

// ---------- Pulls 页内容 ----------
async function renderRepoPulls(body, slug) {
  body.innerHTML = '<div class="loading">加载中…</div>';
  try {
    const list = await API('pulls', slug);
    if (!list.length) {
      body.innerHTML = '<div class="card-empty">这个仓库没有开着的 PR</div>';
      return;
    }
    body.innerHTML = list.map(it => `
      <div class="item" data-num="${it.number}">
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
    body.querySelectorAll('.item').forEach(el => {
      el.onclick = () => showPR(slug, el.dataset.num);
    });
  } catch (e) {
    body.innerHTML = `<div class="error">${esc(e.message)}</div>`;
  }
}

// ---------- Issue 详情 ----------
async function showIssue(slug, num) {
  document.body.dataset.page = 'repo';
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
  document.body.dataset.page = 'repo';
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