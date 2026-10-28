import { Link } from 'react-router-dom';

/** Square mark: three bars growing in length, a flat nod to a task list filling up. */
export function BrandMark({ background = 'var(--black)', bars = 'var(--green)' }) {
  return (
    <svg className="brand__mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" fill={background} />
      <rect x="6" y="7" width="8" height="4" fill={bars} />
      <rect x="6" y="14" width="14" height="4" fill={bars} />
      <rect x="6" y="21" width="20" height="4" fill={bars} />
    </svg>
  );
}

export default function Brand({ to = '/', background, bars }) {
  return (
    <Link className="brand" to={to} aria-label="DevTrack home">
      <BrandMark background={background} bars={bars} />
      <span className="brand__name">DevTrack</span>
    </Link>
  );
}
