import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Home, ListTodo, MessageCircle, Bell, User, Plus, LogIn, ChevronDown, Search, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api';
import { UNIVERSITIES } from '../data/universities';

const TABS = [
  { path: '/', label: 'Home', icon: Home, public: true },
  { path: '/my-tasks', label: 'My Tasks', icon: ListTodo },
  { path: '/messages', label: 'Messages', icon: MessageCircle },
  { path: '/notifications', label: 'Alerts', icon: Bell },
  { path: '/profile', label: 'Profile', icon: User },
];

export default function Layout({ children }) {
  const { user, university, setUniversity, requireLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unread, setUnread] = useState({ messages: 0, notifications: 0 });
  const [showSchoolPicker, setShowSchoolPicker] = useState(false);

  useEffect(() => {
    if (!user) return;
    const loadCounts = async () => {
      try {
        const [convos, notifs] = await Promise.all([
          api.getConversations(),
          api.getNotifications(),
        ]);
        setUnread({
          messages: convos.conversations?.filter(c => c.unreadCount).length || 0,
          notifications: notifs.unreadCount || 0,
        });
      } catch {}
    };
    loadCounts();
    const iv = setInterval(loadCounts, 30000);
    return () => clearInterval(iv);
  }, [user]);

  const handleProtectedNav = (path) => {
    requireLogin(() => navigate(path));
  };

  const handleSchoolChange = (newSchool) => {
    setUniversity(newSchool);
    setShowSchoolPicker(false);
  };

  const renderSidebarLink = (tab) => {
    const Icon = tab.icon;
    const isActive = location.pathname === tab.path;
    const badge = tab.path === '/messages' ? unread.messages : tab.path === '/notifications' ? unread.notifications : 0;

    if (!user && !tab.public) {
      return (
        <button
          key={tab.path}
          onClick={() => handleProtectedNav(tab.path)}
          style={{ position: 'relative' }}
        >
          <Icon size={20} />
          {tab.label}
        </button>
      );
    }

    return (
      <NavLink
        key={tab.path}
        to={tab.path}
        className={isActive ? 'active' : ''}
        style={{ position: 'relative' }}
      >
        <Icon size={20} />
        {tab.label}
        {badge > 0 && <span className="notif-badge" style={{ position: 'absolute', top: 8, right: 8 }}>{badge}</span>}
      </NavLink>
    );
  };

  const renderMobileLink = (tab) => {
    const Icon = tab.icon;
    const isActive = location.pathname === tab.path;
    const badge = tab.path === '/messages' ? unread.messages : tab.path === '/notifications' ? unread.notifications : 0;

    if (!user && !tab.public) {
      return (
        <button
          key={tab.path}
          onClick={() => handleProtectedNav(tab.path)}
          style={{ position: 'relative' }}
        >
          <Icon size={22} />
          <span>{tab.label}</span>
        </button>
      );
    }

    return (
      <NavLink
        key={tab.path}
        to={tab.path}
        className={isActive ? 'active' : ''}
        style={{ position: 'relative' }}
      >
        <Icon size={22} />
        <span>{tab.label}</span>
        {badge > 0 && <span className="notif-badge">{badge}</span>}
      </NavLink>
    );
  };

  return (
    <>
      {/* Sidebar - Desktop */}
      <nav className="sidebar-nav">
        <div className="sidebar-logo">
          <h1>Campus<span>Gig</span></h1>
          <p onClick={() => setShowSchoolPicker(true)}>
            {university} <ChevronDown size={12} />
          </p>
        </div>

        <div className="sidebar-links">
          {TABS.map(renderSidebarLink)}
        </div>

        {user ? (
          <button
            onClick={() => navigate('/post')}
            className="btn btn-primary sidebar-post-btn"
          >
            <Plus size={18} /> Post a Gig
          </button>
        ) : (
          <button
            onClick={() => requireLogin(() => navigate('/post'))}
            className="btn btn-primary sidebar-post-btn"
          >
            <LogIn size={18} /> Sign in to Post
          </button>
        )}

        {user && (
          <div className="sidebar-user">
            <NavLink to="/profile" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="avatar avatar-sm">
                {user.profilePhoto ? (
                  <img src={user.profilePhoto} alt="" />
                ) : (
                  user.displayName?.charAt(0)?.toUpperCase() || '?'
                )}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{user.displayName}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{user.email}</div>
              </div>
            </NavLink>
          </div>
        )}
      </nav>

      {/* School picker modal */}
      {showSchoolPicker && (
        <SchoolPickerModal
          university={university}
          onSelect={handleSchoolChange}
          onClose={() => setShowSchoolPicker(false)}
        />
      )}

      {/* Main content */}
      {children}

      {/* Bottom nav - Mobile */}
      <nav className="bottom-nav">
        {TABS.map(renderMobileLink)}
      </nav>
    </>
  );
}

function SchoolPickerModal({ university, onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const [customMode, setCustomMode] = useState(false);
  const [customSchool, setCustomSchool] = useState('');
  const searchRef = useRef(null);

  useEffect(() => {
    if (searchRef.current) searchRef.current.focus();
  }, []);

  const filtered = UNIVERSITIES.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.domain.toLowerCase().includes(search.toLowerCase())
  );

  const handleCustomSubmit = () => {
    if (customSchool.trim()) {
      onSelect(customSchool.trim());
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 300 }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <h2>Change School</h2>
          <button onClick={onClose} className="modal-close"><X size={20} /></button>
        </div>
        
        {!customMode ? (
          <>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Search size={16} style={{ 
                position: 'absolute', 
                left: 12, 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)',
              }} />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search universities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ 
                  width: '100%',
                  padding: '10px 12px 10px 38px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 14,
                }}
              />
            </div>
            <div style={{ maxHeight: 280, overflowY: 'auto', marginBottom: 12 }}>
              {filtered.slice(0, 50).map(uni => (
                <button
                  key={uni.domain}
                  onClick={() => onSelect(uni.name)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    textAlign: 'left',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: uni.name === university ? 'var(--accent-light)' : 'transparent',
                    color: uni.name === university ? 'var(--accent)' : 'var(--text-primary)',
                    fontWeight: uni.name === university ? 600 : 500,
                    fontSize: 14,
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 2,
                  }}
                >
                  <span>{uni.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{uni.domain}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-tertiary)' }}>
                  No universities found
                </div>
              )}
            </div>
            <button
              onClick={() => setCustomMode(true)}
              className="btn btn-secondary btn-full"
            >
              <Plus size={14} /> My school isn't listed
            </button>
          </>
        ) : (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              Enter your school name:
            </p>
            <input
              type="text"
              placeholder="e.g., Springfield University"
              value={customSchool}
              onChange={(e) => setCustomSchool(e.target.value)}
              autoFocus
              style={{ 
                width: '100%',
                padding: '10px 14px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 14,
                marginBottom: 12,
              }}
            />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setCustomMode(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                Back
              </button>
              <button onClick={handleCustomSubmit} className="btn btn-primary" style={{ flex: 1 }} disabled={!customSchool.trim()}>
                Use This School
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
