const WATCHLIST_KEY = 'cinescope:watchlist:v1';
const THEME_KEY = 'cinescope:theme:v1';
const subscribers = new Set();
const themeSubscribers = new Set();

function validImagePath(value) {
  return typeof value === 'string' && /^\/[-A-Za-z0-9_./]+$/.test(value) ? value : null;
}

/** Keep only the small, predictable data the watchlist view needs. */
function sanitiseMovie(value) {
  const id = Number(value?.id);
  if (!Number.isInteger(id) || id <= 0) return null;
  const title = typeof value.title === 'string' ? value.title.trim().slice(0, 300) : 'Untitled movie';
  const releaseDate = typeof value.release_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.release_date)
    ? value.release_date
    : '';
  const rating = Number(value.vote_average);
  return {
    id,
    title: title || 'Untitled movie',
    poster_path: validImagePath(value.poster_path),
    release_date: releaseDate,
    vote_average: Number.isFinite(rating) ? Math.min(10, Math.max(0, rating)) : 0,
  };
}

function readWatchlist() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(WATCHLIST_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    const ids = new Set();
    return parsed.map(sanitiseMovie).filter((movie) => movie && !ids.has(movie.id) && ids.add(movie.id)).slice(0, 500);
  } catch {
    return [];
  }
}

let watchlist = readWatchlist();

function publish() {
  const snapshot = getWatchlist();
  subscribers.forEach((subscriber) => subscriber(snapshot));
}

function persist() {
  try {
    window.localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
  } catch (error) {
    console.warn('CineScope could not save the watchlist.', error);
  }
}

export function getWatchlist() {
  return watchlist.map((movie) => ({ ...movie }));
}

export function isInWatchlist(movieId) {
  return watchlist.some((movie) => movie.id === Number(movieId));
}

export function toggleWatchlist(movie) {
  const cleanMovie = sanitiseMovie(movie);
  if (!cleanMovie) return false;
  const index = watchlist.findIndex((item) => item.id === cleanMovie.id);
  if (index >= 0) watchlist = watchlist.filter((item) => item.id !== cleanMovie.id);
  else watchlist = [cleanMovie, ...watchlist];
  persist();
  publish();
  return index < 0;
}

/** A tiny pub/sub: UI can react without importing or mutating store internals. */
export function subscribeToWatchlist(subscriber) {
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
}

export function getTheme() {
  try {
    const theme = window.localStorage.getItem(THEME_KEY);
    return theme === 'light' || theme === 'dark' ? theme : null;
  } catch {
    return null;
  }
}

export function setTheme(theme) {
  if (theme !== 'light' && theme !== 'dark') return;
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Theme selection still applies for the current page when storage is blocked.
  }
  themeSubscribers.forEach((subscriber) => subscriber(theme));
}

export function subscribeToTheme(subscriber) {
  themeSubscribers.add(subscriber);
  return () => themeSubscribers.delete(subscriber);
}

window.addEventListener('storage', (event) => {
  if (event.key === WATCHLIST_KEY) {
    watchlist = readWatchlist();
    publish();
  }
  if (event.key === THEME_KEY && (event.newValue === 'light' || event.newValue === 'dark')) {
    themeSubscribers.forEach((subscriber) => subscriber(event.newValue));
  }
});
