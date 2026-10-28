export default function Button({
  variant = 'primary',
  size,
  block = false,
  loading = false,
  type = 'button',
  className = '',
  children,
  disabled,
  ...props
}) {
  const classes = ['btn', `btn--${variant}`, size && `btn--${size}`, block && 'btn--block', className]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading ? 'true' : undefined}
      {...props}
    >
      {children}
    </button>
  );
}
