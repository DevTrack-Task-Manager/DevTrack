import { STATUSES } from '../constants/tasks';

const TONES = { Total: 'total', Pending: 'pending', 'In Progress': 'progress', Completed: 'done' };

/**
 * Counters for the whole list: total, then one per status. When `onSelect` is given every card is
 * also a filter shortcut: pressing it shows only that status, pressing it again (or "Total") shows all.
 * The counts always describe the full list, so they do not move while the list below is filtered.
 */
export default function TaskSummary({ summary, activeStatus = '', onSelect }) {
  const items = [
    { key: '', label: 'Total', value: summary.total },
    ...STATUSES.map((status) => ({ key: status, label: status, value: summary.byStatus[status] ?? 0 })),
  ];

  return (
    <section className="summary" aria-label="Task summary">
      <dl className="summary__grid">
        {items.map(({ key, label, value }) => {
          const active = activeStatus === key;
          return (
            <div className={`stat stat--${TONES[label]}${active ? ' is-active' : ''}`} key={label}>
              <dt className="stat__label">
                {label}
                {onSelect && (
                  <button
                    type="button"
                    className="stat__hit"
                    aria-pressed={active}
                    aria-label={key ? `Show ${label} tasks` : 'Show all tasks'}
                    onClick={() => onSelect(active ? '' : key)}
                  />
                )}
              </dt>
              <dd className="stat__value display">{value}</dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}
