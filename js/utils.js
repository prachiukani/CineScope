/**
 * Delays a function until calls stop for `delay` milliseconds. Every new call
 * resets the timer, so a search runs after typing pauses—not per keystroke.
 */
export function debounce(callback, delay = 300) {
  let timerId;
  return (...args) => {
    window.clearTimeout(timerId);
    timerId = window.setTimeout(() => callback(...args), delay);
  };
}
