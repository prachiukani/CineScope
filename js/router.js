/**
 * Hash routes work on every static host: the server only ever receives
 * index.html, while the browser keeps everything after # on the client.
 */
function parseHash() {
  const rawHash = window.location.hash.slice(1) || '/';
  const [pathname, queryString = ''] = rawHash.split('?');
  return { pathname: pathname || '/', query: new URLSearchParams(queryString) };
}

function matchRoute() {
  const { pathname, query } = parseHash();
  const movieMatch = pathname.match(/^\/movie\/(\d+)$/);
  const personMatch = pathname.match(/^\/person\/(\d+)$/);

  if (pathname === '/') return { name: 'home', query };
  if (movieMatch) return { name: 'movie', movieId: Number(movieMatch[1]), query };
  if (personMatch) return { name: 'person', personId: Number(personMatch[1]), query };
  if (pathname === '/search') return { name: 'search', query };
  if (pathname === '/watchlist') return { name: 'watchlist', query };
  return { name: 'not-found', query };
}

export function startRouter(onRouteChange) {
  const renderRoute = () => onRouteChange(matchRoute());
  window.addEventListener('hashchange', renderRoute);
  renderRoute();
}
