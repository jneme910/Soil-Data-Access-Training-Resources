/**
 * sda-runner.js — Shared SDA API query logic
 * Used across all training pages. Standalone — no external dependencies.
 */

const SDA_URL = 'https://sdmdataaccess.sc.egov.usda.gov/Tabular/post.rest';

// Companion repo base — single constant to update if URL ever changes
const COMPANION_BASE = 'https://jneme910.github.io/NRCS-Soil-Data-Access';
const COMPANION_SQL_CATALOG = `${COMPANION_BASE}/data/sql-catalog.json`;

/**
 * POST a SQL query to SDA and return { headers, rows } or throw.
 */
async function runSDAQuery(sql) {
  const body = new URLSearchParams({ query: sql, format: 'JSON+COLUMNNAME' });
  const resp = await fetch(SDA_URL, { method: 'POST', body });
  if (!resp.ok) throw new Error(`SDA returned HTTP ${resp.status}`);
  const data = await resp.json();
  if (!data.Table || data.Table.length < 2) return { headers: [], rows: [] };
  const [headers, , ...rows] = data.Table;
  return { headers, rows };
}

/**
 * Wire up a .sql-panel element with run/copy buttons.
 * Expects: <textarea class="sql-editor">, .btn-run, .btn-copy, .sql-result
 */
function wireSQLPanel(panel) {
  const textarea = panel.querySelector('.sql-editor');
  const runBtn   = panel.querySelector('.btn-run');
  const copyBtn  = panel.querySelector('.btn-copy');
  const result   = panel.querySelector('.sql-result');
  if (!textarea || !runBtn) return;

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
}

/** Wire all .sql-panel elements on the page */
function wireAllPanels() {
  document.querySelectorAll('.sql-panel').forEach(wireSQLPanel);
}

/** Wire lesson expand/collapse */
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
  // Open first lesson by default
  const first = document.querySelector('.lesson-body');
  if (first) {
    first.classList.add('open');
    const arrow = first.previousElementSibling?.querySelector('.lesson-expand');
    if (arrow) arrow.textContent = '▲';
  }
}

/** Scroll reveal */
function wireReveal() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('on'); });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));
}

/** SQL syntax highlight (simple) */
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

/** Try to load companion SQL catalog with graceful fallback */
async function loadCompanionCatalog() {
  try {
    const r = await fetch(COMPANION_SQL_CATALOG, { signal: AbortSignal.timeout(5000) });
    if (r.ok) return await r.json();
  } catch (_) {}
  return null;
}

// Auto-wire on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  wireAllPanels();
  wireLessons();
  wireReveal();
});
