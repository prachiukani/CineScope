import { getPersonDetails, TmdbApiError } from '../api.js';
import { TMDB_CONFIG } from '../config.js';
import { createMovieCard, loadDeferredImages } from './components/card.js';
import { createLoadingSpinner } from './components/skeleton.js';

function personImageUrl(path) {
  return typeof path === 'string' && /^\/[-A-Za-z0-9_./]+$/.test(path)
    ? `${TMDB_CONFIG.imageBaseUrl}/${TMDB_CONFIG.imageSizes.profile}${path}`
    : '';
}

function createPersonView(person) {
  const view = document.createElement('article');
  view.className = 'person-view';
  const profile = document.createElement('section');
  profile.className = 'person-profile';
  profile.setAttribute('aria-labelledby', 'page-title');
  const image = document.createElement('img');
  image.className = 'person-profile__image';
  const imageUrl = personImageUrl(person.profile_path);
  image.src = imageUrl || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="185" height="278"%3E%3Crect width="100%25" height="100%25" fill="%23242837"/%3E%3C/svg%3E';
  image.alt = imageUrl ? `${person.name || 'Cast member'} portrait` : '';
  image.width = 370;
  image.height = 555;
  const content = document.createElement('div');
  const eyebrow = document.createElement('span');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'Cast profile';
  const name = document.createElement('h1');
  name.id = 'page-title';
  name.textContent = person.name || 'Cast member';
  const bio = document.createElement('p');
  bio.className = 'person-bio';
  bio.textContent = person.biography || 'A biography is not available for this cast member yet.';
  content.append(eyebrow, name, bio);
  profile.append(image, content);

  const credits = Array.isArray(person.combined_credits?.cast)
    ? person.combined_credits.cast
      .filter((credit) => credit.media_type === 'movie' && Number.isInteger(Number(credit.id)))
      .sort((first, second) => (second.popularity || 0) - (first.popularity || 0))
    : [];
  const movies = [...new Map(credits.map((movie) => [movie.id, movie])).values()];
  const filmography = document.createElement('section');
  filmography.className = 'person-filmography';
  filmography.setAttribute('aria-labelledby', 'filmography-heading');
  const heading = document.createElement('h2');
  heading.id = 'filmography-heading';
  heading.textContent = 'Movies';
  const subtitle = document.createElement('p');
  subtitle.textContent = `${movies.length} movie${movies.length === 1 ? '' : 's'} in the TMDB cast credits.`;
  filmography.append(heading, subtitle);

  if (movies.length) {
    const grid = document.createElement('div');
    grid.className = 'search-grid';
    grid.setAttribute('role', 'list');
    const cards = document.createDocumentFragment();
    movies.forEach((movie) => cards.append(createMovieCard(movie)));
    grid.append(cards);
    filmography.append(grid);
    loadDeferredImages(grid);
  } else {
    const empty = document.createElement('p');
    empty.textContent = 'Movie credits are unavailable.';
    filmography.append(empty);
  }
  view.append(profile, filmography);
  return view;
}

export async function renderPerson(app, personId) {
  app.replaceChildren(createLoadingSpinner('Loading cast profile…'));
  try {
    const person = await getPersonDetails(personId);
    app.replaceChildren(createPersonView(person));
  } catch (error) {
    const message = document.createElement('section');
    message.className = 'page-error';
    const heading = document.createElement('h1');
    heading.textContent = 'Cast profile unavailable';
    const copy = document.createElement('p');
    copy.textContent = error instanceof TmdbApiError ? error.message : 'We could not load this cast profile.';
    const back = document.createElement('a');
    back.href = '#/';
    back.className = 'trailer-button';
    back.textContent = 'Back to home';
    message.append(heading, copy, back);
    app.replaceChildren(message);
  }
}
