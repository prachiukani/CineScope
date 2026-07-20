import { TMDB_CONFIG } from '../../config.js';
import { isInWatchlist } from '../../store.js';

function formatYear(date) {
  const year = new Date(date).getFullYear();
  return Number.isFinite(year) ? String(year) : 'Coming soon';
}

function formatRating(rating) {
  return Number.isFinite(rating) && rating > 0 ? rating.toFixed(1) : 'N/A';
}

/**
 * Produces a movie card entirely with DOM APIs. TMDB-provided titles are put
 * through textContent rather than HTML parsing, so API text cannot become code.
 */
export function createMovieCard(movie) {
  const card = document.createElement('article');
  card.className = 'movie-card';
  const id = Number(movie.id);
  card.setAttribute('role', 'listitem');
  const link = document.createElement('a');
  link.className = 'movie-card__link';
  link.href = Number.isInteger(id) && id > 0 ? `#/movie/${id}` : '#/';
  link.setAttribute('aria-label', `View details for ${movie.title || 'this movie'}`);

  const poster = document.createElement('div');
  poster.className = 'movie-card__poster';

  if (movie.poster_path) {
    const image = document.createElement('img');
    const smallUrl = `${TMDB_CONFIG.imageBaseUrl}/w185${movie.poster_path}`;
    const mediumUrl = `${TMDB_CONFIG.imageBaseUrl}/${TMDB_CONFIG.imageSizes.poster}${movie.poster_path}`;
    image.alt = `${movie.title || 'Movie'} poster`;
    image.width = 342;
    image.height = 513;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.dataset.src = mediumUrl;
    image.dataset.srcset = `${smallUrl} 185w, ${mediumUrl} 342w`;
    image.sizes = '(max-width: 640px) 42vw, (max-width: 900px) 24vw, 180px';
    poster.append(image);
  } else {
    const unavailable = document.createElement('span');
    unavailable.className = 'movie-card__unavailable';
    unavailable.textContent = 'Poster unavailable';
    poster.append(unavailable);
  }

  const body = document.createElement('div');
  body.className = 'movie-card__body';
  const title = document.createElement('h3');
  title.className = 'movie-card__title';
  title.textContent = movie.title || 'Untitled movie';

  const meta = document.createElement('div');
  meta.className = 'movie-card__meta';
  const year = document.createElement('span');
  year.textContent = formatYear(movie.release_date);
  const rating = document.createElement('span');
  rating.className = 'rating-badge';
  rating.textContent = `★ ${formatRating(movie.vote_average)}`;
  meta.append(year, rating);
  body.append(title, meta);
  link.append(poster, body);
  const watchlistButton = document.createElement('button');
  watchlistButton.type = 'button';
  watchlistButton.className = 'watchlist-button';
  watchlistButton.dataset.watchlistId = String(id);
  watchlistButton.dataset.movie = JSON.stringify({
    id,
    title: movie.title || 'Untitled movie',
    poster_path: movie.poster_path || null,
    release_date: movie.release_date || '',
    vote_average: movie.vote_average || 0,
  });
  setWatchlistButtonState(watchlistButton, isInWatchlist(id));
  card.append(link, watchlistButton);
  return card;
}

export function setWatchlistButtonState(button, saved) {
  button.textContent = saved ? '✓ Saved' : '+ Watchlist';
  button.setAttribute('aria-pressed', String(saved));
  button.setAttribute('aria-label', saved ? 'Remove from watchlist' : 'Add to watchlist');
}

/**
 * `loading=lazy` is enough in modern browsers. This fallback assigns sources
 * just before an image is visible for browsers that do not support it.
 */
export function loadDeferredImages(container) {
  const images = [...container.querySelectorAll('img[data-src]')];
  const loadImage = (image) => {
    image.src = image.dataset.src;
    image.srcset = image.dataset.srcset;
    image.removeAttribute('data-src');
    image.removeAttribute('data-srcset');
  };

  if (!('IntersectionObserver' in window)) {
    images.forEach(loadImage);
    return;
  }

  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      loadImage(entry.target);
      currentObserver.unobserve(entry.target);
    });
  }, { rootMargin: '300px 0px' });

  images.forEach((image) => observer.observe(image));
}
