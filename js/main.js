import { renderHome } from './ui/home.js';
import { startRouter } from './router.js';
import { renderDetails } from './ui/details.js';
import { cancelSearch, renderSearch } from './ui/search.js';
import { debounce } from './utils.js';
import { getTheme, getWatchlist, subscribeToTheme, subscribeToWatchlist, toggleWatchlist } from './store.js';
import { setWatchlistButtonState } from './ui/components/card.js';
import { renderWatchlist } from './ui/watchlist.js';
import { renderPerson } from './ui/person.js';

const app = document.querySelector('#app');
const searchForm = document.querySelector('[data-search-form]');
const searchInput = document.querySelector('[data-search-input]');
const watchlistCount = document.querySelector('[data-watchlist-count]');

function prefersDarkTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(theme) {
  const effectiveTheme = theme || (prefersDarkTheme() ? 'dark' : 'light');
  document.documentElement.dataset.theme = effectiveTheme;
}

function updateWatchlistUi(movies = getWatchlist()) {
  watchlistCount.textContent = String(movies.length);
  watchlistCount.hidden = movies.length === 0;
  app.querySelectorAll('[data-watchlist-id]').forEach((button) => {
    setWatchlistButtonState(button, movies.some((movie) => movie.id === Number(button.dataset.watchlistId)));
  });
  if (window.location.hash === '#/watchlist') renderWatchlist(app);
}

subscribeToWatchlist(updateWatchlistUi);
updateWatchlistUi();
subscribeToTheme(applyTheme);
applyTheme(getTheme());
app.addEventListener('click', (event) => {
  const button = event.target.closest('[data-watchlist-id]');
  if (!button) return;
  try {
    const movie = JSON.parse(button.dataset.movie);
    toggleWatchlist(movie);
  } catch {
    console.warn('CineScope could not update this watchlist item.');
  }
});

document.addEventListener('keydown', (event) => {
  const target = event.target;
  const editable = target.matches?.('input, textarea, select, [contenteditable="true"]');
  if (event.key === '/' && !editable && !event.metaKey && !event.ctrlKey && !event.altKey) {
    event.preventDefault();
    searchInput.focus();
    return;
  }
  const link = target.closest?.('.movie-card__link');
  if (!link || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
  const container = link.closest('.movie-rail, .search-grid');
  const links = [...container.querySelectorAll('.movie-card__link')];
  const index = links.indexOf(link);
  if (index < 0) return;
  let nextIndex = index;
  if (event.key === 'ArrowLeft') nextIndex -= 1;
  if (event.key === 'ArrowRight') nextIndex += 1;
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    const firstRowTop = links[0].getBoundingClientRect().top;
    const columns = links.filter((item) => Math.abs(item.getBoundingClientRect().top - firstRowTop) < 5).length || 1;
    nextIndex += event.key === 'ArrowUp' ? -columns : columns;
  }
  if (links[nextIndex]) {
    event.preventDefault();
    links[nextIndex].focus();
  }
});

if ('serviceWorker' in navigator && (window.isSecureContext || location.hostname === 'localhost')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch((error) => console.warn('Service worker registration failed.', error)));
}

function navigateToSearch(query) {
  const trimmedQuery = query.trim();
  const nextHash = trimmedQuery ? `#/search?q=${encodeURIComponent(trimmedQuery)}` : '#/search';
  if (window.location.hash !== nextHash) window.location.hash = nextHash;
}

const navigateAfterTyping = debounce((value) => navigateToSearch(value), 1000);
searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  navigateToSearch(searchInput.value);
});
searchInput.addEventListener('input', () => navigateAfterTyping(searchInput.value));

function renderNotFound() {
  app.replaceChildren();
  const view = document.createElement('section');
  view.className = 'page-error';
  const title = document.createElement('h1');
  title.textContent = 'Page not found';
  const link = document.createElement('a');
  link.href = '#/';
  link.className = 'trailer-button';
  link.textContent = 'Back to home';
  view.append(title, link);
  app.append(view);
}

startRouter((route) => {
  cancelSearch();
  if (route.name === 'home') renderHome(app);
  else if (route.name === 'movie') renderDetails(app, route.movieId);
  else if (route.name === 'person') renderPerson(app, route.personId);
  else if (route.name === 'search') {
    const query = route.query.get('q')?.trim() || '';
    searchInput.value = query;
    renderSearch(app, query);
  }
  else if (route.name === 'watchlist') renderWatchlist(app);
  else renderNotFound();
});
