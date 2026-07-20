import { getMovieDetails, TmdbApiError } from '../api.js';
import { TMDB_CONFIG } from '../config.js';
import { openTrailer } from './components/modal.js';
import { isInWatchlist } from '../store.js';
import { setWatchlistButtonState } from './components/card.js';
import { createLoadingSpinner } from './components/skeleton.js';

function imageUrl(size, path) {
  return typeof path === 'string' && /^\/[-A-Za-z0-9_./]+$/.test(path)
    ? `${TMDB_CONFIG.imageBaseUrl}/${size}${path}`
    : '';
}

function formatDate(date) {
  const parsed = new Date(date);
  return Number.isFinite(parsed.getTime())
    ? new Intl.DateTimeFormat('en', { dateStyle: 'long' }).format(parsed)
    : 'Release date unavailable';
}

function formatRuntime(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return 'Runtime unavailable';
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function createMeta(label, value) {
  const item = document.createElement('div');
  const key = document.createElement('dt');
  key.textContent = label;
  const detail = document.createElement('dd');
  detail.textContent = value;
  item.append(key, detail);
  return item;
}

function createCastMember(person) {
  const item = document.createElement('li');
  item.className = 'cast-member';
  const link = document.createElement('a');
  const personId = Number(person.id);
  link.href = Number.isInteger(personId) && personId > 0 ? `#/person/${personId}` : '#/';
  link.setAttribute('aria-label', `View ${person.name || 'cast member'} profile`);
  const image = document.createElement('img');
  const profileUrl = imageUrl(TMDB_CONFIG.imageSizes.profile, person.profile_path);
  image.src = profileUrl || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="185" height="278"%3E%3Crect width="100%25" height="100%25" fill="%23242837"/%3E%3C/svg%3E';
  image.alt = profileUrl ? person.name || 'Cast member' : '';
  image.width = 185;
  image.height = 278;
  image.loading = 'lazy';
  image.decoding = 'async';
  const name = document.createElement('strong');
  name.textContent = person.name || 'Unknown cast member';
  const character = document.createElement('span');
  character.textContent = person.character || 'Role unavailable';
  link.append(image, name, character);
  item.append(link);
  return item;
}

function createDetails(movie) {
  const view = document.createElement('article');
  view.className = 'details-view';
  const backdropUrl = imageUrl(TMDB_CONFIG.imageSizes.backdrop, movie.backdrop_path);
  if (backdropUrl) {
    const backdrop = document.createElement('img');
    backdrop.className = 'details-backdrop';
    backdrop.src = backdropUrl;
    backdrop.alt = '';
    backdrop.width = 1280;
    backdrop.height = 720;
    backdrop.fetchPriority = 'high';
    view.append(backdrop);
  }

  const content = document.createElement('div');
  content.className = 'details-content';
  const poster = document.createElement('img');
  poster.className = 'details-poster';
  const posterUrl = imageUrl(TMDB_CONFIG.imageSizes.poster, movie.poster_path);
  poster.src = posterUrl || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="342" height="513"%3E%3Crect width="100%25" height="100%25" fill="%23242837"/%3E%3C/svg%3E';
  poster.alt = posterUrl ? `${movie.title || 'Movie'} poster` : '';
  poster.width = 342;
  poster.height = 513;

  const information = document.createElement('div');
  information.className = 'details-information';
  const tagline = document.createElement('p');
  tagline.className = 'tagline';
  tagline.textContent = movie.tagline || ' '; // reserves no visual prominence when missing
  const title = document.createElement('h1');
  title.textContent = movie.title || 'Movie details';
  const overview = document.createElement('p');
  overview.className = 'overview';
  overview.textContent = movie.overview || 'No overview is available for this movie yet.';
  const meta = document.createElement('dl');
  meta.className = 'movie-details-meta';
  meta.append(
    createMeta('Released', formatDate(movie.release_date)),
    createMeta('Runtime', formatRuntime(movie.runtime)),
    createMeta('Genres', movie.genres?.map((genre) => genre.name).join(', ') || 'Uncategorised'),
  );
  const rating = document.createElement('div');
  rating.className = 'rating-ring';
  const score = Math.min(10, Math.max(0, Number(movie.vote_average) || 0));
  rating.setAttribute('aria-label', `TMDB rating ${score.toFixed(1)} out of 10`);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('aria-hidden', 'true');
  const track = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  track.setAttribute('class', 'rating-ring__track');
  track.setAttribute('cx', '50');
  track.setAttribute('cy', '50');
  track.setAttribute('r', '42');
  const progress = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  progress.setAttribute('class', 'rating-ring__progress');
  progress.setAttribute('cx', '50');
  progress.setAttribute('cy', '50');
  progress.setAttribute('r', '42');
  // Circumference of this radius is ~263.9; dash offset maps score from 0–10.
  progress.setAttribute('stroke-dashoffset', String(263.9 * (1 - score / 10)));
  svg.append(track, progress);
  const ratingValue = document.createElement('strong');
  ratingValue.textContent = score.toFixed(1);
  const ratingLabel = document.createElement('span');
  ratingLabel.textContent = 'TMDB score';
  rating.append(svg, ratingValue, ratingLabel);

  const watchlistButton = document.createElement('button');
  watchlistButton.type = 'button';
  watchlistButton.className = 'watchlist-button watchlist-button--details';
  watchlistButton.dataset.watchlistId = String(movie.id);
  watchlistButton.dataset.movie = JSON.stringify({
    id: movie.id,
    title: movie.title || 'Untitled movie',
    poster_path: movie.poster_path || null,
    release_date: movie.release_date || '',
    vote_average: movie.vote_average || 0,
  });
  setWatchlistButtonState(watchlistButton, isInWatchlist(movie.id));

  const trailer = movie.videos?.results?.find((video) => video.site === 'YouTube' && video.type === 'Trailer' && video.official)
    || movie.videos?.results?.find((video) => video.site === 'YouTube' && video.type === 'Trailer');
  if (trailer?.key) {
    const button = document.createElement('button');
    button.className = 'trailer-button';
    button.type = 'button';
    button.textContent = '▶ Watch trailer';
    button.addEventListener('click', () => openTrailer({ title: movie.title || 'Movie', youtubeKey: trailer.key, trigger: button }));
    information.append(tagline, title, rating, overview, meta, watchlistButton, button);
  } else {
    information.append(tagline, title, rating, overview, meta, watchlistButton);
  }
  content.append(poster, information);
  view.append(content);

  const castSection = document.createElement('section');
  castSection.className = 'cast-section';
  castSection.setAttribute('aria-labelledby', 'cast-heading');
  const castHeading = document.createElement('h2');
  castHeading.id = 'cast-heading';
  castHeading.textContent = 'Top cast';
  const cast = document.createElement('ul');
  cast.className = 'cast-list';
  const people = Array.isArray(movie.credits?.cast) ? movie.credits.cast.slice(0, 10) : [];
  if (people.length) people.forEach((person) => cast.append(createCastMember(person)));
  else {
    const empty = document.createElement('p');
    empty.textContent = 'Cast information is unavailable.';
    castSection.append(castHeading, empty);
    view.append(castSection);
    return view;
  }
  castSection.append(castHeading, cast);
  view.append(castSection);
  return view;
}

export async function renderDetails(app, movieId) {
  app.replaceChildren();
  const loading = createLoadingSpinner('Loading movie details…');
  app.append(loading);

  try {
    const movie = await getMovieDetails(movieId);
    app.replaceChildren(createDetails(movie));
  } catch (error) {
    const message = document.createElement('section');
    message.className = 'page-error';
    const heading = document.createElement('h1');
    heading.textContent = 'Movie unavailable';
    const copy = document.createElement('p');
    copy.textContent = error instanceof TmdbApiError ? error.message : 'We could not load this movie.';
    const back = document.createElement('a');
    back.href = '#/';
    back.className = 'trailer-button';
    back.textContent = 'Back to home';
    message.append(heading, copy, back);
    app.replaceChildren(message);
  }
}
