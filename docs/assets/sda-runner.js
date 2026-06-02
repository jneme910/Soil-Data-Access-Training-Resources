/**
 * sda-runner.js — Shared SDA API query logic
 * Used across all training pages. Standalone — no external dependencies.
 */

const SDA_URL = 'https://sdmdataaccess.sc.egov.usda.gov/Tabular/post.rest';

const COMPANION_BASE = 'https://jneme910.github.io/NRCS-Soil-Data-Access';
const COMPANION_SQL_CATALOG = `${COMPANION_BASE}/data/sql-catalog.json`;
const COMPANION_RUNNER = `${COMPANION_BASE}/sql-runner.html`;

// ── SDA QUERY ──────────────────────────────────────────────────────────────
async function runSDAQuery(sql) {
  const body = new URLSearchParams({ query: sql, format: 'JSON' });
  const resp = await fetch(SDA_URL, { method: 'POST', body });
  if (!resp.ok) {
    let msg = `SDA returned HTTP ${resp.status}`;
    try { const t = await resp.text(); if (t) msg += ` — ${t.slice(0, 200)}`; } catch {}
    throw new Error(msg);
  }
  const data = await resp.json();
  if (!data.Table || data.Table.length < 1) return { headers: [], rows: [] };
  const [headers, ...rows] = data.Table;
  return { headers, rows };
}

// ── SQL PANEL WIRING ───────────────────────────────────────────────────────
function wireSQLPanel(panel) {
  const textarea = panel.querySelector('.sql-editor');
  const runBtn   = panel.querySelector('.btn-run');
  const copyBtn  = panel.querySelector('.btn-copy');
  const result   = panel.querySelector('.sql-result');
  if (!textarea || !runBtn) return;

  // Inject "Open in Runner" button if not already present
  let openBtn = panel.querySelector('.btn-open');
  if (!openBtn) {
    openBtn = document.createElement('button');
    openBtn.className = 'btn-open';
    openBtn.title = 'Open this query in the full Soil Intelligence SQL Runner';
    openBtn.textContent = '↗ Full Runner';
    runBtn.insertAdjacentElement('afterend', openBtn);
  }

  runBtn.addEventListener('click', async () => {
    const sql = textarea.value.trim();
    if (!sql) return;
    runBtn.disabled = true;
    runBtn.innerHTML = '<span class="spin">⟳</span> Querying…';
    result.innerHTML = '<div class="result-loading"><span class="spin">⟳</span> Connecting to SDA API…</div>';

    try {
      const { headers, rows } = await runSDAQuery(sql);
      runBtn.disabled = false;
      runBtn.innerHTML = '▶ Run on SDA';

      if (!rows.length) {
        result.innerHTML = '<div class="result-ok">✓ Query executed — 0 rows returned</div>';
        return;
      }
      result.innerHTML = `
        <div class="result-ok">✓ ${rows.length.toLocaleString()} row${rows.length !== 1 ? 's' : ''} returned</div>
        <div style="overflow-x:auto">
          <table class="result-table">
            <thead><tr>${headers.map(h => `<th>${esc(h || '')}</th>`).join('')}</tr></thead>
            <tbody>${rows.slice(0, 100).map(r =>
              `<tr>${r.map(c => `<td>${esc(c != null ? String(c) : '—')}</td>`).join('')}</tr>`
            ).join('')}</tbody>
          </table>
        </div>
        ${rows.length > 100 ? `<div style="padding:6px 12px;font-size:10px;color:var(--dim)">Showing 100 of ${rows.length} rows</div>` : ''}
      `;
    } catch (e) {
      runBtn.disabled = false;
      runBtn.innerHTML = '▶ Run on SDA';
      result.innerHTML = `<div class="result-err">✗ ${esc(e.message)}<br><small style="display:block;margin-top:4px">Queries with temp tables require <a href="https://sdmdataaccess.nrcs.usda.gov/Query.aspx" target="_blank">SDA Query Interface</a></small></div>`;
    }
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(textarea.value).then(() => {
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
      });
    });
  }

  if (openBtn) {
    openBtn.addEventListener('click', () => {
      const sql = textarea.value.trim();
      if (!sql) return;
      window.open(`${COMPANION_RUNNER}?sql=${encodeURIComponent(sql)}`, '_blank');
    });
  }
}

