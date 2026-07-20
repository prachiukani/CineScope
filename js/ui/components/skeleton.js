/** Creates lightweight placeholders that reserve card space while data arrives. */
export function createCardSkeletons(count = 6) {
  const fragment = document.createDocumentFragment();

  for (let index = 0; index < count; index += 1) {
    const skeleton = document.createElement('div');
    skeleton.className = 'movie-card movie-card--skeleton';
    skeleton.setAttribute('aria-hidden', 'true');

    const poster = document.createElement('div');
    poster.className = 'skeleton-poster skeleton-shimmer';
    const title = document.createElement('div');
    title.className = 'skeleton-line skeleton-shimmer';
    const metadata = document.createElement('div');
    metadata.className = 'skeleton-line skeleton-line--short skeleton-shimmer';

    skeleton.append(poster, title, metadata);
    fragment.append(skeleton);
  }

  return fragment;
}

/** Visible progress without exposing a changing text message in the layout. */
export function createLoadingSpinner(label = 'Loading…') {
  const status = document.createElement('div');
  status.className = 'loading-spinner';
  status.setAttribute('role', 'status');
  const visual = document.createElement('span');
  visual.className = 'loading-spinner__visual';
  visual.setAttribute('aria-hidden', 'true');
  const accessibleLabel = document.createElement('span');
  accessibleLabel.className = 'sr-only';
  accessibleLabel.textContent = label;
  status.append(visual, accessibleLabel);
  return status;
}
