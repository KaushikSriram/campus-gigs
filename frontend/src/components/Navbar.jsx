import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import api from '../api';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = () => {
      api.get('/messages/unread-count').then(r => setUnread(r.data.count)).catch(() => {});
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar">
      <Link to={user ? '/dashboard' : '/'} className="navbar-brand">
        CampusGigs
      </Link>
      <div className="navbar-links">
        {user ? (
          <>
            <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-active' : ''}>Browse</NavLink>
            <NavLink to="/post" className={({ isActive }) => isActive ? 'nav-active' : ''}>Post Task</NavLink>
            <NavLink to="/my-tasks" className={({ isActive }) => isActive ? 'nav-active' : ''}>My Tasks</NavLink>
            <NavLink to="/messages" className={({ isActive }) => isActive ? 'nav-active' : ''}>
              Messages{unread > 0 && <span className="unread-badge">{unread}</span>}
            </NavLink>
            <NavLink to={`/profile/${user.id}`} className={({ isActive }) => isActive ? 'nav-active' : ''}>Profile</NavLink>
            <button onClick={handleLogout} className="nav-btn">Logout</button>
          </>
        ) : (
          <>
            <NavLink to="/login" className={({ isActive }) => isActive ? 'nav-active' : ''}>Login</NavLink>
            <Link to="/register" className="btn btn-primary btn-sm">Sign Up</Link>
          </>
        )}
      </div>
    </nav>
  );
}
