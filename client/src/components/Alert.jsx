/** Flat message bar. Errors use role="alert" so screen readers announce them immediately. */
export default function Alert({ variant = 'info', title, children }) {
  return (
    <div className={`alert alert--${variant}`} role={variant === 'error' ? 'alert' : 'status'}>
      {title && <p className="alert__title">{title}</p>}
      {children && <p className="alert__body">{children}</p>}
    </div>
  );
}
