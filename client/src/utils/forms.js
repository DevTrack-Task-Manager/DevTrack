/** Moves focus to the first field with an error so keyboard and screen reader users land on it. */
export function focusFirstInvalid(form, errors) {
  if (!form) return;
  const name = Object.keys(errors)[0];
  if (name) form.elements.namedItem(name)?.focus();
}

/** Turns an ApiError into a form-level message, with extra guidance for common cases. */
export function describeSubmitError(err, { guidanceFor401 } = {}) {
  if (err.status === 401 && guidanceFor401) return { title: err.message, body: guidanceFor401 };
  if (err.status === 0) return { title: 'Cannot reach the server', body: 'Check your connection and try again.' };
  if (err.status === 429) return { title: err.message, body: '' };
  if (err.status >= 500) return { title: 'Something went wrong on our side', body: 'Please try again in a moment.' };
  return { title: err.message, body: '' };
}
