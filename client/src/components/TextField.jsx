import { useId } from 'react';

/** Labelled input with hint and inline error wired up for assistive tech (FR-12). */
export default function TextField({ label, error, hint, id, trailing, ...inputProps }) {
  const generated = useId();
  const inputId = id || `field-${generated}`;
  const hintId = hint && !error ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;

  return (
    <div className="field">
      <label className="field__label" htmlFor={inputId}>
        {label}
      </label>
      <div className="input-group">
        <input
          id={inputId}
          className="input"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={errorId || hintId}
          {...inputProps}
        />
        {trailing}
      </div>
      {hintId && (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      )}
      {errorId && (
        <p className="field__error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
}
