import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, ClipboardList, MessageCircle, User, Bell, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { getInitials } from '../utils/helpers';

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  useEffect(() => {
    api.getThreads().then(data => {
      const total = data.threads.reduce((sum, t) => sum + (t.unreadCount || 0), 0);
      setUnreadMessages(total);
    }).catch(() => {});
    api.getNotifications().then(data => {
      setUnreadNotifs(data.unreadCount || 0);
    }).catch(() => {});
  }, [location.pathname]);

  const tabs = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/my-tasks', icon: ClipboardList, label: 'My Tasks' },
    { path: '/messages', icon: MessageCircle, label: 'Messages', badge: unreadMessages },
    { path: '/notifications', icon: Bell, label: 'Notifications', badge: unreadNotifs },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  // Bottom nav uses a subset (no notifications — it's in the header on mobile)
  const mobileTabs = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/my-tasks', icon: ClipboardList, label: 'My Tasks' },
    { path: '/messages', icon: MessageCircle, label: 'Messages', badge: unreadMessages },
    { path: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="sidebar-nav">
        <div className="sidebar-logo">
          <h1>Campus<span style={{ color: 'var(--primary)' }}>Gig</span></h1>
          {user && <p>{user.university}</p>}
        </div>

        <div className="sidebar-links">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = tab.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(tab.path);
            return (
              <Link key={tab.path} to={tab.path} className={isActive ? 'active' : ''}>
                <Icon size={20} />
                {tab.label}
                {tab.badge > 0 && (
                  <span className="notif-badge nav-badge">{tab.badge}</span>
                )}
              </Link>
            );
          })}
        </div>

        <div className="sidebar-post-btn">
          <button
            className="btn btn-primary btn-full"
            onClick={() => navigate('/post')}
            style={{ fontSize: 15, padding: '14px 20px' }}
          >
            <Plus size={20} /> Post a Task
          </button>
        </div>

        {user && (
          <div className="sidebar-user" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }}>
            <div className="avatar avatar-sm">
              {user.profilePhoto ? <img src={user.profilePhoto} alt="" /> : getInitials(user.displayName)}
            </div>
            <div className="sidebar-user-info">
              <div className="name">{user.displayName}</div>
              <div className="university">{user.email}</div>
            </div>
          </div>
        )}
      </nav>

      {/* Page content */}
      {children}

      {/* Mobile bottom nav */}
      <nav className="bottom-nav">
        {mobileTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.path;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={isActive ? 'active' : ''}
            >
              <span style={{ position: 'relative' }}>
                <Icon size={22} />
                {tab.badge > 0 && (
                  <span className="notif-badge" style={{
                    position: 'absolute', top: -6, right: -10,
                  }}>
                    {tab.badge}
                  </span>
                )}
              </span>
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
