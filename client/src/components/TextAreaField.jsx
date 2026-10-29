import { useId } from 'react';

/** Labelled textarea with an optional live character counter and inline error (FR-12). */
export default function TextAreaField({ label, error, hint, id, maxLength, value = '', ...textareaProps }) {
  const generated = useId();
  const fieldId = id || `field-${generated}`;
  const hintId = hint && !error ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;

  return (
    <div className="field">
      <label className="field__label" htmlFor={fieldId}>
        {label}
      </label>
      <textarea
        id={fieldId}
        className="input textarea"
        value={value}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={errorId || hintId}
        {...textareaProps}
      />
      {maxLength && (
        <p className="field__hint field__count" aria-hidden="true">
          {value.length} / {maxLength}
        </p>
      )}
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
