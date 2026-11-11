import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Alert from '../components/Alert';
import Avatar from '../components/Avatar';
import Button from '../components/Button';
import PasswordField from '../components/PasswordField';
import TextField from '../components/TextField';
import TopBar from '../components/TopBar';
import { completionPercent } from '../constants/tasks';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import { taskService } from '../services/taskService';
import { describeSubmitError, focusFirstInvalid } from '../utils/forms';
import { NAME_MAX, checkEmail, checkExistingPassword, checkName, validateProfile } from '../utils/validators';

const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const dateOnly = new Intl.DateTimeFormat(undefined, { dateStyle: 'long' });

const formatDate = (formatter, iso) => {
  const date = iso ? new Date(iso) : null;
  return date && !Number.isNaN(date.getTime()) ? formatter.format(date) : 'Unknown';
};

/**
 * Profile (user details): shows the account, lets the user edit name and email, and shows task
 * totals. Changing the email needs the current password (it is the login identifier). The route
 * is protected by ProtectedRoute, and the API only ever edits the user named by the token.
 */
export default function ProfilePage() {
  usePageTitle('Profile');
  const { user, session, updateProfile } = useAuth();
  const formRef = useRef(null);

  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState({ name: user.name, email: user.email, currentPassword: '' });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [summary, setSummary] = useState(null); // null while loading or if it could not be loaded

  useEffect(() => {
    const controller = new AbortController();
    taskService
      .list({ signal: controller.signal })
      .then((data) => setSummary(data.summary ?? null))
      .catch(() => {}); // the stats are a nicety: the page works without them
    return () => controller.abort();
  }, []);

  const emailChanged = values.email.trim().toLowerCase() !== user.email.toLowerCase();

  const startEditing = () => {
    setValues({ name: user.name, email: user.email, currentPassword: '' });
    setErrors({});
    setSubmitError(null);
    setSaved(false);
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setErrors({});
    setSubmitError(null);
  };

  const FIELD_CHECKS = {
    name: checkName,
    email: checkEmail,
    currentPassword: (value) => (emailChanged ? checkExistingPassword(value) : ''),
  };

  const setField = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: FIELD_CHECKS[name](value) }));
  };

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;

    const found = validateProfile(values, user);
    setErrors(found);
    setSubmitError(null);
    if (Object.keys(found).length) {
      focusFirstInvalid(formRef.current, found);
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        name: values.name.trim(),
        email: values.email.trim(),
        ...(emailChanged ? { currentPassword: values.currentPassword } : {}),
      });
      setSaved(true);
      setEditing(false);
    } catch (err) {
      const serverFields = err.fields && Object.keys(err.fields).length ? err.fields : null;
      if (serverFields) {
        setErrors(serverFields);
        focusFirstInvalid(formRef.current, serverFields);
      } else {
        setSubmitError(describeSubmitError(err));
      }
    } finally {
      setSaving(false);
    }
  }

  const percent = summary ? completionPercent(summary) : 0;

  return (
    <>
      <TopBar />

      <main className="page">
        <section className="hero hero--profile" aria-label="Account overview">
          <Avatar name={user.name} size="large" />
          <div className="hero__text">
            <p className="hero__eyebrow">Your account</p>
            <h1 className="page__title">Your profile</h1>
            <p className="page__sub">{user.email}</p>
          </div>
        </section>

        {saved && (
          <Alert variant="success" title="Profile updated">
            Your details have been saved.
          </Alert>
        )}

        <div className="profile">
          <section className="panel" aria-labelledby="details-heading">
            <div className="panel__head">
              <h2 className="panel__title" id="details-heading">
                Account details
              </h2>
              {!editing && (
                <Button size="small" onClick={startEditing}>
                  Edit details
                </Button>
              )}
            </div>

            {editing ? (
              <form className="form" ref={formRef} onSubmit={handleSubmit} noValidate aria-label="Edit details">
                {submitError && (
                  <Alert variant="error" title={submitError.title}>
                    {submitError.body}
                  </Alert>
                )}
                <TextField
                  label="Name"
                  name="name"
                  autoComplete="name"
                  maxLength={NAME_MAX}
                  value={values.name}
                  error={errors.name}
                  onChange={(e) => setField('name', e.target.value)}
                />
                <TextField
                  label="Email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  value={values.email}
                  error={errors.email}
                  hint="This is what you sign in with."
                  onChange={(e) => setField('email', e.target.value)}
                />
                {emailChanged && (
                  <PasswordField
                    label="Current password"
                    name="currentPassword"
                    autoComplete="current-password"
                    hint="Needed to change your email."
                    value={values.currentPassword}
                    error={errors.currentPassword}
                    onChange={(e) => setField('currentPassword', e.target.value)}
                  />
                )}
                <div className="form__actions">
                  <Button type="submit" loading={saving}>
                    {saving ? 'Saving' : 'Save changes'}
                  </Button>
                  <Button variant="outline" disabled={saving} onClick={cancelEditing}>
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <dl className="facts facts--grid">
                <div>
                  <dt>Name</dt>
                  <dd>{user.name}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{user.email}</dd>
                </div>
                <div>
                  <dt>Member since</dt>
                  <dd>{formatDate(dateOnly, user.createdAt)}</dd>
                </div>
                <div>
                  <dt>Session ends</dt>
                  <dd>{formatDate(dateTime, session?.expiresAt)}</dd>
                </div>
              </dl>
            )}
          </section>

          <section className="panel" aria-labelledby="activity-heading">
            <h2 className="panel__title" id="activity-heading">
              Your activity
            </h2>
            {summary ? (
              <>
                <dl className="facts facts--grid">
                  <div>
                    <dt>Tasks</dt>
                    <dd>{summary.total}</dd>
                  </div>
                  <div>
                    <dt>Open</dt>
                    <dd>{summary.total - summary.byStatus.Completed}</dd>
                  </div>
                  <div>
                    <dt>Completed</dt>
                    <dd>{summary.byStatus.Completed}</dd>
                  </div>
                  <div>
                    <dt>High priority</dt>
                    <dd>{summary.byPriority.High}</dd>
                  </div>
                </dl>
                <div
                  className="progress"
                  role="progressbar"
                  aria-label="Completed share of all tasks"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percent}
                >
                  <span className="progress__fill" style={{ width: `${percent}%` }} />
                </div>
                <p className="hero__caption">{percent}% of your tasks are completed.</p>
              </>
            ) : (
              <p className="empty__body">Task totals are not available right now.</p>
            )}
            <div>
              <Link className="btn btn--outline btn--small" to="/dashboard">
                Back to tasks
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
