import { getWatchlist } from '../store.js';
import { createMovieCard, loadDeferredImages } from './components/card.js';

export function renderWatchlist(app) {
  app.replaceChildren();
  const view = document.createElement('section');
  view.className = 'search-view';
  view.setAttribute('aria-labelledby', 'page-title');
  const eyebrow = document.createElement('span');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'Your collection';
  const title = document.createElement('h1');
  title.id = 'page-title';
  title.textContent = 'Watchlist';
  const movies = getWatchlist();
  const count = document.createElement('p');
  count.textContent = movies.length ? `${movies.length} movie${movies.length === 1 ? '' : 's'} saved for later.` : 'Keep track of films you want to watch.';
  view.append(eyebrow, title, count);

  if (!movies.length) {
    const empty = document.createElement('section');
    empty.className = 'empty-state';
    const heading = document.createElement('h2');
    heading.textContent = 'Your watchlist is empty';
    const copy = document.createElement('p');
    copy.textContent = 'Use the + Watchlist button on any movie to save it here.';
    const home = document.createElement('a');
    home.href = '#/';
    home.className = 'trailer-button';
    home.textContent = 'Browse movies';
    empty.append(heading, copy, home);
    view.append(empty);
  } else {
    const grid = document.createElement('div');
    grid.className = 'search-grid';
    grid.setAttribute('role', 'list');
    const cards = document.createDocumentFragment();
    movies.forEach((movie) => cards.append(createMovieCard(movie)));
    grid.append(cards);
    view.append(grid);
    loadDeferredImages(grid);
  }
  app.append(view);
}
