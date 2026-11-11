import { useCallback, useEffect, useRef, useState } from 'react';
import { NO_FILTERS, adjustSummary, emptySummary, matchesFilters, summarizeTasks } from '../constants/tasks';
import { taskService } from '../services/taskService';
import { describeSubmitError } from '../utils/forms';

/**
 * Owns the task list for the dashboard, narrowed by the status / priority filters (Issue #7).
 * Filtering is done by the server (GET /api/tasks?status=&priority=); changing a filter reloads.
 *
 *   status: 'loading' | 'ready' | 'error'
 *   error:  { title, body } for the error banner (only when status is 'error')
 *   summary: { total, byStatus, byPriority } for the WHOLE list (not narrowed by the filters).
 *           It comes from the server and is adjusted locally after each confirmed change.
 *
 * create / update / remove throw the original ApiError so the caller (the form or a card) can
 * show field errors or a message in the right place. The list updates only after the server
 * confirms, so the screen never shows a change that did not happen.
 */
export function useTasks() {
  const [state, setState] = useState({ status: 'loading', tasks: [], error: null, summary: emptySummary() });
  const [filters, setFilters] = useState(NO_FILTERS);
  const latest = useRef(0);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const load = useCallback(async (currentFilters, signal) => {
    const id = ++latest.current;
    setState((prev) => ({ ...prev, status: 'loading', error: null }));
    try {
      const data = await taskService.list({ ...currentFilters, signal });
      if (id !== latest.current) return;
      setState({ status: 'ready', tasks: data.tasks, error: null, summary: data.summary ?? summarizeTasks(data.tasks) });
    } catch (err) {
      if (err?.name === 'AbortError' || id !== latest.current) return;
      setState((prev) => ({ ...prev, status: 'error', tasks: [], error: describeSubmitError(err) }));
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load({ status: filters.status, priority: filters.priority }, controller.signal);
    return () => controller.abort();
  }, [load, filters.status, filters.priority]);

  const reload = useCallback(() => load(filtersRef.current), [load]);

  const setFilter = useCallback((name, value) => setFilters((prev) => ({ ...prev, [name]: value })), []);
  const clearFilters = useCallback(() => setFilters(NO_FILTERS), []);

  // Removes a task from the list and from the counters.
  const dropTask = useCallback(
    (id) =>
      setState((prev) => ({
        ...prev,
        summary: adjustSummary(prev.summary, prev.tasks.find((t) => t.id === id) ?? null, null),
        tasks: prev.tasks.filter((t) => t.id !== id),
      })),
    []
  );

  const create = useCallback(async (payload) => {
    const { task } = await taskService.create(payload);
    // A new task that the active filters would hide is saved but not shown.
    setState((prev) => ({
      ...prev,
      summary: adjustSummary(prev.summary, null, task),
      tasks: matchesFilters(task, filtersRef.current) ? [task, ...prev.tasks] : prev.tasks,
    }));
    return task;
  }, []);

  const update = useCallback(async (id, payload) => {
    try {
      const { task } = await taskService.update(id, payload);
      // An edit can move a task out of the filtered view (e.g. completing it under "Pending").
      setState((prev) => {
        const before = prev.tasks.find((t) => t.id === id);
        return {
          ...prev,
          summary: before ? adjustSummary(prev.summary, before, task) : prev.summary,
          tasks: matchesFilters(task, filtersRef.current)
            ? prev.tasks.map((t) => (t.id === id ? task : t))
            : prev.tasks.filter((t) => t.id !== id),
        };
      });
      return task;
    } catch (err) {
      // 404 means the task is already gone (deleted elsewhere): drop it from the screen too.
      if (err.status === 404) dropTask(id);
      throw err;
    }
  }, [dropTask]);

  const remove = useCallback(async (id) => {
    try {
      await taskService.remove(id);
    } catch (err) {
      if (err.status !== 404) throw err; // already deleted: the goal is met
    }
    dropTask(id);
  }, [dropTask]);

  return { ...state, filters, setFilter, clearFilters, reload, create, update, remove };
}