function wireAllPanels() {
  document.querySelectorAll('.sql-panel').forEach(wireSQLPanel);
}

// ── LESSON WIRING ──────────────────────────────────────────────────────────
function wireLessons() {
  document.querySelectorAll('.lesson-header').forEach(header => {
    header.addEventListener('click', () => {
      const body = header.nextElementSibling;
      const arrow = header.querySelector('.lesson-expand');
      if (!body) return;
      const open = body.classList.toggle('open');
      if (arrow) arrow.textContent = open ? '▲' : '▼';
    });
  });
  const first = document.querySelector('.lesson-body');
  if (first) {
    first.classList.add('open');
    const arrow = first.previousElementSibling?.querySelector('.lesson-expand');
    if (arrow) arrow.textContent = '▲';
  }
}

// ── PROGRESS TRACKING ──────────────────────────────────────────────────────
const PROGRESS_KEY = 'sda-training-progress';
const TRACKED_PAGES = ['beginner','intermediate','expert','macros','api-python','api-javascript','query-runner','soil-model'];

function getProgress() {
  try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'); } catch { return {}; }
}

function markPageVisited() {
  const page = location.pathname.split('/').pop().replace('.html','');
  if (!TRACKED_PAGES.includes(page)) return;
  const p = getProgress();
  if (!p[page]) {
    p[page] = { visited: Date.now() };
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  }
}

function renderProgressBar() {
  const el = document.getElementById('training-progress');
  if (!el) return;
  const p = getProgress();
  const visited = TRACKED_PAGES.filter(pg => p[pg]).length;
  const total = TRACKED_PAGES.length;
  const pct = Math.round(visited / total * 100);
  el.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;font-size:12px;color:var(--dim)">
      <div style="flex:1;background:var(--panel2);border-radius:4px;height:6px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:var(--accent);border-radius:4px;transition:width .4s ease"></div>
      </div>
      <span style="white-space:nowrap;min-width:80px">${visited} of ${total} topics${visited>0?' explored':''}</span>
      ${visited>0?`<button onclick="clearProgress()" style="font-size:10px;background:none;border:none;color:var(--dimmer);cursor:pointer;padding:0">reset</button>`:''}
    </div>`;
}

function clearProgress() {
  localStorage.removeItem(PROGRESS_KEY);
  renderProgressBar();
}

// ── SCROLL REVEAL ──────────────────────────────────────────────────────────
function wireReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('on'); });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
}

// ── SQL SYNTAX HIGHLIGHT ───────────────────────────────────────────────────
function highlightSQL(sql) {
  return esc(sql)
    .replace(/(--.*)$/gm, (_, c) => `<span class="co">${c}</span>`)
    .replace(/'([^']*)'/g, (_, g) => `<span class="st">'${g}'</span>`)
    .replace(/\b(SELECT|FROM|WHERE|INNER|LEFT|OUTER|JOIN|ON|AND|OR|NOT|IN|IS|NULL|AS|ORDER|BY|GROUP|HAVING|DISTINCT|TOP|CASE|WHEN|THEN|ELSE|END|INTO|WITH|DECLARE|SET|IF|OVER|PARTITION|INSERT|UPDATE|CREATE|DROP)\b/gi, m => `<span class="kw">${m}</span>`)
    .replace(/\b(ROUND|SUM|MAX|MIN|AVG|COUNT|CAST|CONVERT|CONCAT|ISNULL|COALESCE|FORMAT|REPLACE|LEN|LEFT|RIGHT|SUBSTRING)\s*(?=\()/gi, m => `<span class="fn">${m}</span>`)
    .replace(/\b(\d+\.?\d*)\b/g, m => `<span class="nu">${m}</span>`);
}

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── COMPANION CATALOG ─────────────────────────────────────────────────────
async function loadCompanionCatalog() {
  try {
    const r = await fetch(COMPANION_SQL_CATALOG, { signal: AbortSignal.timeout(5000) });
    if (r.ok) return await r.json();
  } catch (_) {}
  return null;
}

// ── AUTO-WIRE ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  wireAllPanels();
  wireLessons();
  wireReveal();
  markPageVisited();
  renderProgressBar();
});
