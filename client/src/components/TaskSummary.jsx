import { STATUSES } from '../constants/tasks';

/** Counters for the whole list: total, then one per status. */
export default function TaskSummary({ tasks }) {
  const counts = STATUSES.map((status) => ({ label: status, value: tasks.filter((t) => t.status === status).length }));
  const items = [{ label: 'Total', value: tasks.length }, ...counts];

  return (
    <section className="summary" aria-label="Task summary">
      <dl className="summary__grid">
        {items.map(({ label, value }) => (
          <div className="stat" key={label}>
            <dt className="stat__label">{label}</dt>
            <dd className="stat__value display">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
