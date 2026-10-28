import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import Alert from '../components/Alert';
import Button from '../components/Button';
import PasswordField from '../components/PasswordField';
import PasswordStrength from '../components/PasswordStrength';
import TextField from '../components/TextField';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import { NAME_MAX, checkEmail, checkName, checkNewPassword, validateRegistration } from '../utils/validators';
import { describeSubmitError, focusFirstInvalid } from '../utils/forms';

const FIELD_CHECKS = { name: checkName, email: checkEmail, password: checkNewPassword };

export default function RegisterPage() {
  usePageTitle('Create account');
  const { register } = useAuth();
  const navigate = useNavigate();
  const formRef = useRef(null);

  const [values, setValues] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const setField = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: FIELD_CHECKS[name](value) }));
  };

  const handleBlur = (name) => {
    setErrors((prev) => ({ ...prev, [name]: FIELD_CHECKS[name](values[name]) }));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    const found = validateRegistration(values);
    setErrors(found);
    setSubmitError(null);
    if (Object.keys(found).length) {
      focusFirstInvalid(formRef.current, found);
      return;
    }

    setSubmitting(true);
    try {
      await register({ name: values.name.trim(), email: values.email.trim(), password: values.password });
      // ST_01: registered users land on the login page with a confirmation and their email filled in.
      navigate('/login', { replace: true, state: { registered: true, email: values.email.trim() } });
    } catch (err) {
      const serverFields = err.fields && Object.keys(err.fields).length ? err.fields : null;
      if (serverFields) {
        setErrors(serverFields);
        focusFirstInvalid(formRef.current, serverFields);
      } else {
        setSubmitError(describeSubmitError(err));
      }
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <div className="auth__heading">
        <h1 className="auth__title">Create your account</h1>
        <p className="auth__sub">It takes under a minute.</p>
      </div>

      {submitError && (
        <Alert variant="error" title={submitError.title}>
          {submitError.body}
        </Alert>
      )}

      <form className="form" ref={formRef} onSubmit={handleSubmit} noValidate>
        <TextField
          label="Name"
          name="name"
          autoComplete="name"
          maxLength={NAME_MAX}
          placeholder="Priya S"
          value={values.name}
          error={errors.name}
          onChange={(e) => setField('name', e.target.value)}
          onBlur={() => handleBlur('name')}
        />
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
        <div className="field">
          <PasswordField
            label="Password"
            name="password"
            autoComplete="new-password"
            hint="At least 6 characters."
            value={values.password}
            error={errors.password}
            onChange={(e) => setField('password', e.target.value)}
            onBlur={() => handleBlur('password')}
          />
          <PasswordStrength password={values.password} />
        </div>
        <Button type="submit" block loading={submitting}>
          {submitting ? 'Creating account' : 'Create account'}
        </Button>
      </form>

      <p className="auth__switch">
        Already registered? <Link to="/login">Sign in</Link>
      </p>
    </AuthLayout>
  );
}
