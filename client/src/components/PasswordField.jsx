import { useState } from 'react';
import TextField from './TextField';

export default function PasswordField({ autoComplete = 'current-password', ...props }) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      autoComplete={autoComplete}
      trailing={
        <button
          type="button"
          className="input-toggle"
          aria-pressed={visible}
          aria-label={visible ? 'Hide password' : 'Show password'}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      }
    />
  );
}
