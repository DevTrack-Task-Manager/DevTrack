import { initialsOf } from '../utils/initials';

/** Flat initials square. Decorative: the name is always written out next to it. */
export default function Avatar({ name, size = 'small' }) {
  return (
    <span className={`avatar avatar--${size}`} aria-hidden="true">
      {initialsOf(name)}
    </span>
  );
}
