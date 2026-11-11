import { useMemo, useState } from 'react';
import Alert from '../components/Alert';
import Button from '../components/Button';
import SelectField from '../components/SelectField';
import TaskForm from '../components/TaskForm';
import TaskItem from '../components/TaskItem';
import TaskSummary from '../components/TaskSummary';
import TopBar from '../components/TopBar';
import { PRIORITIES, SORT_OPTIONS, STATUSES, completionPercent, hasActiveFilters, matchesSearch, sortTasks } from '../constants/tasks';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/usePageTitle';
import { useTasks } from '../hooks/useTasks';
import { describeSubmitError } from '../utils/forms';

const todayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' });

/**
 * Task dashboard (Issues #5 to #8, #10): progress hero, clickable summary cards, the task list with
 * create / edit / delete, quick status and priority changes, server-side status and priority
 * filters, client-side search and sorting, and loading, empty and error states.
 * Data comes from useTasks -> taskService -> api.js. The route is protected by ProtectedRoute (Issue #16).
 */
export default function DashboardPage() {
  usePageTitle('Dashboard');
  const { user } = useAuth();
  const { status, tasks, summary, error, filters, setFilter, clearFilters, reload, create, update, remove } = useTasks();
  const filtered = hasActiveFilters(filters);

  // null = closed, { task: undefined } = creating, { task } = editing
  const [form, setForm] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [notice, setNotice] = useState('');

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');

  const firstName = user.name.split(' ')[0];
  const openCount = summary.total - summary.byStatus.Completed;
  const percent = completionPercent(summary);
  const searching = search.trim().length > 0;
  const narrowed = filtered || searching;
  const visible = useMemo(() => sortTasks(tasks.filter((t) => matchesSearch(t, search)), sort), [tasks, search, sort]);

  const clearAll = () => {
    clearFilters();
    setSearch('');
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

  // Issue #5: one-click status changes. The list only changes after the server confirms.
  const handleStatusChange = async (task, nextStatus) => {
    setActionError(null);
    setNotice('');
    try {
      const saved = await update(task.id, { status: nextStatus });
      setNotice(`${saved.title} is now ${saved.status}.`);
    } catch (err) {
      setActionError(describeSubmitError(err));
    }
  };

  // Issue #6: change priority from the card. Same rules as status changes.
  const handlePriorityChange = async (task, nextPriority) => {
    setActionError(null);
    setNotice('');
    try {
      const saved = await update(task.id, { priority: nextPriority });
      setNotice(`${saved.title} now has ${saved.priority} priority.`);
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
      <TopBar />

      <main className="page">
        <section className="hero" aria-label="Overview">
          <div className="hero__text">
            <p className="hero__eyebrow">{todayFormatter.format(new Date())}</p>
            <h1 className="page__title">Hi, {firstName}.</h1>
            <p className="page__sub">{subtitle}</p>
          </div>
          {status !== 'loading' && summary.total > 0 && (
            <div className="hero__progress">
              <p className="hero__percent display">{percent}%</p>
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
              <p className="hero__caption">
                {summary.byStatus.Completed} of {summary.total} completed
              </p>
            </div>
          )}
        </section>

        <TaskSummary summary={summary} activeStatus={filters.status} onSelect={(next) => setFilter('status', next)} />

        <section className="panel" aria-labelledby="tasks-heading">
          <div className="panel__head">
            <h2 className="panel__title" id="tasks-heading">
              Your tasks
            </h2>
            <Button size="small" onClick={() => setForm({})}>
              New task
            </Button>
          </div>

          <div className="filters" role="group" aria-label="Filter tasks">
            <div className="field filters__search">
              <label className="field__label" htmlFor="task-search">
                Search
              </label>
              <input
                id="task-search"
                className="input"
                type="search"
                placeholder="Search titles and descriptions"
                autoComplete="off"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <SelectField
              label="Status"
              name="statusFilter"
              options={STATUSES}
              allLabel="All statuses"
              value={filters.status}
              onChange={(event) => setFilter('status', event.target.value)}
            />
            <SelectField
              label="Priority"
              name="priorityFilter"
              options={PRIORITIES}
              allLabel="All priorities"
              value={filters.priority}
              onChange={(event) => setFilter('priority', event.target.value)}
            />
            <SelectField label="Sort by" name="sort" options={SORT_OPTIONS} value={sort} onChange={(event) => setSort(event.target.value)} />
            <Button variant="outline" size="small" disabled={!narrowed} onClick={clearAll}>
              Clear filters
            </Button>
          </div>

          {status === 'ready' && tasks.length > 0 && (
            <p className="results" aria-live="polite">
              Showing {visible.length} of {summary.total} {summary.total === 1 ? 'task' : 'tasks'}
            </p>
          )}

          {notice && (
            <p className="visually-hidden" role="status" aria-live="polite">
              {notice}
            </p>
          )}

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

          {status === 'ready' && visible.length === 0 && narrowed && (
            <div className="empty">
              <p className="empty__title display">No matching tasks</p>
              <p className="empty__body">No task fits your search or filters. Clear them to see everything.</p>
              <div>
                <Button size="small" onClick={clearAll}>
                  Clear filters
                </Button>
              </div>
            </div>
          )}

          {status === 'ready' && visible.length === 0 && !narrowed && (
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

          {status === 'ready' && visible.length > 0 && (
            <ul className="tasks" aria-label="Tasks">
              {visible.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  onEdit={(t) => setForm({ task: t })}
                  onDelete={handleDelete}
                  onStatusChange={handleStatusChange}
                  onPriorityChange={handlePriorityChange}
                />
              ))}
            </ul>
          )}
        </section>
      </main>

      {form && <TaskForm task={form.task} onSubmit={handleSave} onClose={() => setForm(null)} />}
    </>
  );
}
