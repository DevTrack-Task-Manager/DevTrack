export default function PageLoader({ label = 'Loading' }) {
  return (
    <div className="loader" role="status" aria-live="polite">
      <div className="loader__bar" aria-hidden="true" />
      <span className="visually-hidden">{label}</span>
    </div>
  );
}
