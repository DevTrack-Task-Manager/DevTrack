import { Link, NavLink, useNavigate } from 'react-router-dom';
import Avatar from './Avatar';
import Brand from './Brand';
import Button from './Button';
import { useAuth } from '../hooks/useAuth';

/** Header shared by every signed-in page: brand, main navigation, the account link and Sign out (FR-13). */
export default function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="topbar">
      <div className="topbar__left">
        <Brand to="/dashboard" background="var(--green)" bars="var(--black)" />
        <nav className="topbar__nav" aria-label="Main">
          <NavLink to="/dashboard" className="topbar__link">
            Tasks
          </NavLink>
          <NavLink to="/profile" className="topbar__link">
            Profile
          </NavLink>
        </nav>
      </div>
      <div className="topbar__user">
        <Link to="/profile" className="topbar__account" aria-label={`${user.name}, your profile`}>
          <Avatar name={user.name} />
          <span className="topbar__name">{user.name}</span>
        </Link>
        <Button variant="outline" size="small" onClick={handleSignOut}>
          Sign out
        </Button>
      </div>
    </header>
  );
}
