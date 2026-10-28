import { useNavigate } from 'react-router-dom';
import Brand from '../components/Brand';
import Button from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';

const formatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/**
 * Shell only: the task dashboard (Issue #8) and task CRUD (Issue #4) are separate work items.
 * What is real here: the protected route, the signed-in user and sign out (Issue #16 builds on this).
 */
export default function DashboardPage() {
  usePageTitle('Dashboard');
  const { user, session, logout } = useAuth();
  const navigate = useNavigate();
  const firstName = user.name.split(' ')[0];

  const handleSignOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <header className="topbar">
        <Brand to="/dashboard" background="var(--green)" bars="var(--black)" />
        <div className="topbar__user">
          <span className="topbar__name">{user.name}</span>
          <Button variant="outline" size="small" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </header>

      <main className="page">
        <div>
          <h1 className="page__title">Hi, {firstName}.</h1>
          <p className="page__sub">Your workspace is ready.</p>
        </div>

        <div className="workspace">
          <section className="panel" aria-labelledby="tasks-heading">
            <h2 className="panel__title" id="tasks-heading">
              Your tasks
            </h2>
            <div className="empty">
              <p className="empty__title display">No tasks yet</p>
              <p className="empty__body">
                Tasks you create will appear here, grouped by status. Task creation is the next feature on the way.
              </p>
            </div>
          </section>

          <section className="panel" aria-labelledby="session-heading">
            <h2 className="panel__title" id="session-heading">
              Session
            </h2>
            <dl className="facts">
              <div>
                <dt>Signed in as</dt>
                <dd>{user.email}</dd>
              </div>
              <div>
                <dt>Session ends</dt>
                <dd>{session?.expiresAt ? formatter.format(new Date(session.expiresAt)) : 'Unknown'}</dd>
              </div>
            </dl>
          </section>
        </div>
      </main>
    </>
  );
}
