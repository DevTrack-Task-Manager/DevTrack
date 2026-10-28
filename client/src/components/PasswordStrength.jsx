import { scorePassword } from '../utils/validators';

/** Three flat segments plus a text label, so strength is never conveyed by colour alone. */
export default function PasswordStrength({ password }) {
  const { level, label } = scorePassword(password);
  if (!level) return null;
  return (
    <div className={`strength strength--${level}`} role="status" aria-live="polite">
      <div className="strength__bars" aria-hidden="true">
        <span className="strength__bar" />
        <span className="strength__bar" />
        <span className="strength__bar" />
      </div>
      <span className="strength__label">
        <span className="visually-hidden">Password strength: </span>
        {label}
      </span>
    </div>
  );
}
