import { TMDB_CONFIG } from './config.js';

const CACHE_PREFIX = 'cinescope:api-cache:v1:';
const CACHE_TTL_MS = 5 * 60 * 1000;
const memoryCache = new Map();

/** A predictable error type lets the UI show useful messages later. */
export class TmdbApiError extends Error {
  constructor(message, { status = 0, cause } = {}) {
    super(message, { cause });
    this.name = 'TmdbApiError';
    this.status = status;
  }
}

function hasConfiguredToken() {
  const token = TMDB_CONFIG.readAccessToken.trim();
  return token.length > 0 && !token.startsWith('PASTE_YOUR_');
}

function readCache(key) {
  const memoryEntry = memoryCache.get(key);
  if (memoryEntry && Date.now() - memoryEntry.savedAt < CACHE_TTL_MS) return memoryEntry.data;
  memoryCache.delete(key);
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(key) || 'null');
    if (stored && Date.now() - stored.savedAt < CACHE_TTL_MS && stored.data) {
      memoryCache.set(key, stored);
      return stored.data;
    }
    window.sessionStorage.removeItem(key);
  } catch {
    // Storage can be unavailable in private browsing; network requests still work.
  }
  return null;
}

function writeCache(key, data) {
  const entry = { savedAt: Date.now(), data };
  memoryCache.set(key, entry);
  try {
    window.sessionStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // The in-memory cache is still useful for the current page session.
  }
}

/**
 * The single doorway to TMDB. Future views use this function instead of
 * calling fetch themselves, keeping authentication and error handling unified.
 */
export async function tmdbFetch(path, { signal, params = {} } = {}) {
  if (!hasConfiguredToken()) {
    throw new TmdbApiError(
      'Add your TMDB v4 Read Access Token to js/config.js, then reload the page.'
    );
  }

  const url = new URL(path, `${TMDB_CONFIG.apiBaseUrl}/`);
  url.searchParams.set('language', 'en-US');
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  });
  const cacheKey = `${CACHE_PREFIX}${url.toString()}`;
  const cached = readCache(cacheKey);
  if (cached) return cached;

  let response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${TMDB_CONFIG.readAccessToken.trim()}`,
      },
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new TmdbApiError('Network error. Check your connection and try again.', {
      cause: error,
    });
  }

  if (!response.ok) {
    throw new TmdbApiError(`TMDB request failed (${response.status}).`, {
      status: response.status,
    });
  }

  try {
    const data = await response.json();
    writeCache(cacheKey, data);
    return data;
  } catch (error) {
    throw new TmdbApiError('TMDB returned invalid JSON.', { cause: error });
  }
}

/** Fetches the seven-day movie-trending list used by the first home-page row. */
export function getTrendingMovies({ signal } = {}) {
  return tmdbFetch('trending/movie/week', { signal });
}

export function getPopularMovies({ signal } = {}) {
  return tmdbFetch('movie/popular', { signal });
}

export function getTopRatedMovies({ signal } = {}) {
  return tmdbFetch('movie/top_rated', { signal });
}

export function getUpcomingMovies({ signal } = {}) {
  return tmdbFetch('movie/upcoming', { signal });
}

export function getMovieDetails(movieId, { signal } = {}) {
  return tmdbFetch(`movie/${movieId}`, {
    signal,
    params: { append_to_response: 'credits,videos' },
  });
}

export function searchMovies(query, page, { signal } = {}) {
  return tmdbFetch('search/movie', { signal, params: { query, page, include_adult: false } });
}

export function discoverMovies({ genreId, page, signal } = {}) {
  return tmdbFetch('discover/movie', {
    signal,
    params: { page, with_genres: genreId || undefined, sort_by: 'popularity.desc', include_adult: false },
  });
}

export function getMovieGenres({ signal } = {}) {
  return tmdbFetch('genre/movie/list', { signal });
}

export function getPersonDetails(personId, { signal } = {}) {
  return tmdbFetch(`person/${personId}`, {
    signal,
    params: { append_to_response: 'combined_credits' },
  });
}
