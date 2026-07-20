let trailerDialog;
let lastFocusedElement;

function closeTrailer() {
  if (!trailerDialog?.open) return;
  trailerDialog.close();
}

function ensureDialog() {
  if (trailerDialog) return trailerDialog;
  trailerDialog = document.createElement('dialog');
  trailerDialog.className = 'trailer-dialog';
  trailerDialog.setAttribute('aria-labelledby', 'trailer-title');

  trailerDialog.addEventListener('close', () => {
    trailerDialog.replaceChildren(); // removes the iframe and stops playback
    lastFocusedElement?.focus();
  });
  trailerDialog.addEventListener('click', (event) => {
    if (event.target === trailerDialog) closeTrailer();
  });
  document.body.append(trailerDialog);
  return trailerDialog;
}

/** Opens a native accessible dialog and creates the privacy-friendly embed on demand. */
export function openTrailer({ title, youtubeKey, trigger }) {
  if (!/^[A-Za-z0-9_-]{6,}$/.test(youtubeKey)) return;
  lastFocusedElement = trigger;
  const dialog = ensureDialog();
  dialog.replaceChildren();

  const heading = document.createElement('h2');
  heading.id = 'trailer-title';
  heading.textContent = `${title} trailer`;
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'dialog-close';
  close.textContent = '×';
  close.setAttribute('aria-label', 'Close trailer');
  close.title = 'Close trailer';
  close.addEventListener('click', closeTrailer);
  const frame = document.createElement('iframe');
  frame.className = 'trailer-frame';
  frame.src = `https://www.youtube-nocookie.com/embed/${youtubeKey}?autoplay=1`;
  frame.title = `${title} official trailer`;
  frame.allow = 'autoplay; encrypted-media; picture-in-picture';
  frame.allowFullscreen = true;
  dialog.append(heading, close, frame);
  dialog.showModal();
  close.focus();
}
