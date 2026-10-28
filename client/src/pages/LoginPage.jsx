import { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import Alert from '../components/Alert';
import Button from '../components/Button';
import PasswordField from '../components/PasswordField';
import TextField from '../components/TextField';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import { checkEmail, checkExistingPassword, validateLogin } from '../utils/validators';
import { describeSubmitError, focusFirstInvalid } from '../utils/forms';

const FIELD_CHECKS = { email: checkEmail, password: checkExistingPassword };

export default function LoginPage() {
  usePageTitle('Sign in');
  const { login, notice, clearNotice } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const formRef = useRef(null);

  const [values, setValues] = useState({ email: location.state?.email ?? '', password: '', remember: true });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const registered = Boolean(location.state?.registered);
  const reason = notice || location.state?.reason;

  const setField = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    // Once a field shows an error, re-check it on every keystroke so it clears as soon as it is fixed.
    if (errors[name] && FIELD_CHECKS[name]) {
      setErrors((prev) => ({ ...prev, [name]: FIELD_CHECKS[name](value) }));
    }
  };

  const handleBlur = (name) => {
    const message = FIELD_CHECKS[name](values[name]);
    setErrors((prev) => ({ ...prev, [name]: message }));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    const found = validateLogin(values);
    setErrors(found);
    setSubmitError(null);
    if (Object.keys(found).length) {
      focusFirstInvalid(formRef.current, found);
      return;
    }

    setSubmitting(true);
    clearNotice();
    try {
      await login({ email: values.email.trim(), password: values.password, remember: values.remember });
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
    } catch (err) {
      setErrors(err.fields && Object.keys(err.fields).length && err.status === 400 ? err.fields : {});
      setSubmitError(
        describeSubmitError(err, { guidanceFor401: 'Check your email and password, then try again.' })
      );
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <div className="auth__heading">
        <h1 className="auth__title">Sign in</h1>
        <p className="auth__sub">Pick up where you left off.</p>
      </div>

      {registered && <Alert variant="success" title="Account created">Sign in to continue.</Alert>}
      {!registered && reason === 'expired' && (
        <Alert variant="info" title="Your session ended">Sign in again to continue.</Alert>
      )}
      {!registered && reason === 'offline' && (
        <Alert variant="error" title="Cannot reach the server">Check your connection, then sign in.</Alert>
      )}
      {submitError && (
        <Alert variant="error" title={submitError.title}>
          {submitError.body}
        </Alert>
      )}

      <form className="form" ref={formRef} onSubmit={handleSubmit} noValidate>
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          value={values.email}
          error={errors.email}
          onChange={(e) => setField('email', e.target.value)}
          onBlur={() => handleBlur('email')}
        />
        <PasswordField
          label="Password"
          name="password"
          autoComplete="current-password"
          value={values.password}
          error={errors.password}
          onChange={(e) => setField('password', e.target.value)}
          onBlur={() => handleBlur('password')}
        />
        <div className="form__row">
          <label className="check">
            <input
              type="checkbox"
              name="remember"
              checked={values.remember}
              onChange={(e) => setField('remember', e.target.checked)}
            />
            Keep me signed in
          </label>
        </div>
        <Button type="submit" block loading={submitting}>
          {submitting ? 'Signing in' : 'Sign in'}
        </Button>
      </form>

      <p className="auth__switch">
        New to DevTrack? <Link to="/register">Create an account</Link>
      </p>
    </AuthLayout>
  );
}
