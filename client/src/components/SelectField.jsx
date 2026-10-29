import { useId } from 'react';

/** Labelled native <select> (keyboard and screen reader friendly), styled to match TextField. */
export default function SelectField({ label, options, error, id, ...selectProps }) {
  const generated = useId();
  const selectId = id || `field-${generated}`;
  const errorId = error ? `${selectId}-error` : undefined;

  return (
    <div className="field">
      <label className="field__label" htmlFor={selectId}>
        {label}
      </label>
      <select
        id={selectId}
        className="input select"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={errorId}
        {...selectProps}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {errorId && (
        <p className="field__error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
}
