import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '../components/Alert';
import Brand from '../components/Brand';
import Button from '../components/Button';
import TaskForm from '../components/TaskForm';
import TaskItem from '../components/TaskItem';
import TaskSummary from '../components/TaskSummary';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import { useTasks } from '../hooks/useTasks';
import { describeSubmitError } from '../utils/forms';

const formatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/**
 * Task dashboard (Issue #8): summary counters, the task list with create / edit / delete, and
 * loading, empty and error states. Data comes from useTasks -> taskService -> api.js.
 * The route itself is protected by ProtectedRoute (Issue #16).
 */
export default function DashboardPage() {
  usePageTitle('Dashboard');
  const { user, session, logout } = useAuth();
  const navigate = useNavigate();
  const { status, tasks, error, reload, create, update, remove } = useTasks();

  // null = closed, { task: undefined } = creating, { task } = editing
  const [form, setForm] = useState(null);
  const [actionError, setActionError] = useState(null);

  const firstName = user.name.split(' ')[0];
  const openCount = useMemo(() => tasks.filter((t) => t.status !== 'Completed').length, [tasks]);

  const handleSignOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleSave = async (payload) => {
    if (form.task) await update(form.task.id, payload);
    else await create(payload);
    setActionError(null);
    setForm(null);
  };

  const handleDelete = async (task) => {
    setActionError(null);
    try {
      await remove(task.id);
    } catch (err) {
      setActionError(describeSubmitError(err));
    }
  };

  const subtitle =
    status === 'ready'
      ? openCount === 0
        ? 'Nothing open right now.'
        : `${openCount} open ${openCount === 1 ? 'task' : 'tasks'}.`
      : 'Loading your workspace.';

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
          <p className="page__sub">{subtitle}</p>
        </div>

        {status === 'ready' && <TaskSummary tasks={tasks} />}

        <div className="workspace">
          <section className="panel" aria-labelledby="tasks-heading">
            <div className="panel__head">
              <h2 className="panel__title" id="tasks-heading">
                Your tasks
              </h2>
              <Button size="small" onClick={() => setForm({})}>
                New task
              </Button>
            </div>

            {actionError && (
              <Alert variant="error" title={actionError.title}>
                {actionError.body}
              </Alert>
            )}

            {status === 'loading' && (
              <div className="tasks-loading" role="status" aria-live="polite">
                <div className="loader__bar" aria-hidden="true" />
                <span>Loading your tasks</span>
              </div>
            )}

            {status === 'error' && (
              <div className="banner">
                <Alert variant="error" title={error.title}>
                  {error.body}
                </Alert>
                <Button variant="outline" size="small" onClick={reload}>
                  Try again
                </Button>
              </div>
            )}

            {status === 'ready' && tasks.length === 0 && (
              <div className="empty">
                <p className="empty__title display">No tasks found</p>
                <p className="empty__body">Create your first task to start tracking your work.</p>
                <div>
                  <Button size="small" onClick={() => setForm({})}>
                    Create a task
                  </Button>
                </div>
              </div>
            )}

            {status === 'ready' && tasks.length > 0 && (
              <ul className="tasks" aria-label="Tasks">
                {tasks.map((task) => (
                  <TaskItem key={task.id} task={task} onEdit={(t) => setForm({ task: t })} onDelete={handleDelete} />
                ))}
              </ul>
            )}
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

      {form && <TaskForm task={form.task} onSubmit={handleSave} onClose={() => setForm(null)} />}
    </>
  );
}
