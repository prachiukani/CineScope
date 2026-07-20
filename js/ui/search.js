import { discoverMovies, getMovieGenres, searchMovies, TmdbApiError } from '../api.js';
import { createMovieCard, loadDeferredImages } from './components/card.js';
import { createCardSkeletons } from './components/skeleton.js';

let activeController;
let activeObserver;

export function cancelSearch() {
  activeController?.abort();
  activeController = undefined;
  activeObserver?.disconnect();
  activeObserver = undefined;
}

function createEmptyState(query) {
  const state = document.createElement('section');
  state.className = 'empty-state';
  const heading = document.createElement('h2');
  heading.textContent = query ? `No results for “${query}”` : 'Nothing to browse yet';
  const copy = document.createElement('p');
  copy.textContent = query ? 'Try a different title, actor, or spelling.' : 'Choose a genre to explore films.';
  state.append(heading, copy);
  return state;
}

function createGenreChips(genres, selectedId, onSelect) {
  const wrapper = document.createElement('div');
  wrapper.className = 'genre-chips';
  wrapper.setAttribute('aria-label', 'Filter by genre');
  wrapper.setAttribute('role', 'group');
  const all = document.createElement('button');
  all.type = 'button';
  all.className = 'genre-chip';
  all.textContent = 'All';
  all.setAttribute('aria-pressed', String(!selectedId));
  all.addEventListener('click', () => onSelect(null));
  wrapper.append(all);
  genres.forEach((genre) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'genre-chip';
    chip.textContent = genre.name;
    chip.setAttribute('aria-pressed', String(genre.id === selectedId));
    chip.addEventListener('click', () => onSelect(genre.id));
    wrapper.append(chip);
  });
  return wrapper;
}

function createError(message, retry) {
  const state = document.createElement('section');
  state.className = 'page-error';
  const heading = document.createElement('h2');
  heading.textContent = 'Search is unavailable';
  const copy = document.createElement('p');
  copy.textContent = message;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'trailer-button';
  button.textContent = 'Try again';
  button.addEventListener('click', retry);
  state.append(heading, copy, button);
  return state;
}

export async function renderSearch(app, query) {
  cancelSearch();
  const controller = new AbortController();
  activeController = controller;
  let selectedGenreId = null;
  let page = 1;
  let totalPages = 1;
  let isLoading = false;

  app.replaceChildren();
  const view = document.createElement('section');
  view.className = 'search-view';
  view.setAttribute('aria-labelledby', 'page-title');
  const eyebrow = document.createElement('span');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'Discover';
  const title = document.createElement('h1');
  title.id = 'page-title';
  title.textContent = query ? `Results for “${query}”` : 'Browse movies';
  const copy = document.createElement('p');
  copy.textContent = query ? 'Use genre chips to narrow the visible results.' : 'Choose a genre, or search above by title or actor.';
  const genreHost = document.createElement('div');
  const liveStatus = document.createElement('p');
  liveStatus.className = 'sr-only';
  liveStatus.setAttribute('aria-live', 'polite');
  const grid = document.createElement('div');
  grid.className = 'search-grid';
  grid.setAttribute('role', 'list');
  const sentinel = document.createElement('div');
  sentinel.className = 'scroll-sentinel';
  sentinel.setAttribute('aria-hidden', 'true');
  view.append(eyebrow, title, copy, genreHost, liveStatus, grid, sentinel);
  app.append(view);

  const getPage = () => (query ? searchMovies(query, page, { signal: controller.signal }) : discoverMovies({ genreId: selectedGenreId, page, signal: controller.signal }));

  const loadPage = async ({ replace = false } = {}) => {
    if (isLoading || page > totalPages || controller.signal.aborted) return;
    isLoading = true;
    if (replace) grid.replaceChildren(createCardSkeletons(12));
    else if (!grid.childElementCount) grid.append(createCardSkeletons(12));
    liveStatus.textContent = page === 1 ? 'Loading results…' : 'Loading more results…';
    try {
      const payload = await getPage();
      if (controller.signal.aborted) return;
      totalPages = Math.min(Number(payload.total_pages) || 1, 500);
      const rawMovies = Array.isArray(payload.results) ? payload.results : [];
      // TMDB search cannot combine a server-side genre filter; filter this displayed page when searching.
      const movies = selectedGenreId && query
        ? rawMovies.filter((movie) => movie.genre_ids?.includes(selectedGenreId))
        : rawMovies;
      const cards = document.createDocumentFragment();
      movies.forEach((movie) => cards.append(createMovieCard(movie)));
      if (replace || page === 1) grid.replaceChildren(cards);
      else grid.append(cards);
      loadDeferredImages(grid);
      liveStatus.textContent = movies.length
        ? `${grid.querySelectorAll('.movie-card').length} results loaded.`
        : 'No results found.';
      if (!grid.childElementCount) grid.append(createEmptyState(query));
      page += 1;
    } catch (error) {
      if (error.name === 'AbortError') return;
      const message = error instanceof TmdbApiError ? error.message : 'We could not load these movies.';
      grid.replaceChildren(createError(message, () => loadPage({ replace: true })));
    } finally {
      isLoading = false;
    }
  };

  const loadGenres = async () => {
    try {
      const payload = await getMovieGenres({ signal: controller.signal });
      if (controller.signal.aborted) return;
      const genres = Array.isArray(payload.genres) ? payload.genres : [];
      const renderGenreChips = () => genreHost.replaceChildren(createGenreChips(genres, selectedGenreId, (genreId) => {
        selectedGenreId = genreId;
        page = 1;
        totalPages = 1;
        renderGenreChips();
        loadPage({ replace: true });
      }));
      renderGenreChips();
    } catch (error) {
      if (error.name !== 'AbortError') console.error('Could not load genres', error);
    }
  };

  activeObserver = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) loadPage();
  }, { rootMargin: '500px 0px' });
  activeObserver.observe(sentinel);
  await Promise.all([loadGenres(), loadPage({ replace: true })]);
}
