
const input = document.getElementById('search-input');
const btn = document.getElementById('search-btn');
const clearBtn = document.getElementById('clear-btn');
const suggestionsBox = document.getElementById('suggestions');
const resultsEl = document.getElementById('results');
const statusEl = document.getElementById('status');
const paginationEl = document.getElementById('pagination');

let debounceTimer = null, activeIndex = -1;
let currentPage = 1;
let mode = 'browse';

window.addEventListener('DOMContentLoaded', () => loadBrowsePage(1));

async function loadBrowsePage(page) {
  mode = 'browse';
  currentPage = page;
  clearBtn.style.display = 'none';
  statusEl.textContent = 'Loading movies...';
  statusEl.classList.remove('error');
  try {
    const res = await fetch(`/api/movies?page=${page}`);
    const data = await res.json();
    statusEl.textContent = `Showing ${data.movies.length} of ${data.total} movies (page ${data.page} of ${data.total_pages})`;
    renderResults(data.movies, false);
    renderPagination(data.page, data.total_pages, loadBrowsePage);
  } catch (e) {
    statusEl.textContent = 'Could not reach the server.';
    statusEl.classList.add('error');
  }
}

input.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  const q = input.value.trim();
  if (!q) { closeSuggestions(); return; }
  debounceTimer = setTimeout(() => fetchSuggestions(q), 200);
});

input.addEventListener('keydown', (e) => {
  const items = [...suggestionsBox.querySelectorAll('.suggestion-item')];
  if (e.key === 'ArrowDown') { e.preventDefault(); activeIndex = Math.min(activeIndex+1, items.length-1); highlight(items); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); activeIndex = Math.max(activeIndex-1, 0); highlight(items); }
  else if (e.key === 'Enter') {
    if (activeIndex >= 0 && items[activeIndex]) { input.value = items[activeIndex].textContent; closeSuggestions(); }
    runSearch();
  } else if (e.key === 'Escape') { closeSuggestions(); }
});

function highlight(items){ items.forEach((el,i)=>el.classList.toggle('active', i===activeIndex)); }

async function fetchSuggestions(q) {
  try {
    const res = await fetch(`/api/titles?q=${encodeURIComponent(q)}`);
    renderSuggestions(await res.json());
  } catch (e) { closeSuggestions(); }
}

function renderSuggestions(titles) {
  activeIndex = -1;
  if (!titles.length) { closeSuggestions(); return; }
  suggestionsBox.innerHTML = titles.map(t => `<div class="suggestion-item">${escapeHtml(t)}</div>`).join('');
  suggestionsBox.classList.add('open');
  suggestionsBox.querySelectorAll('.suggestion-item').forEach(el => {
    el.addEventListener('click', () => { input.value = el.textContent; closeSuggestions(); runSearch(); });
  });
}

function closeSuggestions(){ suggestionsBox.classList.remove('open'); suggestionsBox.innerHTML=''; }
document.addEventListener('click', (e) => { if (!suggestionsBox.contains(e.target) && e.target!==input) closeSuggestions(); });

btn.addEventListener('click', runSearch);
clearBtn.addEventListener('click', () => { input.value=''; loadBrowsePage(1); });

async function runSearch() {
  const title = input.value.trim();
  if (!title) return;
  mode = 'search';
  closeSuggestions();
  resultsEl.innerHTML = '';
  paginationEl.innerHTML = '';
  clearBtn.style.display = 'inline-block';
  statusEl.textContent = `Finding movies similar to "${title}"...`;
  statusEl.classList.remove('error');
  try {
    const res = await fetch(`/api/recommend?title=${encodeURIComponent(title)}`);
    const data = await res.json();
    if (!res.ok) { statusEl.textContent = data.error || 'Something went wrong.'; statusEl.classList.add('error'); return; }
    statusEl.textContent = `${data.recommendations.length} matches for "${data.query}"`;
    renderResults(data.recommendations, true);
  } catch (e) {
    statusEl.textContent = 'Could not reach the server.';
    statusEl.classList.add('error');
  }
}

function renderResults(movies, showScore) {
  resultsEl.innerHTML = movies.map(r => `
    <article class="card">
      <img class="poster" src="${r.poster_url}" alt="${escapeHtml(r.title)} poster" loading="lazy"
           onerror="this.src='https://placehold.co/500x750/16161D/9A98A6?text=No+Poster'" />
      <div class="card-body">
        <div class="card-top">
          <h3>${escapeHtml(r.title)}</h3>
          ${showScore ? `<span class="match-badge">${Math.round(r.score*100)}%</span>` : ''}
        </div>
        <div class="genres">${(r.genres||[]).join(' &middot; ')}</div>
        <p class="overview">${escapeHtml(r.overview || 'No overview available.')}</p>
        <div class="meta"><span>${r.release_date || '-'}</span><span>&#9733; ${r.vote_average ?? '-'}</span></div>
      </div>
    </article>
  `).join('');
}

function renderPagination(page, totalPages, onGoto) {
  paginationEl.innerHTML = `
    <button ${page<=1 ? 'disabled' : ''} id="prev-page">&larr; Prev</button>
    <span>Page ${page} of ${totalPages}</span>
    <button ${page>=totalPages ? 'disabled' : ''} id="next-page">Next &rarr;</button>
  `;
  const prevBtn = document.getElementById('prev-page');
  const nextBtn = document.getElementById('next-page');
  if (prevBtn) prevBtn.addEventListener('click', () => { onGoto(page-1); window.scrollTo({top:0, behavior:'smooth'}); });
  if (nextBtn) nextBtn.addEventListener('click', () => { onGoto(page+1); window.scrollTo({top:0, behavior:'smooth'}); });
}

function escapeHtml(str){ const d=document.createElement('div'); d.textContent=str; return d.innerHTML; }
