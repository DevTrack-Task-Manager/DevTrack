const slug = (value) => value.toLowerCase().replace(/\s+/g, '-');

/** Status is always written out as text. The glyph shape (empty, half, full) is a second cue, never colour alone. */
export function StatusBadge({ status }) {
  return (
    <span className={`badge badge--status-${slug(status)}`}>
      <span className="badge__glyph" aria-hidden="true" />
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  return <span className={`badge badge--priority-${slug(priority)}`}>{priority} priority</span>;
}
