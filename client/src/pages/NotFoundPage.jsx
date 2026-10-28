import { Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';

export default function NotFoundPage() {
  usePageTitle('Page not found');
  return (
    <main className="notfound">
      <p className="notfound__code display" aria-hidden="true">
        404
      </p>
      <h1 className="page__title">That page does not exist.</h1>
      <Link className="btn btn--primary" to="/dashboard">
        Go to your dashboard
      </Link>
    </main>
  );
}
