import { useEffect, useId, useRef, useState } from 'react';
import Alert from './Alert';
import Button from './Button';
import SelectField from './SelectField';
import TextAreaField from './TextAreaField';
import TextField from './TextField';
import { DEFAULT_PRIORITY, DEFAULT_STATUS, DESCRIPTION_MAX, PRIORITIES, STATUSES } from '../constants/tasks';
import { describeSubmitError, focusFirstInvalid } from '../utils/forms';
import { toDateInputValue } from '../utils/taskDates';
import { toTaskPayload, validateTaskForm } from '../utils/taskValidators';

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])';

function initialValues(task) {
  if (!task) {
    return { title: '', description: '', status: DEFAULT_STATUS, priority: DEFAULT_PRIORITY, dueDate: '' };
  }
  return {
    title: task.title,
    description: task.description ?? '',
    status: task.status,
    priority: task.priority,
    dueDate: toDateInputValue(task.dueDate),
  };
}

/**
 * Modal form for creating (no `task`) or editing (`task`) a task.
 * `onSubmit(payload)` must return a promise; the form closes itself through `onClose` only when
 * the parent decides to, so a failed save keeps the user's input on screen with the error.
 * Keyboard: focus starts on the title, Tab stays inside the dialog, Escape closes it, and focus
 * returns to the button that opened it.
 */
export default function TaskForm({ task, onSubmit, onClose }) {
  const isEdit = Boolean(task);
  const headingId = useId();
  const [values, setValues] = useState(() => initialValues(task));
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef(null);
  const panelRef = useRef(null);

  // Focus the first field, lock page scroll and restore focus when the dialog closes.
  useEffect(() => {
    const opener = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    formRef.current?.elements.namedItem('title')?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      if (opener instanceof HTMLElement && document.contains(opener)) opener.focus();
    };
  }, []);

  const handleKeyDown = (event) => {
    if (event.key === 'Escape' && !submitting) {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    const items = [...panelRef.current.querySelectorAll(FOCUSABLE)];
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const found = validateTaskForm(values);
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length) {
      focusFirstInvalid(formRef.current, found);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(toTaskPayload(values));
    } catch (err) {
      const fields = err.fields ?? {};
      setErrors(fields);
      setFormError(describeSubmitError(err));
      focusFirstInvalid(formRef.current, fields);
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <div
        className="modal__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        ref={panelRef}
        onKeyDown={handleKeyDown}
      >
        <h2 className="modal__title" id={headingId}>
          {isEdit ? 'Edit task' : 'New task'}
        </h2>

        <form className="task-form" noValidate onSubmit={handleSubmit} ref={formRef}>
          {formError && (
            <Alert variant="error" title={formError.title}>
              {formError.body}
            </Alert>
          )}

          <TextField
            label="Title"
            name="title"
            value={values.title}
            onChange={handleChange}
            error={errors.title}
            autoComplete="off"
          />

          <TextAreaField
            label="Description (optional)"
            name="description"
            rows={4}
            value={values.description}
            onChange={handleChange}
            error={errors.description}
            maxLength={DESCRIPTION_MAX}
          />

          <div className="form-row">
            <SelectField label="Status" name="status" options={STATUSES} value={values.status} onChange={handleChange} error={errors.status} />
            <SelectField
              label="Priority"
              name="priority"
              options={PRIORITIES}
              value={values.priority}
              onChange={handleChange}
              error={errors.priority}
            />
          </div>

          <TextField
            label="Due date (optional)"
            name="dueDate"
            type="date"
            value={values.dueDate}
            onChange={handleChange}
            error={errors.dueDate}
          />

          <div className="modal__actions">
            <Button variant="outline" disabled={submitting} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? 'Save changes' : 'Create task'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
