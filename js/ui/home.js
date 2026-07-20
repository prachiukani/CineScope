import {
  getPopularMovies,
  getTopRatedMovies,
  getTrendingMovies,
  getUpcomingMovies,
  TmdbApiError,
} from '../api.js';
import { createMovieCard, loadDeferredImages } from './components/card.js';
import { createCardSkeletons } from './components/skeleton.js';

const sections = [
  { id: 'trending', title: 'Trending this week', description: 'The films everyone is talking about.', fetchMovies: getTrendingMovies },
  { id: 'popular', title: 'Popular now', description: 'The crowd-pleasers lighting up TMDB.', fetchMovies: getPopularMovies },
  { id: 'top-rated', title: 'Top rated', description: 'Critics’ and audiences’ lasting favourites.', fetchMovies: getTopRatedMovies },
  { id: 'upcoming', title: 'Coming soon', description: 'Plan your next cinema night.', fetchMovies: getUpcomingMovies },
];

function createSection(section) {
  const element = document.createElement('section');
  element.className = 'movie-row';
  element.setAttribute('aria-labelledby', `${section.id}-heading`);

  const header = document.createElement('div');
  header.className = 'section-heading';
  const heading = document.createElement('h2');
  heading.id = `${section.id}-heading`;
  heading.textContent = section.title;
  const description = document.createElement('p');
  description.textContent = section.description;
  header.append(heading, description);

  const status = document.createElement('p');
  status.className = 'sr-only';
  status.setAttribute('aria-live', 'polite');
  const rail = document.createElement('div');
  rail.className = 'movie-rail';
  rail.setAttribute('role', 'list');
  rail.append(createCardSkeletons());

  element.append(header, status, rail);
  return { element, rail, status };
}

function showError(rail, status, section) {
  rail.replaceChildren();
  const error = document.createElement('div');
  error.className = 'row-error';
  const message = document.createElement('p');
  message.textContent = `We could not load ${section.title.toLowerCase()}.`;
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'retry';
  retry.textContent = 'Try again';
  retry.addEventListener('click', () => loadSection(section, rail, status));
  error.append(message, retry);
  rail.append(error);
  status.textContent = `Could not load ${section.title}.`;
}

async function loadSection(section, rail, status) {
  rail.replaceChildren(createCardSkeletons());
  status.textContent = `Loading ${section.title}…`;

  try {
    const payload = await section.fetchMovies();
    const movies = Array.isArray(payload.results) ? payload.results : [];
    const cards = document.createDocumentFragment();
    movies.slice(0, 12).forEach((movie) => cards.append(createMovieCard(movie)));
    rail.replaceChildren(cards);
    loadDeferredImages(rail);
    status.textContent = `${movies.length} ${section.title} movies loaded.`;
  } catch (error) {
    if (!(error instanceof TmdbApiError)) console.error(error);
    showError(rail, status, section);
  }
}

/** Renders the complete Milestone 2 landing page, then loads rows independently. */
export function renderHome(app) {
  app.replaceChildren();
  const hero = document.createElement('section');
  hero.className = 'hero';
  hero.setAttribute('aria-labelledby', 'page-title');
  const eyebrow = document.createElement('span');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'Find your next obsession';
  const title = document.createElement('h1');
  title.id = 'page-title';
  title.textContent = 'Movies for every kind of night.';
  const copy = document.createElement('p');
  copy.textContent = 'Explore what is trending, beloved, and about to arrive. Your personal watchlist is coming next.';
  hero.append(eyebrow, title, copy);

  const catalogue = document.createElement('div');
  catalogue.className = 'catalogue';
  app.append(hero, catalogue);

  sections.forEach((section) => {
    const { element, rail, status } = createSection(section);
    catalogue.append(element);
    loadSection(section, rail, status);
  });
}
