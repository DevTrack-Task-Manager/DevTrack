import { useId } from 'react';

/**
 * Labelled native <select> (keyboard and screen reader friendly), styled to match TextField.
 * Pass `allLabel` to add a first option with an empty value, used by the list filters.
 * `options` are plain strings, or `{ value, label }` objects when the text differs from the value.
 */
export default function SelectField({ label, options, error, id, allLabel, ...selectProps }) {
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
        {allLabel !== undefined && <option value="">{allLabel}</option>}
        {options.map((option) => {
          const { value, label: text } = typeof option === 'string' ? { value: option, label: option } : option;
          return (
            <option key={value} value={value}>
              {text}
            </option>
          );
        })}
      </select>
      {errorId && (
        <p className="field__error" id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
}
