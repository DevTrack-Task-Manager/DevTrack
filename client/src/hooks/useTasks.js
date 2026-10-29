import { useCallback, useEffect, useRef, useState } from 'react';
import { taskService } from '../services/taskService';
import { describeSubmitError } from '../utils/forms';

/**
 * Owns the task list for the dashboard.
 *
 *   status: 'loading' | 'ready' | 'error'
 *   error:  { title, body } for the error banner (only when status is 'error')
 *
 * create / update / remove throw the original ApiError so the caller (the form or a card) can
 * show field errors or a message in the right place. The list updates only after the server
 * confirms, so the screen never shows a change that did not happen.
 */
export function useTasks() {
  const [state, setState] = useState({ status: 'loading', tasks: [], error: null });
  const latest = useRef(0);

  const load = useCallback(async (signal) => {
    const id = ++latest.current;
    setState((prev) => ({ ...prev, status: 'loading', error: null }));
    try {
      const data = await taskService.list({ signal });
      if (id !== latest.current) return;
      setState({ status: 'ready', tasks: data.tasks, error: null });
    } catch (err) {
      if (err?.name === 'AbortError' || id !== latest.current) return;
      setState({ status: 'error', tasks: [], error: describeSubmitError(err) });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const reload = useCallback(() => load(), [load]);

  const create = useCallback(async (payload) => {
    const { task } = await taskService.create(payload);
    setState((prev) => ({ ...prev, tasks: [task, ...prev.tasks] }));
    return task;
  }, []);

  const update = useCallback(async (id, payload) => {
    try {
      const { task } = await taskService.update(id, payload);
      setState((prev) => ({ ...prev, tasks: prev.tasks.map((t) => (t.id === id ? task : t)) }));
      return task;
    } catch (err) {
      // 404 means the task is already gone (deleted elsewhere): drop it from the screen too.
      if (err.status === 404) setState((prev) => ({ ...prev, tasks: prev.tasks.filter((t) => t.id !== id) }));
      throw err;
    }
  }, []);

  const remove = useCallback(async (id) => {
    try {
      await taskService.remove(id);
    } catch (err) {
      if (err.status !== 404) throw err; // already deleted: the goal is met
    }
    setState((prev) => ({ ...prev, tasks: prev.tasks.filter((t) => t.id !== id) }));
  }, []);

  return { ...state, reload, create, update, remove };
}
