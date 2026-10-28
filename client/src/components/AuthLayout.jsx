import Brand from './Brand';

const SAMPLE_BOARD = [
  { title: 'Draft the release notes', status: 'Pending', priority: 'High', glyph: '' },
  { title: 'Review the open pull request', status: 'In progress', priority: 'Medium', glyph: 'doing' },
  { title: 'Book the team offsite', status: 'Done', priority: 'Low', glyph: 'done' },
];

/** Decorative preview of the three task states. Hidden from assistive tech. */
function Board() {
  return (
    <ul className="board" aria-hidden="true">
      {SAMPLE_BOARD.map((row) => (
        <li className="board__row" key={row.title}>
          <span className={`board__glyph ${row.glyph && `board__glyph--${row.glyph}`}`} />
          <span className={`board__title ${row.glyph === 'done' ? 'board__title--done' : ''}`}>{row.title}</span>
          <span className="board__status">{row.status}</span>
          <span className={`board__tag board__tag--${row.priority.toLowerCase()}`}>{row.priority}</span>
        </li>
      ))}
    </ul>
  );
}

export default function AuthLayout({ children }) {
  return (
    <div className="auth">
      <a className="skip-link" href="#main">
        Skip to form
      </a>

      <aside className="auth__brand">
        <Brand to="/" background="var(--black)" bars="var(--green)" />
        <div className="auth__pitch" aria-hidden="true">
          <p className="auth__headline display">Plan the day. Close the loop.</p>
          <p className="auth__lede">Tasks, priorities and due dates in one plain board.</p>
        </div>
        <Board />
      </aside>

      <main className="auth__main" id="main">
        <div className="auth__panel">{children}</div>
      </main>
    </div>
  );
}
