/**
 * Copy this file to config.js and add your TMDB v4 Read Access Token.
 * config.js is ignored by Git so a personal credential is not committed.
 */
export const TMDB_CONFIG = Object.freeze({
  apiBaseUrl: 'https://api.themoviedb.org/3',
  imageBaseUrl: 'https://image.tmdb.org/t/p',
  readAccessToken: 'PASTE_YOUR_TMDB_V4_READ_ACCESS_TOKEN_HERE',
  imageSizes: Object.freeze({
    poster: 'w342',
    backdrop: 'w1280',
    profile: 'w185',
  }),
});
